//
//  Profile.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {Text, View, StyleSheet, TouchableOpacity, Alert, TextInput}  from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
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
    const [editingUsername, setEditingUsername] = useState(false);
    const [newUsername, setNewUsername] = useState('');

    useEffect(() => {
        fetchUserStats();
    }, []);

    const fetchUserStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user profile data including username
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username')
                .eq('user_id', user.id)
                .single();

            // If profile doesn't exist, create one with default username
            if (profileError && profileError.code === 'PGRST116') {
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: user.id,
                        username: 'Anon',
                        bio: ''
                    })
                    .select('username')
                    .single();

                if (createError) {
                    console.error('Error creating profile:', createError);
                } else {
                    profile = newProfile;
                }
            } else if (profileError) {
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

    const handleEditProfile = async () => {
        if (!newUsername.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ username: newUsername.trim() })
                .eq('user_id', user.id);

            if (error) {
                Alert.alert('Error', 'Failed to update username');
                return;
            }

            // Update local state
            setUserStats(prev => ({
                ...prev,
                username: newUsername.trim()
            }));
            setEditingUsername(false);
            setNewUsername('');
            Alert.alert('Success', 'Username updated successfully!');
        } catch (error) {
            console.error('Error updating username:', error);
            Alert.alert('Error', 'Failed to update username');
        }
    };

    const handleLogout = async () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.auth.signOut();
                            if (error) throw error;
                            router.replace('/');
                        } catch (error) {
                            console.error('Error logging out:', error);
                            Alert.alert('Error', 'Failed to logout');
                        }
                    },
                },
            ]
        );
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
            <View style={styles.headerSection}>
                <Text style={styles.welcomeText}>
                    Welcome {userStats.username}!
                </Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity 
                        style={styles.editButton}
                        onPress={() => {
                            setNewUsername(userStats.username || '');
                            setEditingUsername(true);
                        }}
                    >
                        <Text style={styles.editButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.logoutButton}
                        onPress={handleLogout}
                    >
                        <Text style={styles.logoutButtonText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {editingUsername && (
                <View style={styles.editSection}>
                    <Text style={styles.editLabel}>New Username:</Text>
                    <Text>This username will appear on your comments and claims.</Text>
                    <TextInput
                        style={styles.usernameInput}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Enter new username"
                        autoFocus
                    />
                    <View style={styles.editButtons}>
                        <TouchableOpacity 
                            style={[styles.editButton, styles.cancelButton]}
                            onPress={() => {
                                setEditingUsername(false);
                                setNewUsername('');
                            }}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.editButton, styles.saveButton]}
                            onPress={handleEditProfile}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
    headerSection: {
        marginBottom: 20,
        alignItems: 'center',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
        textAlign: 'center',
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'center',
    },
    editButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    logoutButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    editSection: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    editLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#1a1a1a',
    },
    usernameInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        backgroundColor: 'white',
    },
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        flex: 1,
    },
    saveButton: {
        backgroundColor: '#28a745',
        flex: 1,
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
});
