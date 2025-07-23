import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Share,
    Platform
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import FlagContent from '@/components/FlagContent';

interface Claim {
    id: string;
    title: string;
    claim: string;
    category: string;
    created_at: string;
    up_votes: number;
    down_votes: number;
    comment_count: number;
    op_username?: string;
    forComments: number;
    againstComments: number;
    forPercentage: number;
    againstPercentage: number;
}

interface Comment {
    id: string;
    parent_comment_id: string | null;
    affirmative: boolean;
    replies: Comment[];
}

export default function CategoryClaims() {
    const { category } = useLocalSearchParams<{ category: string }>();
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (category) {
            fetchCategoryClaims();
        }
    }, [category]);

    // Recursive function to count all comments including nested replies with stance
    const countCommentsRecursively = (commentList: Comment[]): { total: number; forCount: number; againstCount: number } => {
        let totalCount = 0;
        let forCount = 0;
        let againstCount = 0;
        
        commentList.forEach(comment => {
            totalCount++; // Count this comment
            if (comment.affirmative) {
                forCount++;
            } else {
                againstCount++;
            }
            
            // Recursively count nested replies
            if (comment.replies && comment.replies.length > 0) {
                const nestedCounts = countCommentsRecursively(comment.replies);
                totalCount += nestedCounts.total;
                forCount += nestedCounts.forCount;
                againstCount += nestedCounts.againstCount;
            }
        });
        
        return { total: totalCount, forCount, againstCount };
    };

    // Function to get all comments for a claim with nested replies
    const getCommentsWithReplies = async (claimId: string): Promise<Comment[]> => {
        try {
            // Get all comments for this claim
            const { data: allComments, error: allCommentsError } = await supabase
                .from('comments')
                .select('*')
                .eq('claim_id', claimId)
                .order('created_at', { ascending: true });

            if (allCommentsError) {
                console.error('Error fetching comments for claim', claimId, ':', allCommentsError);
                return [];
            }

            // Check for orphaned comments (comments with parent_comment_id that don't exist)
            const validParentIds = new Set(allComments?.map(c => c.id) || []);
            const orphanedComments = allComments?.filter(comment => 
                comment.parent_comment_id && !validParentIds.has(comment.parent_comment_id)
            ) || [];
            
            let commentsData = allComments;
            
            if (orphanedComments.length > 0) {
                // Convert orphaned comments to top-level comments for display
                const fixedOrphanedComments = orphanedComments.map(comment => ({
                    ...comment,
                    parent_comment_id: null
                }));
                
                // Add orphaned comments to the comments list
                commentsData = [...(commentsData || []), ...fixedOrphanedComments];
            }

            // Get top-level comments (parent_comment_id is null)
            const topLevelComments = commentsData?.filter(comment => 
                comment.parent_comment_id === null
            ) || [];

            // If we have comments but no top-level comments, there might be a schema issue
            if (commentsData && commentsData.length > 0 && topLevelComments.length === 0) {
                // TEMPORARY FALLBACK: Show all comments as top-level if schema is broken
                return commentsData.map(comment => ({
                    ...comment,
                    parent_comment_id: null,
                    replies: []
                }));
            }

            // Build the nested structure
            const buildNestedComments = (parentId: string | null): Comment[] => {
                return commentsData
                    ?.filter(comment => comment.parent_comment_id === parentId)
                    .map(comment => ({
                        ...comment,
                        replies: buildNestedComments(comment.id)
                    })) || [];
            };

            return buildNestedComments(null);
        } catch (error) {
            console.error('Error in getCommentsWithReplies:', error);
            return [];
        }
    };

    const fetchCategoryClaims = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get claims for the specific category (case-insensitive) excluding blocked users
            const { data: categoryClaims, error: claimsError } = await supabase
                .rpc('get_claims_excluding_blocked', {
                    category_param: category
                });

            if (claimsError) {
                throw claimsError;
            }

            // Get usernames for claim creators
            const claimCreatorIds = categoryClaims?.map((claim: any) => claim.op_id).filter(Boolean) || [];
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, username')
                .in('user_id', claimCreatorIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
            }

            // Create a map of user_id to username
            const usernameMap = profiles?.reduce((acc: any, profile: any) => {
                acc[profile.user_id] = profile.username;
                return acc;
            }, {}) || {};

            // Get comment counts and stance statistics for each claim
            const claimsWithStats = await Promise.all(
                categoryClaims?.map(async (claim: any) => {
                    const commentsWithReplies = await getCommentsWithReplies(claim.id);
                    const commentStats = countCommentsRecursively(commentsWithReplies);
                    
                    return {
                        ...claim,
                        comment_count: commentStats.total,
                        forComments: commentStats.forCount,
                        againstComments: commentStats.againstCount,
                        forPercentage: commentStats.total > 0 ? Math.round((commentStats.forCount / commentStats.total) * 100) : 0,
                        againstPercentage: commentStats.total > 0 ? Math.round((commentStats.againstCount / commentStats.total) * 100) : 0,
                        op_username: usernameMap[claim.op_id] || 'Anonymous'
                    };
                }) || []
            );

            setClaims(claimsWithStats);
        } catch (err: any) {
            console.error('Error fetching category claims:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchCategoryClaims();
        setRefreshing(false);
    };

    const handleClaimPress = (claim: Claim) => {
        router.push({
            pathname: '/Speak-It/ClaimDetail' as any,
            params: { claimId: claim.id }
        });
    };

    const handleShare = async (claim: Claim) => {
        try {
            const deepLink = `https://speak-it-three.vercel.app/claim/${claim.id}`;
            const appStoreLink = Platform.OS === 'ios' 
                ? 'https://apps.apple.com/app/speakitmobile' // Replace with actual App Store link
                : 'https://play.google.com/store/apps/details?id=com.speakitmobile.app'; // Replace with actual Play Store link
            
            const shareMessage = `Check out this claim: "${claim.title || 'Untitled Claim'}"\n\n${claim.claim}\n\nCategory: ${claim.category}\nby ${claim.op_username || 'Anonymous'}\n\nOpen in SpeakIt: ${deepLink}\n\nDon't have the app? Download it here: ${appStoreLink}`;
            
            await Share.share({
                message: shareMessage,
                title: claim.title,
                url: deepLink,
            });
        } catch (error: any) {
            console.error('Error sharing claim:', error);
        }
    };

    const renderClaimItem = ({ item }: { item: Claim }) => (
        <TouchableOpacity
            style={styles.claimCard}
            onPress={() => {
                handleClaimPress(item);
                hapticFeedback.select();
            }}
        >
            <View style={styles.claimHeader}>
                <Text style={styles.claimTitle} numberOfLines={2}>
                    {item.title || 'Untitled Claim'}
                </Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={(e) => {
                            e.stopPropagation(); // Prevent triggering the card press
                            handleShare(item);
                            hapticFeedback.share();
                        }}
                    >
                        <Ionicons name="share-outline" size={16} color="#666" />
                    </TouchableOpacity>
                    <FlagContent
                        contentId={item.id}
                        contentType="claim"
                        contentText={item.title + " " + item.claim}
                    />
                    <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.claimText} numberOfLines={3}>
                {item.claim || 'No claim content'}
            </Text>

            <View style={styles.claimFooter}>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="chatbubble-outline" size={16} color="#666" />
                        <Text style={styles.statText}>{item.comment_count}</Text>
                    </View>
                    {item.comment_count > 0 && (
                        <View style={styles.stanceStats}>
                            <Text style={[styles.stanceText, styles.forText]}>
                                👍 {item.forPercentage}%
                            </Text>
                            <Text style={[styles.stanceText, styles.againstText]}>
                                👎 {item.againstPercentage}%
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.metaInfo}>
                    <Text style={styles.authorText}>by {item.op_username}</Text>
                    <Text style={styles.dateText}>
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading {category} claims...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Error loading claims: {error}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => {
                    fetchCategoryClaims();
                    hapticFeedback.modal();
                }}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => {
                        router.back();
                        hapticFeedback.navigate();
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{category}</Text>
                <View style={styles.placeholder} />
            </View>

            {claims.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="document-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyTitle}>No claims yet</Text>
                    <Text style={styles.emptyText}>
                        Be the first to start a discussion in {category}!
                    </Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={() => {
                            router.push('/Speak-It/CreateClaim');
                            hapticFeedback.select();
                        }}
                    >
                        <Text style={styles.createButtonText}>Create First Claim</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={claims}
                    renderItem={renderClaimItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#007AFF']}
                        />
                    }
                />
            )}
        </View>
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
        borderBottomColor: '#e0e0e0 ',
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
        padding: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    createButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    createButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    listContainer: {
        padding: 16,
    },
    claimCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
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
        marginBottom: 8,
    },
    claimTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1a1a1a',
        flex: 1,
        marginRight: 8,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareButton: {
        padding: 8,
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
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
    },
    claimFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    metaInfo: {
        alignItems: 'flex-end',
    },
    authorText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 2,
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    stanceStats: {
        flexDirection: 'row',
        gap: 8,
        marginLeft: 16,
    },
    stanceText: {
        fontSize: 14,
        fontWeight: '500',
    },
    forText: {
        color: '#28a745',
    },
    againstText: {
        color: '#dc3545',
    },
}); 