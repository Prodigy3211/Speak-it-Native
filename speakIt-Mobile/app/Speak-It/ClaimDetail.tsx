import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    Image,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    Modal
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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

    useEffect(() => {
        if (claimId) {
            fetchClaimAndComments();
        }
    }, [claimId]);

    const fetchClaimAndComments = async () => {
        try {
            setLoading(true);

            // Get claim details
            const { data: claimData, error: claimError } = await supabase
                .from('claims')
                .select('*')
                .eq('id', claimId)
                .single();

            if (claimError) throw claimError;

            // Get username for claim creator
            const { data: profile } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', claimData.op_id)
                .single();

            const claimWithUser = {
                ...claimData,
                op_username: profile?.username || 'Anonymous',
                user_vote: null // We'll implement claim voting differently
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
            const { data: commentsData, error: commentsError } = await supabase
                .from('comments')
                .select('*')
                .eq('claim_id', claimId)
                .is('parent_comment_id', null) // Only top-level comments
                .order('created_at', { ascending: false });

            if (commentsError) throw commentsError;

            // Get all votes for comments
            const { data: votes, error: votesError } = await supabase
                .from('votes')
                .select('comment_id, vote_type')
                .not('comment_id', 'is', null);

            if (votesError) {
                throw votesError;
            }

            // Calculate vote counts per comment
            const voteCounts = votes?.reduce((acc: any, vote: any) => {
                if (!acc[vote.comment_id]) {
                    acc[vote.comment_id] = { up_votes: 0, down_votes: 0 };
                }
                if (vote.vote_type === 'up') {
                    acc[vote.comment_id].up_votes += 1;
                } else if (vote.vote_type === 'down') {
                    acc[vote.comment_id].down_votes += 1;
                }
                return acc;
            }, {}) || {};

            // Get current user for vote checking
            const { data: { user } } = await supabase.auth.getUser();

            // Get usernames and images for comments
            const commentsWithDetails = await Promise.all(
                commentsData.map(async (comment) => {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('user_id', comment.user_id)
                        .single();

                    const { data: images } = await supabase
                        .from('images')
                        .select('*')
                        .eq('comment_id', comment.id);

                    // Get user's vote on this comment
                    let userVote = null;
                    if (user) {
                        const { data: voteData } = await supabase
                            .from('votes')
                            .select('vote_type')
                            .eq('comment_id', comment.id)
                            .eq('user_id', user.id)
                            .single();
                        userVote = voteData?.vote_type || null;
                    }

                    // Get replies
                    const { data: replies } = await supabase
                        .from('comments')
                        .select('*')
                        .eq('parent_comment_id', comment.id)
                        .order('created_at', { ascending: true });

                    const repliesWithDetails = await Promise.all(
                        (replies || []).map(async (reply) => {
                            const { data: replyProfile } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('user_id', reply.user_id)
                                .single();

                            const { data: replyImages } = await supabase
                                .from('images')
                                .select('*')
                                .eq('comment_id', reply.id);

                            // Get user's vote on this reply
                            let replyUserVote = null;
                            if (user) {
                                const { data: replyVoteData } = await supabase
                                    .from('votes')
                                    .select('vote_type')
                                    .eq('comment_id', reply.id)
                                    .eq('user_id', user.id)
                                    .single();
                                replyUserVote = replyVoteData?.vote_type || null;
                            }

                            return {
                                ...reply,
                                username: replyProfile?.username || 'Anonymous',
                                images: replyImages || [],
                                user_vote: replyUserVote,
                                up_votes: voteCounts[reply.id]?.up_votes || 0,
                                down_votes: voteCounts[reply.id]?.down_votes || 0,
                                replies: []
                            };
                        })
                    );

                    return {
                        ...comment,
                        username: profile?.username || 'Anonymous',
                        images: images || [],
                        user_vote: userVote,
                        up_votes: voteCounts[comment.id]?.up_votes || 0,
                        down_votes: voteCounts[comment.id]?.down_votes || 0,
                        replies: repliesWithDetails
                    };
                })
            );

            setComments(commentsWithDetails);
        } catch (error: any) {
            console.error('Error fetching comments:', error);
        }
    };

    const calculateCommentStats = () => {
        const forComments = comments.filter(comment => comment.affirmative).length;
        const againstComments = comments.filter(comment => !comment.affirmative).length;
        const totalComments = comments.length;
        
        return {
            forComments,
            againstComments,
            totalComments,
            forPercentage: totalComments > 0 ? Math.round((forComments / totalComments) * 100) : 0,
            againstPercentage: totalComments > 0 ? Math.round((againstComments / totalComments) * 100) : 0
        };
    };

    const handleVoteComment = async (commentId: string, voteType: 'up' | 'down') => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
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
                const { error } = await supabase
                    .from('votes')
                    .insert({
                        comment_id: commentId,
                        user_id: user.id,
                        vote_type: voteType
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
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImages([...selectedImages, result.assets[0].uri]);
        }
    };

    const uploadImages = async (commentId: string): Promise<string[]> => {
        const uploadedUrls: string[] = [];

        for (const imageUri of selectedImages) {
            try {
                const fileName = `comment-${commentId}-${Date.now()}.jpg`;
                const { data, error } = await supabase.storage
                    .from('comment-images')
                    .upload(fileName, {
                        uri: imageUri,
                        type: 'image/jpeg',
                        name: fileName,
                    } as any);

                if (error) throw error;

                const { data: urlData } = supabase.storage
                    .from('comment-images')
                    .getPublicUrl(fileName);

                uploadedUrls.push(urlData.publicUrl);

                // Save image record to database
                await supabase
                    .from('images')
                    .insert({
                        comment_id: commentId,
                        user_id: (await supabase.auth.getUser()).data.user?.id,
                        image_url: urlData.publicUrl,
                        file_name: fileName,
                        content_type: 'image/jpeg'
                    });

            } catch (error) {
                console.error('Error uploading image:', error);
            }
        }

        return uploadedUrls;
    };

    const submitComment = async () => {
        if (!newComment.trim() && selectedImages.length === 0) {
            Alert.alert('Error', 'Please enter a comment or add an image');
            return;
        }

        if (isAffirmative === null) {
            Alert.alert('Error', 'Please select whether you are for or against this claim');
            return;
        }

        try {
            setSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'You must be logged in to comment');
                return;
            }

            const { data: comment, error } = await supabase
                .from('comments')
                .insert({
                    claim_id: claimId,
                    user_id: user.id,
                    content: newComment.trim(),
                    affirmative: isAffirmative,
                    up_votes: 0,
                    down_votes: 0
                })
                .select()
                .single();

            if (error) throw error;

            // Upload images if any
            if (selectedImages.length > 0) {
                await uploadImages(comment.id);
            }

            setNewComment('');
            setSelectedImages([]);
            setIsAffirmative(null);
            setCommentModalVisible(false);
            await fetchComments();

        } catch (error: any) {
            console.error('Error submitting comment:', error);
            Alert.alert('Error', 'Failed to submit comment');
        } finally {
            setSubmitting(false);
        }
    };

    const submitReply = async (parentCommentId: string) => {
        if (!replyText.trim() && replyImages.length === 0) {
            Alert.alert('Error', 'Please enter a reply or add an image');
            return;
        }

        try {
            setSubmitting(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'You must be logged in to reply');
                return;
            }

            const { data: reply, error } = await supabase
                .from('comments')
                .insert({
                    claim_id: claimId,
                    user_id: user.id,
                    content: replyText.trim(),
                    parent_comment_id: parentCommentId,
                    affirmative: true, // Replies inherit the parent's stance
                    up_votes: 0,
                    down_votes: 0
                })
                .select()
                .single();

            if (error) throw error;

            // Upload images if any
            if (replyImages.length > 0) {
                await uploadImages(reply.id);
            }

            setReplyText('');
            setReplyImages([]);
            setReplyingTo(null);
            await fetchComments();

        } catch (error: any) {
            console.error('Error submitting reply:', error);
            Alert.alert('Error', 'Failed to submit reply');
        } finally {
            setSubmitting(false);
        }
    };

    const renderComment = ({ item }: { item: Comment }) => (
        <View style={[
            styles.commentCard,
            { backgroundColor: item.affirmative ? '#e3f2fd' : '#fff3e0' }
        ]}>
            <View style={styles.commentHeader}>
                <View style={styles.commentHeaderLeft}>
                    <Text style={styles.commentAuthor}>{item.username}</Text>
                    <View style={[
                        styles.stanceBadge,
                        { backgroundColor: item.affirmative ? '#28a745' : '#dc3545' }
                    ]}>
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
                    {item.images.map((image) => (
                        <Image
                            key={image.id}
                            source={{ uri: image.image_url }}
                            style={styles.commentImage}
                            resizeMode="cover"
                        />
                    ))}
                </View>
            )}

            <View style={styles.commentActions}>
                <View style={styles.voteButtons}>
                    <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => handleVoteComment(item.id, 'up')}
                    >
                        <Ionicons 
                            name="arrow-up" 
                            size={16} 
                            color={item.user_vote === 'up' ? '#28a745' : '#666'} 
                        />
                        <Text style={[styles.voteText, item.user_vote === 'up' && styles.votedText]}>
                            {item.up_votes || 0}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.voteButton}
                        onPress={() => handleVoteComment(item.id, 'down')}
                    >
                        <Ionicons 
                            name="arrow-down" 
                            size={16} 
                            color={item.user_vote === 'down' ? '#dc3545' : '#666'} 
                        />
                        <Text style={[styles.voteText, item.user_vote === 'down' && styles.votedText]}>
                            {item.down_votes || 0}
                        </Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={styles.replyButton}
                    onPress={() => setReplyingTo(item.id)}
                >
                    <Text style={styles.replyButtonText}>Reply</Text>
                </TouchableOpacity>
            </View>

            {replyingTo === item.id && (
                <View style={styles.replyInput}>
                    <View style={styles.replyInputContainer}>
                        <TextInput
                            style={styles.replyTextInput}
                            value={replyText}
                            onChangeText={setReplyText}
                            placeholder="Write a reply..."
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={styles.replyImageButton}
                            onPress={async () => {
                                const result = await ImagePicker.launchImageLibraryAsync({
                                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                                    allowsEditing: true,
                                    aspect: [4, 3],
                                    quality: 0.8,
                                });
                                if (!result.canceled) {
                                    setReplyImages([...replyImages, result.assets[0].uri]);
                                }
                            }}
                        >
                            <Ionicons name="image" size={20} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {replyImages.length > 0 && (
                        <View style={styles.replySelectedImages}>
                            {replyImages.map((uri, index) => (
                                <View key={index} style={styles.replyImagePreview}>
                                    <Image source={{ uri }} style={styles.replyPreviewImage} />
                                    <TouchableOpacity
                                        style={styles.replyRemoveImage}
                                        onPress={() => setReplyImages(replyImages.filter((_, i) => i !== index))}
                                    >
                                        <Ionicons name="close-circle" size={16} color="#dc3545" />
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
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.submitReplyButton, (!replyText.trim() && replyImages.length === 0) && styles.disabledButton]}
                            onPress={() => submitReply(item.id)}
                            disabled={(!replyText.trim() && replyImages.length === 0) || submitting}
                        >
                            <Text style={styles.submitReplyButtonText}>Reply</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Render replies */}
            {item.replies.length > 0 && (
                <View style={styles.repliesContainer}>
                    {item.replies.map((reply) => (
                                                    <View key={reply.id} style={[
                                styles.replyCard,
                                { backgroundColor: reply.affirmative ? '#e8f4fd' : '#fff8e1' }
                            ]}>
                                <View style={styles.replyHeader}>
                                    <View style={styles.replyHeaderLeft}>
                                        <Text style={styles.replyAuthor}>{reply.username}</Text>
                                        <View style={[
                                            styles.stanceBadge,
                                            { backgroundColor: reply.affirmative ? '#28a745' : '#dc3545' }
                                        ]}>
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
                                            <Image
                                                key={image.id}
                                                source={{ uri: image.image_url }}
                                                style={styles.replyImage}
                                                resizeMode="cover"
                                            />
                                        ))}
                                    </View>
                                )}
                                
                                <View style={styles.replyActions}>
                                    <TouchableOpacity
                                        style={styles.voteButton}
                                        onPress={() => handleVoteComment(reply.id, 'up')}
                                    >
                                        <Ionicons name="arrow-up" size={14} color="#666" />
                                        <Text style={styles.voteText}>{reply.up_votes || 0}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.voteButton}
                                        onPress={() => handleVoteComment(reply.id, 'down')}
                                    >
                                        <Ionicons name="arrow-down" size={14} color="#666" />
                                        <Text style={styles.voteText}>{reply.down_votes || 0}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                    ))}
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
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
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Claim</Text>
                <View style={styles.placeholder} />
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
                                        <Text style={styles.statPercentage}>({stats.forPercentage}%)</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>👎 Against</Text>
                                        <Text style={styles.statValue}>{stats.againstComments}</Text>
                                        <Text style={styles.statPercentage}>({stats.againstPercentage}%)</Text>
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
                <TouchableOpacity
                    style={styles.addCommentButton}
                    onPress={() => setCommentModalVisible(true)}
                >
                    <Ionicons name="chatbubble-outline" size={20} color="white" />
                    <Text style={styles.addCommentButtonText}>Add Comment</Text>
                </TouchableOpacity>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                    <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
                    
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
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setCommentModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    style={styles.modalContainer} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => {
                                setCommentModalVisible(false);
                                setNewComment('');
                                setSelectedImages([]);
                                setIsAffirmative(null);
                            }}
                        >
                            <Ionicons name="close" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Add Comment</Text>
                        <View style={styles.placeholder} />
                    </View>

                    <ScrollView style={styles.modalContent}>
                        {/* Affirmative Selection */}
                        <View style={styles.affirmativeContainer}>
                            <Text style={styles.affirmativeLabel}>Your stance:</Text>
                            <View style={styles.affirmativeButtons}>
                                <TouchableOpacity
                                    style={[
                                        styles.affirmativeButton,
                                        isAffirmative === true && styles.affirmativeButtonSelected
                                    ]}
                                    onPress={() => setIsAffirmative(true)}
                                >
                                    <Text style={[
                                        styles.affirmativeButtonText,
                                        isAffirmative === true && styles.affirmativeButtonTextSelected
                                    ]}>
                                        👍 For
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.affirmativeButton,
                                        isAffirmative === false && styles.affirmativeButtonSelected
                                    ]}
                                    onPress={() => setIsAffirmative(false)}
                                >
                                    <Text style={[
                                        styles.affirmativeButtonText,
                                        isAffirmative === false && styles.affirmativeButtonTextSelected
                                    ]}>
                                        👎 Against
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.textInput}
                                value={newComment}
                                onChangeText={setNewComment}
                                placeholder="Add a comment..."
                                multiline
                                maxLength={500}
                            />
                            <TouchableOpacity
                                style={styles.imageButton}
                                onPress={pickImage}
                            >
                                <Ionicons name="image" size={24} color="#007AFF" />
                            </TouchableOpacity>
                        </View>

                        {selectedImages.length > 0 && (
                            <View style={styles.selectedImages}>
                                {selectedImages.map((uri, index) => (
                                    <View key={index} style={styles.imagePreview}>
                                        <Image source={{ uri }} style={styles.previewImage} />
                                        <TouchableOpacity
                                            style={styles.removeImage}
                                            onPress={() => setSelectedImages(selectedImages.filter((_, i) => i !== index))}
                                        >
                                            <Ionicons name="close-circle" size={20} color="#dc3545" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.submitButton, 
                                ((!newComment.trim() && selectedImages.length === 0) || isAffirmative === null) && styles.disabledButton
                            ]}
                            onPress={submitComment}
                            disabled={(!newComment.trim() && selectedImages.length === 0) || isAffirmative === null || submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.submitButtonText}>Post Comment</Text>
                            )}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
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
    replyButton: {
        padding: 4,
    },
    replyButtonText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    replyInput: {
        marginTop: 8,
        padding: 8,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    replyTextInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 8,
        fontSize: 14,
        minHeight: 40,
        marginBottom: 8,
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
    addCommentButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    addCommentButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    modalContainer: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    closeButton: {
        padding: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        flex: 1,
        textAlign: 'center',
    },
    modalContent: {
        flex: 1,
        padding: 16,
    },
    replyInputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 8,
        marginBottom: 8,
    },
    replyImageButton: {
        padding: 6,
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
}); 