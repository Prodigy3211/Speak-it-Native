//
//  Profile.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {Text, View, StyleSheet, TouchableOpacity, Alert, TextInput, Modal, ScrollView}  from "react-native";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import Statistics from "@/components/profile/Statistics";
import { hapticFeedback } from "@/lib/haptics";
import { validateUserContent } from "@/lib/contentModeration";
import AdminFlagDashboard from "@/components/AdminFlagDashboard";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import { Ionicons } from '@expo/vector-icons';

interface UserStats {
    claims_made: number;
    comments_made: number;
    up_votes_received: number;
    down_votes_received: number;
    username?: string;
    is_admin?: boolean;
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
    const [adminDashboardVisible, setAdminDashboardVisible] = useState(false);
    const [deleteAccountVisible, setDeleteAccountVisible] = useState(false);

    useEffect(() => {
        fetchUserStats();
    }, []);

    const fetchUserStats = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user profile data including username and admin status
            let { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('username, is_admin')
                .eq('user_id', user.id)
                .single();

            // If profile doesn't exist, create one with default username
            if (profileError && profileError.code === 'PGRST116') {
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        user_id: user.id,
                        username: 'Anon',
                        bio: '',
                        is_admin: false
                    })
                    .select('username, is_admin')
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
                username: profile?.username || 'User',
                is_admin: profile?.is_admin || false
            });
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditProfile = async () => {
        // Content validation (no blocking, only warnings)
        const usernameValidation = validateUserContent(newUsername, 'username');
        if (!usernameValidation.isValid) {
            Alert.alert('Validation Error', usernameValidation.errorMessage || 'Please review your username');
            return;
        }

        if (!newUsername.trim()) {
            Alert.alert('Error', 'Username cannot be empty');
            return;
        }

        // Check for content warnings
        if (usernameValidation.warning) {
            Alert.alert(
                'Content Warning',
                usernameValidation.warning + '\n\nYou can still use this username, but it may be flagged by the community.',
                [
                    {
                        text: 'Use Anyway',
                        onPress: () => updateUsername()
                    },
                    {
                        text: 'Edit Username',
                        style: 'cancel'
                    }
                ]
            );
            return;
        }

        // Update username
        updateUsername();
    };
    
    const updateUsername = async () => {
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
                        hapticFeedback.modal();

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

    const handleAccountDeleted = async () => {
        try {
            // Check if user is still authenticated
            const { data: { user } } = await supabase.auth.getUser();
            
            if (user) {
                // If user still exists, log them out
                await supabase.auth.signOut();
            }
            
            router.replace('/');
        } catch (error) {
            console.error('Error handling account deletion:', error);
            router.replace('/');
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
            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
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
                                hapticFeedback.select();
                            }}
                        >
                            <Text style={styles.editButtonText}>Edit Profile</Text>
                        </TouchableOpacity>
                        {userStats.is_admin && (
                            <TouchableOpacity 
                                style={styles.adminButton}
                                onPress={() => {
                                    setAdminDashboardVisible(true);
                                    hapticFeedback.select();
                                }}
                            >
                                <Text style={styles.adminButtonText}>Admin</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={styles.logoutButton}
                            onPress={() => {
                                handleLogout();
                                hapticFeedback.modal();
                            }}
                        >
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {editingUsername && (
                    <View style={styles.editSection}>
                        <Text style={styles.editLabel}>Make A Name For Yourself:</Text>
                        <Text>This username will appear on your comments and claims.</Text>
                        <TextInput
                            style={styles.usernameInput}
                            value={newUsername}
                            onChangeText={setNewUsername}
                            placeholder="Enter new username"
                            autoFocus
                            onPressIn={() => hapticFeedback.select()}
                        />
                        <View style={styles.editButtons}>
                            <TouchableOpacity 
                                style={[styles.editButton, styles.cancelButton]}
                                onPress={() => {
                                    setEditingUsername(false);
                                    setNewUsername('');
                                    hapticFeedback.select();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.editButton, styles.saveButton]}
                                onPress={() => {
                                    handleEditProfile();
                                    hapticFeedback.submit();
                                }}
                                onPressIn={() => hapticFeedback.submit()}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                <Statistics userStats={userStats} />
                
                {/* Danger Zone */}
                <View style={styles.dangerZone}>
                    <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
                    <TouchableOpacity 
                        style={styles.deleteAccountButton}
                        onPress={() => {
                            setDeleteAccountVisible(true);
                            hapticFeedback.modal();
                        }}
                    >
                        <Ionicons name="trash-outline" size={20} color="white" />
                        <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
            
            {/* Admin Dashboard */}
            <AdminFlagDashboard
                visible={adminDashboardVisible}
                onClose={() => setAdminDashboardVisible(false)}
            />
            
            {/* Delete Account Modal */}
            <DeleteAccountModal
                visible={deleteAccountVisible}
                onClose={() => setDeleteAccountVisible(false)}
                onAccountDeleted={handleAccountDeleted}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
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
    adminButton: {
        backgroundColor: '#FF6B35',
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
    adminButtonText: {
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
    dangerZone: {
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
    dangerZoneTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#dc3545',
        marginBottom: 12,
    },
    deleteAccountButton: {
        backgroundColor: '#dc3545',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 8,
    },
    deleteAccountButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
