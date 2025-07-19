import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback, haptics } from '@/lib/haptics';
import { blockUser, unblockUser, isUserBlocked } from '@/lib/blockingService';

interface BlockUserProps {
    userId: string;
    username: string;
    size?: 'small' | 'medium' | 'large';
    showText?: boolean;
    onBlockChange?: (isBlocked: boolean) => void;
}

export default function BlockUser({ 
    userId, 
    username, 
    size = 'medium', 
    showText = false,
    onBlockChange 
}: BlockUserProps) {
    const [blocked, setBlocked] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        checkBlockStatus();
    }, [userId]);

    const checkBlockStatus = async () => {
        try {
            const isBlockedStatus = await isUserBlocked(userId);
            setBlocked(isBlockedStatus);
        } catch (error) {
            console.error('Error checking block status:', error);
            setBlocked(false);
        }
    };

    const handleBlockUser = async () => {
        setLoading(true);
        try {
            const result = await blockUser(userId);
            
            if (result.success) {
                setBlocked(true);
                setModalVisible(false);
                haptics.success();
                onBlockChange?.(true);
                Alert.alert(
                    'User Blocked',
                    `You have blocked ${username}. You will no longer see their comments or claims.`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to block user');
            }
        } catch (error) {
            console.error('Error blocking user:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleUnblockUser = async () => {
        setLoading(true);
        try {
            const result = await unblockUser(userId);
            
            if (result.success) {
                setBlocked(false);
                haptics.success();
                onBlockChange?.(false);
                Alert.alert(
                    'User Unblocked',
                    `You have unblocked ${username}. You will now see their comments and claims again.`,
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to unblock user');
            }
        } catch (error) {
            console.error('Error unblocking user:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const showBlockConfirmation = () => {
        hapticFeedback.modal();
        setModalVisible(true);
    };

    const showUnblockConfirmation = () => {
        hapticFeedback.modal();
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${username}? You will see their comments and claims again.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Unblock', 
                    style: 'destructive',
                    onPress: handleUnblockUser
                }
            ]
        );
    };

    const getIconSize = () => {
        switch (size) {
            case 'small': return 14;
            case 'large': return 20;
            default: return 16;
        }
    };

    const getButtonStyle = () => {
        switch (size) {
            case 'small': return styles.smallButton;
            case 'large': return styles.largeButton;
            default: return styles.mediumButton;
        }
    };

    const getTextStyle = () => {
        switch (size) {
            case 'small': return styles.smallText;
            case 'large': return styles.largeText;
            default: return styles.mediumText;
        }
    };

    if (blocked === null) {
        return (
            <TouchableOpacity style={[getButtonStyle(), styles.loadingButton]}>
                <ActivityIndicator size="small" color="#666" />
            </TouchableOpacity>
        );
    }

    return (
        <>
            <TouchableOpacity
                style={[
                    getButtonStyle(),
                    blocked ? styles.blockedButton : styles.unblockedButton
                ]}
                onPress={blocked ? showUnblockConfirmation : showBlockConfirmation}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator size="small" color={blocked ? "#dc3545" : "#666"} />
                ) : (
                    <>
                        <Ionicons 
                            name={blocked ? "ban" : "ban-outline"} 
                            size={getIconSize()} 
                            color={blocked ? "#dc3545" : "#666"} 
                        />
                        {showText && (
                            <Text style={[getTextStyle(), blocked ? styles.blockedText : styles.unblockedText]}>
                                {blocked ? 'Blocked' : 'Block'}
                            </Text>
                        )}
                    </>
                )}
            </TouchableOpacity>

            {/* Block Confirmation Modal */}
            <Modal
                visible={modalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Ionicons name="warning" size={24} color="#dc3545" />
                            <Text style={styles.modalTitle}>Block User</Text>
                        </View>
                        
                        <Text style={styles.modalText}>
                            Are you sure you want to block <Text style={styles.usernameText}>{username}</Text>?
                        </Text>
                        
                        <Text style={styles.modalSubtext}>
                            You will no longer see their comments, replies, or claims. This action can be undone later.
                        </Text>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    hapticFeedback.select();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.blockButton}
                                onPress={handleBlockUser}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.blockButtonText}>Block User</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    // Button sizes
    smallButton: {
        padding: 4,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    mediumButton: {
        padding: 6,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    largeButton: {
        padding: 8,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    
    // Button states
    unblockedButton: {
        backgroundColor: 'transparent',
    },
    blockedButton: {
        backgroundColor: '#fff5f5',
        borderWidth: 1,
        borderColor: '#fed7d7',
    },
    loadingButton: {
        backgroundColor: 'transparent',
    },
    
    // Text sizes
    smallText: {
        fontSize: 10,
        fontWeight: '500',
    },
    mediumText: {
        fontSize: 12,
        fontWeight: '500',
    },
    largeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    
    // Text colors
    unblockedText: {
        color: '#666',
    },
    blockedText: {
        color: '#dc3545',
    },
    
    // Modal styles
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
        padding: 24,
        width: '100%',
        maxWidth: 320,
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
        justifyContent: 'center',
        marginBottom: 16,
        gap: 8,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    modalText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    modalSubtext: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    usernameText: {
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    blockButton: {
        flex: 1,
        backgroundColor: '#dc3545',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    blockButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'white',
    },
}); 