import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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

    const fetchCategoryClaims = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get claims for the specific category (case-insensitive)
            const { data: categoryClaims, error: claimsError } = await supabase
                .from('claims')
                .select('*')
                .ilike('category', category)
                .order('created_at', { ascending: false });

            if (claimsError) {
                throw claimsError;
            }

            // Get comment counts for these claims
            const { data: comments, error: commentsError } = await supabase
                .from('comments')
                .select('claim_id');

            if (commentsError) {
                throw commentsError;
            }

            // Count comments per claim
            const commentCounts = comments?.reduce((acc: any, comment: any) => {
                acc[comment.claim_id] = (acc[comment.claim_id] || 0) + 1;
                return acc;
            }, {}) || {};

            // Get usernames for claim creators
            const claimCreatorIds = categoryClaims?.map(claim => claim.op_id).filter(Boolean) || [];
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

            // Combine the data
            const claimsWithCounts = categoryClaims?.map(claim => ({
                ...claim,
                comment_count: commentCounts[claim.id] || 0,
                op_username: usernameMap[claim.op_id] || 'Anonymous'
            })) || [];

            setClaims(claimsWithCounts);
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

    const renderClaimItem = ({ item }: { item: Claim }) => (
        <TouchableOpacity
            style={styles.claimCard}
            onPress={() => handleClaimPress(item)}
        >
            <View style={styles.claimHeader}>
                <Text style={styles.claimTitle} numberOfLines={2}>
                    {item.title || 'Untitled Claim'}
                </Text>
                <View style={styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category}</Text>
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
                    <View style={styles.statItem}>
                        <Ionicons name="arrow-up" size={16} color="#28a745" />
                        <Text style={[styles.statText, styles.upvoteText]}>{item.up_votes || 0}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="arrow-down" size={16} color="#dc3545" />
                        <Text style={[styles.statText, styles.downvoteText]}>{item.down_votes || 0}</Text>
                    </View>
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
                <TouchableOpacity style={styles.retryButton} onPress={fetchCategoryClaims}>
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
                    onPress={() => router.back()}
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
                        onPress={() => router.push('/Speak-It/CreateClaim')}
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
    upvoteText: {
        color: '#28a745',
    },
    downvoteText: {
        color: '#dc3545',
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
}); 