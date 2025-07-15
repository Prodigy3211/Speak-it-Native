//
//  Profile.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {Text, View, StyleSheet}  from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Statistics from "@/components/profile/Statistics";

interface UserStats {
    claims_made: number;
    comments_made: number;
    up_votes_received: number;
    down_votes_received: number;
    username?: string;
}

export default function Profile (){
    const [userStats, setUserStats] = useState<UserStats>({
        claims_made: 0,
        comments_made: 0,
        up_votes_received: 0,
        down_votes_received: 0,
        username: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUserStats();
    }, []);

    const fetchUserStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user profile data including username
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', user.id)
                .single();

            if (profileError) {
                console.error('Error fetching profile:', profileError);
            }

            // Get claims count
            const { count: claimsCount } = await supabase
                .from('claims')
                .select('*', { count: 'exact', head: true })
                .eq('op_id', user.id);

            // Get comments count
            const { count: commentsCount } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id);

            // Get votes received on user's comments
            const { data: userComments } = await supabase
                .from('comments')
                .select('id')
                .eq('user_id', user.id);

            let upVotesReceived = 0;
            let downVotesReceived = 0;

            if (userComments && userComments.length > 0) {
                const commentIds = userComments.map(c => c.id);
                const { data: votes } = await supabase
                    .from('votes')
                    .select('vote_type')
                    .in('comment_id', commentIds);

                if (votes) {
                    upVotesReceived = votes.filter(v => v.vote_type === 'up').length;
                    downVotesReceived = votes.filter(v => v.vote_type === 'down').length;
                }
            }

            setUserStats({
                claims_made: claimsCount || 0,
                comments_made: commentsCount || 0,
                up_votes_received: upVotesReceived,
                down_votes_received: downVotesReceived,
                username: profile?.username || 'User'
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading profile...</Text>
            </View>
        );
    }

    return(
        <View style={styles.container}>
            <Text style={styles.welcomeText}>
                Welcome {userStats.username}!
            </Text>
            <Statistics userStats={userStats} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f8f9fa',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
        color: '#1a1a1a',
    },
});
