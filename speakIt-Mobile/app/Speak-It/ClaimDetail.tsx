import BlockUser from '@/components/BlockUser';
import FlagContent from '@/components/FlagContent';
import { validateUserContent } from '@/lib/contentModeration';
import { generateSmartLink } from '@/lib/deepLinks';
import { hapticFeedback } from '@/lib/haptics';
import {
  sendCommentClientNotification,
  sendReplyClientNotification,
} from '@/lib/notificationHelpers';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Try } from 'expo-router/build/views/Try';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  up_votes: number;
  down_votes: number;
  parent_comment_id: string | null;
  user_id: string;
  username: string;
  affirmative: boolean;
  images: CommentImage[];
  replies: Comment[];
  user_vote?: 'up' | 'down' | null;
}

interface CommentImage {
  id: string;
  image_url: string;
  file_name: string;
}

interface Claim {
  id: string;
  title: string;
  claim: string;
  category: string;
  rules: string;
  created_at: string;
  up_votes: number;
  down_votes: number;
  op_id: string;
  op_username: string;
  user_vote?: 'up' | 'down' | null;
}

export default function ClaimDetail() {
  const { claimId } = useLocalSearchParams<{ claimId: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [isAffirmative, setIsAffirmative] = useState<boolean | null>(null);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    if (claimId) {
      fetchClaimAndComments();
    }
  }, [claimId]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (claimId) {
        fetchComments();
      }
    }, [claimId])
  );

  const fetchClaimAndComments = async () => {
    try {
      setLoading(true);

      // Check authentication first
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error('Authentication error:', authError);
        // Handle authentication error gracefully
        Alert.alert(
          'Authentication Error',
          'Please log in again to view this content.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/'),
            },
          ]
        );
        return;
      }

      if (!user) {
        Alert.alert('Login Required', 'Please log in to view this content.', [
          {
            text: 'OK',
            onPress: () => router.push('/'),
          },
        ]);
        return;
      }

      // Get claim details
      const { data: claimData, error: claimError } = await supabase
        .from('claims')
        .select('*')
        .eq('id', claimId)
        .single();

      if (claimError) {
        console.error('Error fetching claim:', claimError);
        Alert.alert('Error', 'Failed to load claim');
        return;
      }

      // Get username for claim creator
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', claimData.op_id)
        .single();

      const claimWithUser = {
        ...claimData,
        op_username: profile?.username || 'Anonymous',
        user_vote: null, // We'll implement claim voting differently
      };

      setClaim(claimWithUser);

      // Get comments
      await fetchComments();
    } catch (error: any) {
      console.error('Error fetching claim:', error);
      Alert.alert('Error', 'Failed to load claim');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      //Get user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      //Get All Comments
      const { data: allComments, error: allCommentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

      if (allCommentsError) {
        throw allCommentsError;
      }
      //Get User Ids
      const userIds = [...new Set(allComments?.map((c) => c.user_id) || [])];

      //Get All Profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error Fetching profiles: ', profilesError);
      }

      //Get All Images
      const commentIds = allComments?.map((c) => c.id) || [];
      const { data: allImages, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .in('comment_id', commentIds);

      if (imagesError) {
        console.error('Error Fetching images: ', imagesError);
      }

      // Get all votes for comments
      const { data: allVotes, error: votesError } = await supabase
        .from('votes')
        .select('comment_id, vote_type, user_id')
        .in('comment_id', commentIds);

      if (votesError) {
        throw votesError;
      }

      //Proccess the data
      const processedComments = processCommentsData(
        allComments || [],
        allProfiles || [],
        allImages || [],
        allVotes || [],
        user.id
      );

      setComments(processedComments);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    }
  };

  //helper function to process all of that data
  const processCommentsData = (
    allComments: any[],
    allProfiles: any[],
    allImages: any[],
    allVotes: any[],
    currentUserId: string
  ): Comment[] => {
    //Create Maps
    const profilesMap = allProfiles.reduce((acc, profile) => {
      acc[profile.user_id] = profile.username;
      return acc;
    }, {});
    const imagesMap = allImages.reduce((acc, image) => {
      if (!acc[image.comment_id]) acc[image.comment_id] = [];
      acc[image.comment_id].push(image);
      return acc;
    }, {});

    const votesMap = allVotes.reduce((acc, vote) => {
      if (!acc[vote.comment_id])
        acc[vote.comment_id] = { up_votes: 0, down_votes: 0, userVotes: {} };
      if (vote.vote_type === 'up') acc[vote.comment_id].up_votes++;
      if (vote.vote_type === 'down') acc[vote.comment_id].down_votes++;
      acc[vote.comment_id].userVotes[vote.user_id] = vote.vote_type;
      return acc;
    }, {});

    //nested structure
    const buildNestedComments = (parentId: string | null): Comment[] => {
      return allComments
        .filter((comment) => comment.parent_comment_id === parentId)
        .map((comment) => ({
          ...comment,
          username: profilesMap[comment.user_id] || 'Anonymous',
          images: imagesMap[comment.id] || [],
          user_vote: votesMap[comment.id]?.userVotes[currentUserId] || null,
          up_votes: votesMap[comment.id]?.up_votes || 0,
          down_votes: votesMap[comment.id]?.down_votes || 0,
          replies: buildNestedComments(comment.id),
        }));
    };
    return buildNestedComments(null);
  };

  const calculateCommentStats = () => {
    // Count all comments including nested replies recursively
    let totalComments = 0;
    let forComments = 0;
    let againstComments = 0;

    const countCommentsRecursively = (commentList: Comment[]) => {
      commentList.forEach((comment) => {
        totalComments++;
        if (comment.affirmative) {
          forComments++;
        } else {
          againstComments++;
        }

        // Recursively count nested replies
        if (comment.replies && comment.replies.length > 0) {
          countCommentsRecursively(comment.replies);
        }
      });
    };

    // Start counting from top-level comments
    countCommentsRecursively(comments);

    return {
      forComments,
      againstComments,
      totalComments,
      forPercentage:
        totalComments > 0 ? Math.round((forComments / totalComments) * 100) : 0,
      againstPercentage:
        totalComments > 0
          ? Math.round((againstComments / totalComments) * 100)
          : 0,
    };
  };

  const handleVoteComment = async (
    commentId: string,
    voteType: 'up' | 'down'
  ) => {
    hapticFeedback.vote();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to vote');
        return;
      }

      // Check if user already voted on this comment
      const { data: existingVote } = await supabase
        .from('votes')
        .select('*')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Remove vote if clicking the same button
          const { error } = await supabase
            .from('votes')
            .delete()
            .eq('id', existingVote.id);

          if (error) throw error;
        } else {
          // Update existing vote
          const { error } = await supabase
            .from('votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);

          if (error) throw error;
        }
      } else {
        // Create new vote
        const { error } = await supabase.from('votes').insert({
          comment_id: commentId,
          user_id: user.id,
          vote_type: voteType,
        });

        if (error) throw error;
      }

      // Refresh comments
      await fetchComments();
    } catch (error: any) {
      console.error('Error voting on comment:', error);
      Alert.alert('Error', 'Failed to vote');
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions first
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please grant permission to access your photo library'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];

        if (selectedAsset.uri) {
          setSelectedImages([...selectedImages, selectedAsset.uri]);
        } else {
          console.error('Selected asset has no URI');
          Alert.alert('Error', 'Selected image has no URI');
        }
      }
    } catch (error: any) {
      console.error('Error picking image:', error);
      Alert.alert(
        'Error',
        `Failed to pick image: ${error.message || 'Unknown error'}`
      );
    }
  };

  const uploadImages = async (
    commentId: string,
    imageSource: 'comment' | 'reply' | 'nested-reply'
  ): Promise<string[]> => {
    const images = imageSource === 'comment' ? selectedImages : replyImages;
    const prefix = imageSource === 'comment' ? 'comment' : 'reply';
    const uploadedUrls: string[] = [];

    // Check authentication first
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error during upload:', authError);
      Alert.alert('Error', 'Please log in again to upload images');
      return uploadedUrls;
    }

    for (const imageUri of images) {
      try {
        // Generate a unique filename with proper extension
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 15);
        const fileName = `${prefix}-${commentId}-${timestamp}-${randomId}.jpg`;

        // Get file info using expo-file-system
        const fileInfo = await FileSystem.getInfoAsync(imageUri);

        if (!fileInfo.exists) {
          throw new Error('Image file does not exist');
        }

        // Read the file as base64
        const base64Data = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Validate data
        if (!base64Data || base64Data.length === 0) {
          throw new Error('Image file is empty');
        }

        // FIXED: Convert base64 to Uint8Array for proper upload
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        // Upload to Supabase storage using Uint8Array
        const { data, error } = await supabase.storage
          .from('comment-images')
          .upload(fileName, byteArray, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (error) {
          console.error('Supabase upload error:', error);
          throw error;
        }

        // Get the public URL
        const { data: urlData } = supabase.storage
          .from('comment-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);

        // Save image record to database
        const { error: dbError } = await supabase.from('images').insert({
          comment_id: commentId,
          user_id: user.id,
          image_url: urlData.publicUrl,
          file_name: fileName,
          file_size: fileInfo.size || 0,
          content_type: 'image/jpeg',
        });

        if (dbError) {
          console.error('Database insert error:', dbError);
          throw dbError;
        }
      } catch (error: any) {
        console.error('Error uploading image:', error);
        Alert.alert(
          'Upload Error',
          `Failed to upload image: ${error.message || 'Unknown error'}`
        );
        // Continue with other images even if one fails
      }
    }

    return uploadedUrls;
  };

  const submitComment = async () => {
    hapticFeedback.submit();

    // Content validation (no blocking, only warnings)
    if (newComment.trim()) {
      const commentValidation = validateUserContent(newComment, 'comment');
      if (!commentValidation.isValid) {
        Alert.alert(
          'Validation Error',
          commentValidation.errorMessage || 'Please review your comment'
        );
        return;
      }

      // Check for content warnings
      if (commentValidation.warning) {
        Alert.alert(
          'Content Warning',
          commentValidation.warning +
            '\n\nYou can still submit your comment, but it may be flagged by the community.',
          [
            {
              text: 'Submit Anyway',
              onPress: () =>
                submitCommentToDatabase(newComment, selectedImages, 'comment'),
            },
            {
              text: 'Edit Comment',
              style: 'cancel',
            },
          ]
        );
        return;
      }
    }

    if (!newComment.trim() && selectedImages.length === 0) {
      Alert.alert('Error', 'Please enter a comment or add an image');
      return;
    }

    if (isAffirmative === null) {
      Alert.alert(
        'Error',
        'Please select whether you are for or against this claim'
      );
      return;
    }

    // Submit the comment
    submitCommentToDatabase(newComment, selectedImages, 'comment');
  };

  const submitCommentToDatabase = async (
    content: string,
    images: string[],
    imageSource: 'comment' | 'reply' | 'nested-reply',
    parentCommentId?: string
  ) => {
    try {
      setSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to comment');
        return;
      }

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          claim_id: claimId,
          user_id: user.id,
          content: content.trim(),
          parent_comment_id: parentCommentId,
          affirmative: isAffirmative,
          up_votes: 0,
          down_votes: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload images if any
      if (images.length > 0) {
        await uploadImages(comment.id, imageSource);
      }

      if (imageSource === 'comment') {
        setNewComment('');
        setSelectedImages([]);
        setCommentModalVisible(false);
      } else {
        setReplyText('');
        setReplyImages([]);
        setReplyingTo(null);
      }

      // Refresh comments immediately
      await fetchComments();

      // Different notification logic based on type
      try {
        if (imageSource === 'comment') {
          // Notify claim creator
          await sendCommentClientNotification(
            claimId || '',
            claim?.title || 'Untitled Claim',
            claim?.op_id || '',
            user?.email || 'Anonymous'
          );
        } else if (imageSource === 'reply' || imageSource === 'nested-reply') {
          // Notify parent comment owner
          const { data: parentComment } = await supabase
            .from('comments')
            .select('user_id')
            .eq('id', parentCommentId)
            .single();

          if (parentComment && parentComment.user_id !== user.id) {
            await sendReplyClientNotification(
              claimId,
              claim.title,
              parentCommentId,
              parentComment.user_id,
              user.email || 'Anonymous'
            );
          }
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't show error to user, notification failure shouldn't break comment submission
      }

      // Show success message
      Alert.alert(
        'Success',
        `${
          imageSource === 'comment' ? 'Comment' : 'Reply'
        } posted successfully!`
      );
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      Alert.alert('Error', 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View
      style={[
        styles.commentCard,
        { backgroundColor: item.affirmative ? '#e3f2fd' : '#fff3e0' },
      ]}
    >
      <View style={styles.commentHeader}>
        <View style={styles.commentHeaderLeft}>
          <Text style={styles.commentAuthor}>{item.username}</Text>
          <View
            style={[
              styles.stanceBadge,
              { backgroundColor: item.affirmative ? '#28a745' : '#dc3545' },
            ]}
          >
            <Text style={styles.stanceText}>
              {item.affirmative ? '👍 For' : '👎 Against'}
            </Text>
          </View>
        </View>
        <Text style={styles.commentDate}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.commentContent}>{item.content}</Text>

      {item.images.length > 0 && (
        <View style={styles.imageContainer}>
          {item.images.map((image) => {
            return (
              <TouchableOpacity
                key={image.id}
                onPress={() => {
                  setExpandedImage(image.image_url);
                  hapticFeedback.select();
                }}
              >
                <Image
                  source={{ uri: image.image_url }}
                  style={styles.commentImage}
                  resizeMode='cover'
                  onError={(error) => {
                    console.error('Image load error:', error.nativeEvent);
                  }}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.commentActions}>
        <View style={styles.voteButtons}>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => {
              handleVoteComment(item.id, 'up');
              hapticFeedback.vote();
            }}
          >
            <Ionicons
              name='arrow-up'
              size={16}
              color={item.user_vote === 'up' ? '#28a745' : '#666'}
            />
            <Text
              style={[
                styles.voteText,
                item.user_vote === 'up' && styles.votedText,
              ]}
            >
              {item.up_votes || 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.voteButton}
            onPress={() => {
              handleVoteComment(item.id, 'down');
              hapticFeedback.vote();
            }}
          >
            <Ionicons
              name='arrow-down'
              size={16}
              color={item.user_vote === 'down' ? '#dc3545' : '#666'}
            />
            <Text
              style={[
                styles.voteText,
                item.user_vote === 'down' && styles.votedText,
              ]}
            >
              {item.down_votes || 0}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.commentActionButtons}>
          <TouchableOpacity
            style={styles.replyButton}
            onPress={() => {
              setReplyingTo(item.id);
              hapticFeedback.select();
            }}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
          <FlagContent
            contentId={item.id}
            contentType='comment'
            contentText={item.content}
          />
          <BlockUser
            userId={item.user_id}
            username={item.username}
            size='small'
          />
        </View>
      </View>

      {replyingTo === item.id && (
        <View style={styles.replyInput}>
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyTextInput}
              value={replyText}
              onChangeText={setReplyText}
              placeholder='Write a reply...'
              placeholderTextColor='#999'
              multiline
              maxLength={500}
              textAlignVertical='top'
            />
            <TouchableOpacity
              style={styles.replyImageButton}
              onPress={async () => {
                try {
                  const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsEditing: true,
                    aspect: [4, 3],
                    quality: 0.8,
                  });

                  if (
                    !result.canceled &&
                    result.assets &&
                    result.assets.length > 0
                  ) {
                    const selectedAsset = result.assets[0];
                    if (selectedAsset.uri) {
                      setReplyImages([...replyImages, selectedAsset.uri]);
                      hapticFeedback.upload();
                    } else {
                      console.error('Selected reply asset has no URI');
                      Alert.alert('Error', 'Selected image has no URI');
                    }
                  }
                } catch (error: any) {
                  console.error('Error picking reply image:', error);
                  Alert.alert(
                    'Error',
                    `Failed to pick reply image: ${
                      error.message || 'Unknown error'
                    }`
                  );
                }
              }}
            >
              <Ionicons name='image' size={20} color='#007AFF' />
            </TouchableOpacity>
          </View>

          {replyImages.length > 0 && (
            <View style={styles.replySelectedImages}>
              {replyImages.map((uri, index) => (
                <View key={index} style={styles.replyImagePreview}>
                  <Image source={{ uri }} style={styles.replyPreviewImage} />
                  <TouchableOpacity
                    style={styles.replyRemoveImage}
                    onPress={() => {
                      setReplyImages(replyImages.filter((_, i) => i !== index));
                      hapticFeedback.select();
                    }}
                  >
                    <Ionicons name='close-circle' size={16} color='#dc3545' />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.replyActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setReplyingTo(null);
                setReplyText('');
                setReplyImages([]);
                hapticFeedback.select();
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitReplyButton,
                ((!replyText.trim() && replyImages.length === 0) ||
                  submitting) &&
                  styles.disabledButton,
              ]}
              onPress={() => {
                submitCommentToDatabase(
                  replyText,
                  replyImages,
                  'reply',
                  item.id
                );
                hapticFeedback.submit();
              }}
              disabled={
                (!replyText.trim() && replyImages.length === 0) || submitting
              }
            >
              {submitting ? (
                <ActivityIndicator color='white' size='small' />
              ) : (
                <Text style={styles.submitReplyButtonText}>Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Render replies */}
      {item.replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply) => (
            <View
              key={reply.id}
              style={[
                styles.replyCard,
                { backgroundColor: reply.affirmative ? '#e8f4fd' : '#fff8e1' },
              ]}
            >
              <View style={styles.replyHeader}>
                <View style={styles.replyHeaderLeft}>
                  <Text style={styles.replyAuthor}>{reply.username}</Text>
                  <View
                    style={[
                      styles.stanceBadge,
                      {
                        backgroundColor: reply.affirmative
                          ? '#28a745'
                          : '#dc3545',
                      },
                    ]}
                  >
                    <Text style={styles.stanceText}>
                      {reply.affirmative ? '👍 For' : '👎 Against'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.replyDate}>
                  {new Date(reply.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.replyContent}>{reply.content}</Text>

              {reply.images && reply.images.length > 0 && (
                <View style={styles.replyImageContainer}>
                  {reply.images.map((image) => (
                    <TouchableOpacity
                      key={image.id}
                      onPress={() => {
                        setExpandedImage(image.image_url);
                        hapticFeedback.select();
                      }}
                    >
                      <Image
                        source={{ uri: image.image_url }}
                        style={styles.replyImage}
                        resizeMode='cover'
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.replyActions}>
                <View style={styles.voteButtons}>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => {
                      handleVoteComment(reply.id, 'up');
                      hapticFeedback.vote();
                    }}
                  >
                    <Ionicons name='arrow-up' size={14} color='#666' />
                    <Text style={styles.voteText}>{reply.up_votes || 0}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.voteButton}
                    onPress={() => {
                      handleVoteComment(reply.id, 'down');
                      hapticFeedback.vote();
                    }}
                  >
                    <Ionicons name='arrow-down' size={14} color='#666' />
                    <Text style={styles.voteText}>{reply.down_votes || 0}</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.commentActionButtons}>
                  <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => {
                      setReplyingTo(reply.id);
                      hapticFeedback.select();
                    }}
                  >
                    <Text style={styles.replyButtonText}>Reply</Text>
                  </TouchableOpacity>
                  <FlagContent
                    contentId={reply.id}
                    contentType='comment'
                    contentText={reply.content}
                  />
                </View>
              </View>

              {/* Reply input for replies */}
              {replyingTo === reply.id && (
                <View style={styles.replyInput}>
                  {/* Affirmative Selection for Replies */}
                  <View style={styles.affirmativeContainer}>
                    <Text style={styles.affirmativeLabel}>Your stance:</Text>
                    <View style={styles.affirmativeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.affirmativeButton,
                          isAffirmative === true &&
                            styles.affirmativeButtonSelected,
                        ]}
                        onPress={() => {
                          setIsAffirmative(true);
                          hapticFeedback.select();
                        }}
                      >
                        <Text
                          style={[
                            styles.affirmativeButtonText,
                            isAffirmative === true &&
                              styles.affirmativeButtonTextSelected,
                          ]}
                        >
                          👍 For
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.affirmativeButton,
                          isAffirmative === false &&
                            styles.affirmativeButtonSelected,
                        ]}
                        onPress={() => {
                          setIsAffirmative(false);
                          hapticFeedback.select();
                        }}
                      >
                        <Text
                          style={[
                            styles.affirmativeButtonText,
                            isAffirmative === false &&
                              styles.affirmativeButtonTextSelected,
                          ]}
                        >
                          👎 Against
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.replyInputContainer}>
                    <TextInput
                      style={styles.replyTextInput}
                      value={replyText}
                      onChangeText={setReplyText}
                      placeholder='Write a reply...'
                      placeholderTextColor='#999'
                      multiline
                      maxLength={500}
                      textAlignVertical='top'
                    />
                    <TouchableOpacity
                      style={styles.replyImageButton}
                      onPress={async () => {
                        try {
                          const result =
                            await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ImagePicker.MediaTypeOptions.Images,
                              allowsEditing: true,
                              aspect: [4, 3],
                              quality: 0.8,
                            });

                          if (
                            !result.canceled &&
                            result.assets &&
                            result.assets.length > 0
                          ) {
                            const selectedAsset = result.assets[0];
                            if (selectedAsset.uri) {
                              setReplyImages([
                                ...replyImages,
                                selectedAsset.uri,
                              ]);
                              hapticFeedback.upload();
                            } else {
                              console.error(
                                'Selected nested reply asset has no URI'
                              );
                              Alert.alert('Error', 'Selected image has no URI');
                            }
                          }
                        } catch (error: any) {
                          console.error(
                            'Error picking nested reply image:',
                            error
                          );
                          Alert.alert(
                            'Error',
                            `Failed to pick nested reply image: ${
                              error.message || 'Unknown error'
                            }`
                          );
                        }
                      }}
                    >
                      <Ionicons name='image' size={20} color='#007AFF' />
                    </TouchableOpacity>
                  </View>

                  {replyImages.length > 0 && (
                    <View style={styles.replySelectedImages}>
                      {replyImages.map((uri, index) => (
                        <View key={index} style={styles.replyImagePreview}>
                          <Image
                            source={{ uri }}
                            style={styles.replyPreviewImage}
                          />
                          <TouchableOpacity
                            style={styles.replyRemoveImage}
                            onPress={() => {
                              setReplyImages(
                                replyImages.filter((_, i) => i !== index)
                              );
                              hapticFeedback.select();
                            }}
                          >
                            <Ionicons
                              name='close-circle'
                              size={16}
                              color='#dc3545'
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <View style={styles.replyActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setReplyingTo(null);
                        setReplyText('');
                        setReplyImages([]);
                        hapticFeedback.select();
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitReplyButton,
                        ((!replyText.trim() && replyImages.length === 0) ||
                          submitting) &&
                          styles.disabledButton,
                      ]}
                      onPress={() => {
                        submitCommentToDatabase(
                          replyText,
                          replyImages,
                          'reply',
                          item.id
                        );
                        hapticFeedback.submit();
                      }}
                      disabled={
                        (!replyText.trim() && replyImages.length === 0) ||
                        submitting
                      }
                    >
                      {submitting ? (
                        <ActivityIndicator color='white' size='small' />
                      ) : (
                        <Text style={styles.submitReplyButtonText}>Reply</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Render nested replies (replies to replies) */}
              {reply.replies && reply.replies.length > 0 && (
                <View style={styles.nestedRepliesContainer}>
                  {reply.replies.map((nestedReply) => (
                    <View
                      key={nestedReply.id}
                      style={[
                        styles.nestedReplyCard,
                        {
                          backgroundColor: nestedReply.affirmative
                            ? '#f0f8ff'
                            : '#fffaf0',
                        },
                      ]}
                    >
                      <View style={styles.nestedReplyHeader}>
                        <View style={styles.nestedReplyHeaderLeft}>
                          <Text style={styles.nestedReplyAuthor}>
                            {nestedReply.username}
                          </Text>
                          <View
                            style={[
                              styles.stanceBadge,
                              {
                                backgroundColor: nestedReply.affirmative
                                  ? '#28a745'
                                  : '#dc3545',
                              },
                            ]}
                          >
                            <Text style={styles.stanceText}>
                              {nestedReply.affirmative
                                ? '👍 For'
                                : '👎 Against'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.nestedReplyDate}>
                          {new Date(
                            nestedReply.created_at
                          ).toLocaleDateString()}
                        </Text>
                      </View>
                      <Text style={styles.nestedReplyContent}>
                        {nestedReply.content}
                      </Text>

                      {nestedReply.images && nestedReply.images.length > 0 && (
                        <View style={styles.nestedReplyImageContainer}>
                          {nestedReply.images.map((image) => (
                            <TouchableOpacity
                              key={image.id}
                              onPress={() => {
                                setExpandedImage(image.image_url);
                                hapticFeedback.select();
                              }}
                            >
                              <Image
                                source={{ uri: image.image_url }}
                                style={styles.nestedReplyImage}
                                resizeMode='cover'
                              />
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      <View style={styles.nestedReplyActions}>
                        <View style={styles.voteButtons}>
                          <TouchableOpacity
                            style={styles.voteButton}
                            onPress={() => {
                              handleVoteComment(nestedReply.id, 'up');
                              hapticFeedback.vote();
                            }}
                          >
                            <Ionicons name='arrow-up' size={12} color='#666' />
                            <Text style={styles.voteText}>
                              {nestedReply.up_votes || 0}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.voteButton}
                            onPress={() => {
                              handleVoteComment(nestedReply.id, 'down');
                              hapticFeedback.vote();
                            }}
                          >
                            <Ionicons
                              name='arrow-down'
                              size={12}
                              color='#666'
                            />
                            <Text style={styles.voteText}>
                              {nestedReply.down_votes || 0}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                          style={styles.replyButton}
                          onPress={() => {
                            setReplyingTo(nestedReply.id);
                            hapticFeedback.select();
                          }}
                        >
                          <Text style={styles.replyButtonText}>Reply</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Reply input for nested replies */}
                      {replyingTo === nestedReply.id && (
                        <View style={styles.replyInput}>
                          {/* Affirmative Selection for Nested Replies */}
                          <View style={styles.affirmativeContainer}>
                            <Text style={styles.affirmativeLabel}>
                              Your stance:
                            </Text>
                            <View style={styles.affirmativeButtons}>
                              <TouchableOpacity
                                style={[
                                  styles.affirmativeButton,
                                  isAffirmative === true &&
                                    styles.affirmativeButtonSelected,
                                ]}
                                onPress={() => {
                                  setIsAffirmative(true);
                                  hapticFeedback.select();
                                }}
                              >
                                <Text
                                  style={[
                                    styles.affirmativeButtonText,
                                    isAffirmative === true &&
                                      styles.affirmativeButtonTextSelected,
                                  ]}
                                >
                                  👍 For
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.affirmativeButton,
                                  isAffirmative === false &&
                                    styles.affirmativeButtonSelected,
                                ]}
                                onPress={() => {
                                  setIsAffirmative(false);
                                  hapticFeedback.select();
                                }}
                              >
                                <Text
                                  style={[
                                    styles.affirmativeButtonText,
                                    isAffirmative === false &&
                                      styles.affirmativeButtonTextSelected,
                                  ]}
                                >
                                  👎 Against
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          <View style={styles.replyInputContainer}>
                            <TextInput
                              style={styles.replyTextInput}
                              value={replyText}
                              onChangeText={setReplyText}
                              placeholder='Write a reply...'
                              placeholderTextColor='#999'
                              multiline
                              maxLength={500}
                              textAlignVertical='top'
                            />
                            <TouchableOpacity
                              style={styles.replyImageButton}
                              onPress={async () => {
                                try {
                                  const result =
                                    await ImagePicker.launchImageLibraryAsync({
                                      mediaTypes:
                                        ImagePicker.MediaTypeOptions.Images,
                                      allowsEditing: true,
                                      aspect: [4, 3],
                                      quality: 0.8,
                                    });

                                  if (
                                    !result.canceled &&
                                    result.assets &&
                                    result.assets.length > 0
                                  ) {
                                    const selectedAsset = result.assets[0];
                                    if (selectedAsset.uri) {
                                      setReplyImages([
                                        ...replyImages,
                                        selectedAsset.uri,
                                      ]);
                                      hapticFeedback.upload();
                                    } else {
                                      console.error(
                                        'Selected deep nested reply asset has no URI'
                                      );
                                      Alert.alert(
                                        'Error',
                                        'Selected image has no URI'
                                      );
                                    }
                                  }
                                } catch (error: any) {
                                  console.error(
                                    'Error picking deep nested reply image:',
                                    error
                                  );
                                  Alert.alert(
                                    'Error',
                                    `Failed to pick deep nested reply image: ${
                                      error.message || 'Unknown error'
                                    }`
                                  );
                                }
                              }}
                            >
                              <Ionicons
                                name='image'
                                size={20}
                                color='#007AFF'
                              />
                            </TouchableOpacity>
                          </View>

                          {replyImages.length > 0 && (
                            <View style={styles.replySelectedImages}>
                              {replyImages.map((uri, index) => (
                                <View
                                  key={index}
                                  style={styles.replyImagePreview}
                                >
                                  <Image
                                    source={{ uri }}
                                    style={styles.replyPreviewImage}
                                  />
                                  <TouchableOpacity
                                    style={styles.replyRemoveImage}
                                    onPress={() => {
                                      setReplyImages(
                                        replyImages.filter(
                                          (_, i) => i !== index
                                        )
                                      );
                                      hapticFeedback.select();
                                    }}
                                  >
                                    <Ionicons
                                      name='close-circle'
                                      size={16}
                                      color='#dc3545'
                                    />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          )}

                          <View style={styles.replyActions}>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => {
                                setReplyingTo(null);
                                setReplyText('');
                                setReplyImages([]);
                                hapticFeedback.select();
                              }}
                            >
                              <Text style={styles.cancelButtonText}>
                                Cancel
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.submitReplyButton,
                                ((!replyText.trim() &&
                                  replyImages.length === 0) ||
                                  isAffirmative === null ||
                                  submitting) &&
                                  styles.disabledButton,
                              ]}
                              onPress={() => {
                                submitCommentToDatabase(
                                  replyText,
                                  replyImages,
                                  'nested-reply',
                                  nestedReply.id
                                );
                                hapticFeedback.submit();
                              }}
                              disabled={
                                (!replyText.trim() &&
                                  replyImages.length === 0) ||
                                isAffirmative === null ||
                                submitting
                              }
                            >
                              {submitting ? (
                                <ActivityIndicator color='white' size='small' />
                              ) : (
                                <Text style={styles.submitReplyButtonText}>
                                  Reply
                                </Text>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#007AFF' />
        <Text style={styles.loadingText}>Loading claim...</Text>
      </View>
    );
  }

  if (!claim) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Claim not found</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            router.back();
            hapticFeedback.navigate();
          }}
        >
          <Ionicons name='arrow-back' size={24} color='#007AFF' />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim</Text>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={async () => {
            hapticFeedback.share();
            try {
              const deepLink = generateSmartLink('claim', {
                claimId: claim.id,
                category: claim.category,
              });
              const appStoreLink =
                Platform.OS === 'ios'
                  ? 'https://apps.apple.com/us/app/speak-it/id6748719689'
                  : 'https://play.google.com/store/apps/details?id=com.speakitmobile.app';

              const shareMessage = `Check out this claim: "${claim.title}"\n\n${
                claim.claim
              }\n\n${
                claim.rules ? `Discussion Rules: ${claim.rules}\n\n` : ''
              }Open in SpeakIt: ${deepLink}\n\nDon't have the app? Download it here: ${appStoreLink}`;

              await Share.share({
                message: shareMessage,
                title: claim.title,
                url: deepLink,
              });
            } catch (error: any) {
              console.error('Error sharing claim:', error);
              Alert.alert('Error', 'Failed to share claim');
            }
          }}
        >
          <Ionicons name='share-outline' size={24} color='#007AFF' />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Claim Card */}
        <View style={styles.claimCard}>
          <View style={styles.claimHeader}>
            <Text style={styles.claimTitle}>{claim.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{claim.category}</Text>
            </View>
          </View>

          <Text style={styles.claimText}>{claim.claim}</Text>

          {claim.rules && (
            <View style={styles.rulesContainer}>
              <Text style={styles.rulesTitle}>Discussion Rules:</Text>
              <Text style={styles.rulesText}>{claim.rules}</Text>
            </View>
          )}

          <View style={styles.claimFooter}>
            <View style={styles.claimStats}>
              <Text style={styles.authorText}>by {claim.op_username}</Text>
              <Text style={styles.dateText}>
                {new Date(claim.created_at).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.claimActions}>
              <FlagContent
                contentId={claim.id}
                contentType='claim'
                contentText={claim.title + ' ' + claim.claim}
              />
              <BlockUser
                userId={claim.op_id}
                username={claim.op_username}
                size='small'
              />
            </View>
          </View>
        </View>

        {/* Comment Statistics */}
        <View style={styles.statsSection}>
          {(() => {
            const stats = calculateCommentStats();
            return (
              <View style={styles.statsContainer}>
                <Text style={styles.statsTitle}>Community Response</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>👍 For</Text>
                    <Text style={styles.statValue}>{stats.forComments}</Text>
                    <Text style={styles.statPercentage}>
                      ({stats.forPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>👎 Against</Text>
                    <Text style={styles.statValue}>
                      {stats.againstComments}
                    </Text>
                    <Text style={styles.statPercentage}>
                      ({stats.againstPercentage}%)
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total</Text>
                    <Text style={styles.statValue}>{stats.totalComments}</Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* Add Comment Button */}
        <View style={styles.commentButtonsContainer}>
          <TouchableOpacity
            style={styles.addCommentButton}
            onPress={() => {
              setCommentModalVisible(true);
              hapticFeedback.select();
            }}
          >
            <Ionicons name='chatbubble-outline' size={20} color='white' />
            <Text style={styles.addCommentButtonText}>Add Comment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={() => {
              fetchComments();
              hapticFeedback.select();
            }}
          >
            <Ionicons name='refresh' size={20} color='#007AFF' />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.debugButton}
            onPress={async () => {
              try {
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: false,
                  quality: 1.0,
                });
                if (
                  !result.canceled &&
                  result.assets &&
                  result.assets.length > 0
                ) {
                  const asset = result.assets[0];

                  // Test file system approach
                  const fileInfo = await FileSystem.getInfoAsync(asset.uri);

                  if (fileInfo.exists) {
                    const base64Data = await FileSystem.readAsStringAsync(
                      asset.uri,
                      {
                        encoding: FileSystem.EncodingType.Base64,
                      }
                    );

                    // Convert to blob
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                      byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: 'image/jpeg' });
                  }
                }
              } catch (error: any) {
                console.error('DEBUG Image picker error:', error);
              }
            }}
          >
            <Ionicons name='bug' size={20} color='#FF6B35' />
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <Text style={styles.commentsTitle}>
            Comments ({calculateCommentStats().totalComments})
          </Text>

          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </ScrollView>

      {/* Comment Modal */}
      <Modal
        visible={commentModalVisible}
        animationType='fade'
        transparent={true}
        onRequestClose={() => setCommentModalVisible(false)}
        onShow={() => hapticFeedback.modal()}
        onDismiss={() => hapticFeedback.modal()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Comment</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setCommentModalVisible(false);
                  setNewComment('');
                  setSelectedImages([]);
                  setIsAffirmative(null);
                  hapticFeedback.select();
                }}
              >
                <Ionicons name='close' size={24} color='#666' />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Affirmative Selection */}
              <View style={styles.affirmativeContainer}>
                <Text style={styles.affirmativeLabel}>Your stance:</Text>
                <View style={styles.affirmativeButtons}>
                  <TouchableOpacity
                    style={[
                      styles.affirmativeButton,
                      isAffirmative === true &&
                        styles.affirmativeButtonSelected,
                    ]}
                    onPress={() => {
                      setIsAffirmative(true);
                      hapticFeedback.select();
                    }}
                    onLongPress={() => hapticFeedback.longPress()}
                  >
                    <Text
                      style={[
                        styles.affirmativeButtonText,
                        isAffirmative === true &&
                          styles.affirmativeButtonTextSelected,
                      ]}
                    >
                      👍 For
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.affirmativeButton,
                      isAffirmative === false &&
                        styles.affirmativeButtonSelected,
                    ]}
                    onPress={() => {
                      setIsAffirmative(false);
                      hapticFeedback.select();
                    }}
                  >
                    <Text
                      style={[
                        styles.affirmativeButtonText,
                        isAffirmative === false &&
                          styles.affirmativeButtonTextSelected,
                      ]}
                    >
                      👎 Against
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalTextInput}
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder='Add a comment...'
                  placeholderTextColor='#999'
                  multiline
                  maxLength={500}
                  textAlignVertical='top'
                />
                <TouchableOpacity
                  style={styles.modalImageButton}
                  onPress={() => {
                    pickImage();
                    hapticFeedback.upload();
                  }}
                >
                  <Ionicons name='image' size={24} color='#007AFF' />
                </TouchableOpacity>
              </View>

              {selectedImages.length > 0 && (
                <View style={styles.selectedImages}>
                  {selectedImages.map((uri, index) => (
                    <View key={index} style={styles.imagePreview}>
                      <Image source={{ uri }} style={styles.previewImage} />
                      <TouchableOpacity
                        style={styles.removeImage}
                        onPress={() => {
                          setSelectedImages(
                            selectedImages.filter((_, i) => i !== index)
                          );
                          hapticFeedback.select();
                        }}
                      >
                        <Ionicons
                          name='close-circle'
                          size={20}
                          color='#dc3545'
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.modalSubmitButton,
                  ((!newComment.trim() && selectedImages.length === 0) ||
                    isAffirmative === null ||
                    submitting) &&
                    styles.disabledButton,
                ]}
                onPress={() => {
                  submitComment();
                  hapticFeedback.submit();
                }}
                disabled={
                  (!newComment.trim() && selectedImages.length === 0) ||
                  isAffirmative === null ||
                  submitting
                }
              >
                {submitting ? (
                  <ActivityIndicator color='white' />
                ) : (
                  <Text style={styles.modalSubmitButtonText}>Post Comment</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Expanded Image Modal */}
      {expandedImage && (
        <Modal
          visible={expandedImage !== null}
          animationType='fade'
          transparent={true}
          onRequestClose={() => {
            setExpandedImage(null);
            hapticFeedback.select();
          }}
          onShow={() => hapticFeedback.modal()}
          onDismiss={() => hapticFeedback.modal()}
        >
          <View style={styles.expandedImageOverlay}>
            <TouchableOpacity
              style={styles.expandedImageContainer}
              activeOpacity={1}
              onPress={() => {
                setExpandedImage(null);
                hapticFeedback.select();
              }}
            >
              <TouchableOpacity
                style={styles.expandedImageCloseButton}
                onPress={() => {
                  setExpandedImage(null);
                  hapticFeedback.select();
                }}
              >
                <Ionicons name='close-circle' size={32} color='white' />
              </TouchableOpacity>
              <Image
                source={{ uri: expandedImage }}
                style={styles.expandedImage}
                resizeMode='contain'
              />
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  claimCard: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  claimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  claimTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  claimText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  rulesContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  rulesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  rulesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  claimFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  claimStats: {
    flex: 1,
  },
  claimActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  voteButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  voteText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  votedText: {
    fontWeight: 'bold',
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  commentCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  commentDate: {
    fontSize: 12,
    color: '#999',
  },
  commentContent: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  commentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  commentActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentActionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyButton: {
    padding: 4,
  },
  replyButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  replyInput: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  replyTextInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyImageButton: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
  },
  submitReplyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitReplyButtonText: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
  },
  repliesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  replyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  replyDate: {
    fontSize: 10,
    color: '#999',
  },
  replyContent: {
    fontSize: 12,
    color: '#333',
    lineHeight: 16,
    marginBottom: 4,
  },
  commentInput: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
  },
  imageButton: {
    padding: 8,
  },
  selectedImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imagePreview: {
    position: 'relative',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    top: -5,
    right: -5,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  affirmativeContainer: {
    marginBottom: 12,
  },
  affirmativeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  affirmativeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  affirmativeButton: {
    flex: 1,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  affirmativeButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  affirmativeButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  affirmativeButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  commentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stanceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stanceText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  replyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsSection: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsContainer: {
    alignItems: 'center',
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statPercentage: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  commentButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  addCommentButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    gap: 8,
  },
  refreshButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#FF6B35',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCommentButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'center',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 16,
  },
  modalTextInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalImageButton: {
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalSubmitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  replySelectedImages: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  replyImagePreview: {
    position: 'relative',
  },
  replyPreviewImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
  },
  replyRemoveImage: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  replyImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  replyImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  nestedRepliesContainer: {
    marginTop: 8,
    marginLeft: 16,
  },
  nestedReplyCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  nestedReplyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  nestedReplyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  nestedReplyAuthor: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  nestedReplyDate: {
    fontSize: 9,
    color: '#999',
  },
  nestedReplyContent: {
    fontSize: 11,
    color: '#333',
    lineHeight: 14,
    marginBottom: 4,
  },
  nestedReplyImageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 4,
  },
  nestedReplyImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  nestedReplyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  shareButton: {
    padding: 8,
  },
  expandedImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandedImageCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 4,
  },
  expandedImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
