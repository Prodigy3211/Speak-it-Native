import { useEffect, useState } from "react";
import {View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator} from 'react-native';
import { supabase } from "@/lib/supabase";
import { router } from 'expo-router';

interface Claim {
    id: string;
    title: string;
    claim: string;
    category: string;
    up_votes: number;
    down_votes: number;
    created_at: string;
    comment_count: number;
}

export default function Trending(){
    const[trendingClaims, setTrendingClaims] = useState<Claim[]>([]);
    const[loading, setLoading] = useState(true);
    const[error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTrendingClaims();
    }, []);

    const fetchTrendingClaims = async () => {
        try{
            setLoading(true);
            setError(null);
        
        // Get all claims first
        const { data: claims, error: claimsError } = await supabase
            .from('claims')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20); // Get more claims to filter from

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

        // Combine and sort by comment count
        const claimsWithCounts = claims?.map(claim => ({
            ...claim,
            comment_count: commentCounts[claim.id] || 0
        })).sort((a, b) => b.comment_count - a.comment_count)
        .slice(0, 5) || [];

        setTrendingClaims(claimsWithCounts);
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
            onPress={() => handleClaimPress(item)}
        >
            <View style={styles.claimHeader}>
                <Text style={styles.claimTitle} numberOfLines={2}>
                    {item.title || 'Untitled Claim'}
                </Text>
                <View style = {styles.categoryBadge}>
                    <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                </View>
            </View>

            <Text style={styles.claimText} numberOfLines={3}>
                {item.claim || 'No claim content'}
            </Text>

            <View style={styles.claimFooter}>
                <View style={styles.statsContainer}>
                    <Text style = {styles.statText}>💬 {item.comment_count}</Text>
{/* Add in For and Against count */}
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
            <TouchableOpacity style={styles.retryButton} onPress={fetchTrendingClaims}>
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
})
