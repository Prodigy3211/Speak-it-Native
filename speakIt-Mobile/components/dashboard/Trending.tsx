import { useEffect, useState } from "react";
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Share, Platform} from 'react-native';
import { supabase } from "@/lib/supabase";
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';

interface Claim {
    id: string;
    title: string;
    claim: string;
    category: string;
    up_votes: number;
    down_votes: number;
    created_at: string;
    comment_count: number;
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

export default function Trending(){
    const[trendingClaims, setTrendingClaims] = useState<Claim[]>([]);
    const[loading, setLoading] = useState(true);
    const[error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTrendingClaims();
    }, []);

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
            // Get all comments for this claim (excluding blocked users)
            const { data: allComments, error: allCommentsError } = await supabase
                .rpc('get_comments_excluding_blocked', {
                    claim_id_param: claimId
                });

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

    const fetchTrendingClaims = async () => {
        try{
            setLoading(true);
            setError(null);
        
            // Get all claims first (excluding blocked users)
            const { data: claims, error: claimsError } = await supabase
                .rpc('get_claims_excluding_blocked', {
                    category_param: null
                });

            if (claimsError) {
                throw claimsError;
            }

            // Get comment counts for each claim using the same logic as ClaimDetail
            const claimsWithCounts = await Promise.all(
                claims?.map(async (claim) => {
                    const commentsWithReplies = await getCommentsWithReplies(claim.id);
                    const commentStats = countCommentsRecursively(commentsWithReplies);
                    
                    return {
                        ...claim,
                        comment_count: commentStats.total,
                        forComments: commentStats.forCount,
                        againstComments: commentStats.againstCount,
                        forPercentage: commentStats.total > 0 ? Math.round((commentStats.forCount / commentStats.total) * 100) : 0,
                        againstPercentage: commentStats.total > 0 ? Math.round((commentStats.againstCount / commentStats.total) * 100) : 0
                    };
                }) || []
            );

            // Sort by comment count and take top 5
            const sortedClaims = claimsWithCounts
                .sort((a, b) => b.comment_count - a.comment_count)
                .slice(0, 5);

            setTrendingClaims(sortedClaims);
        } catch (err:any){
            console.error('Error fetching trending claims:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleClaimPress = (claim: Claim) => {
        router.push({
            pathname: '/Speak-It/ClaimDetail' as any,
            params: { claimId: claim.id }
        });
    };
    
    const renderClaimItem = ({ item }: {item: Claim}) => (
        <TouchableOpacity 
            style={styles.claimCard}
            onPress={() => {
                handleClaimPress(item);
                hapticFeedback.navigate();
            }}
        >
            <View style={styles.claimHeader}>
                <Text style={styles.claimTitle} numberOfLines={2}>
                    {item.title || 'Untitled Claim'}
                </Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={async (e) => {
                            e.stopPropagation();
                            hapticFeedback.share();
                            try {
                                const deepLink = `https://speak-it-three.vercel.app/claim/${item.id}`;
                                const appStoreLink = Platform.OS === 'ios' 
                                    ? 'https://apps.apple.com/app/speakitmobile' // Replace with actual App Store link
                                    : 'https://play.google.com/store/apps/details?id=com.speakitmobile.app'; // Replace with actual Play Store link
                                
                                const shareMessage = `Check out this trending claim: "${item.title}"\n\n${item.claim}\n\nOpen in SpeakIt: ${deepLink}\n\nDon't have the app? Download it here: ${appStoreLink}`;
                                
                                await Share.share({
                                    message: shareMessage,
                                    title: item.title,
                                    url: deepLink,
                                });
                            } catch (error: any) {
                                console.error('Error sharing claim:', error);
                            }
                        }}
                    >
                        <Ionicons name="share-outline" size={16} color="#666" />
                    </TouchableOpacity>
                    <View style = {styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                    </View>
                </View>
            </View>

            <Text style={styles.claimText} numberOfLines={3}>
                {item.claim || 'No claim content'}
            </Text>

            <View style={styles.claimFooter}>
                <View style={styles.statsContainer}>
                    <Text style = {styles.statText}>💬 {item.comment_count}</Text>
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
                <Text style={styles.dateText}>
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </Text>
            </View>
        </TouchableOpacity>
    );
    if (loading) {
        return(
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style= {styles.loadingText}>Loading Trending Claims...</Text>
            </View>
        );
}

if (error) {
    return(
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading trending claims: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => {
                fetchTrendingClaims();
                hapticFeedback.modal();
            }}>
                <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
        </View>
    )
}

return(
<View style={styles.container}>
    <Text style={styles.sectionTitle}> 🔥The Hottest Takes</Text>
    <Text style={styles.sectionSubtitle}>
        Click a Hot Take below, see all categories or create your own thread to join the discussion!
    </Text>
    <FlatList
    data={trendingClaims}
    renderItem={renderClaimItem}
    keyExtractor={(item) => item.id}
    showsVerticalScrollIndicator={false}
    contentContainerStyle={styles.listContainer}
    />
</View>
);

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginHorizontal: 16,
        marginVertical: 12,
        color: '#1a1a1a',
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#666',
        marginHorizontal: 16,
        marginBottom: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    listContainer: {
        paddingHorizontal:16,
        paddingBottom:20,
    },
    claimCard: {
        backgroundColor:'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
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
        fontSize: 18,
        fontWeight:'600',
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
        gap: 12,
    },
    statText:{
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 12,
        color: '#999',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    stanceStats: {
        flexDirection: 'row',
        gap: 8,
    },
    stanceText: {
        fontSize: 12,
        fontWeight: '500',
    },
    forText: {
        color: '#4CAF50', // Green for "For"
    },
    againstText: {
        color: '#F44336', // Red for "Against"
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    shareButton: {
        padding: 8,
    },
})
