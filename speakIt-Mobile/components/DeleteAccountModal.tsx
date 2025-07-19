import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator,
    ScrollView,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { deleteUserAccount, getUserContentSummary } from '@/lib/accountService';

interface DeleteAccountModalProps {
    visible: boolean;
    onClose: () => void;
    onAccountDeleted: () => void;
}

export default function DeleteAccountModal({ visible, onClose, onAccountDeleted }: DeleteAccountModalProps) {
    const [password, setPassword] = useState('');
    const [contentSummary, setContentSummary] = useState<{
        claimsCount: number;
        commentsCount: number;
        flagsCount: number;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingSummary, setLoadingSummary] = useState(false);

    useEffect(() => {
        if (visible) {
            loadContentSummary();
        }
    }, [visible]);

    const loadContentSummary = async () => {
        setLoadingSummary(true);
        try {
            const summary = await getUserContentSummary();
            setContentSummary(summary);
        } catch (error) {
            console.error('Error loading content summary:', error);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password to confirm account deletion');
            return;
        }

        setLoading(true);
        try {
            const result = await deleteUserAccount(password);

            if (result.success) {
                if (result.requiresAdmin) {
                    Alert.alert(
                        'Data Deleted',
                        'Your data has been successfully deleted from the app. However, complete account removal may require admin assistance. You can still use the app normally.',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    onAccountDeleted();
                                    onClose();
                                }
                            }
                        ]
                    );
                } else {
                    Alert.alert(
                        'Account Deleted',
                        'Your account and all associated data have been permanently deleted.',
                        [
                            {
                                text: 'OK',
                                onPress: () => {
                                    onAccountDeleted();
                                    onClose();
                                }
                            }
                        ]
                    );
                }
            } else {
                Alert.alert('Error', result.error || 'Failed to delete account');
            }
        } catch (error) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const showFinalConfirmation = () => {
        if (!password.trim()) {
            Alert.alert('Error', 'Please enter your password to confirm account deletion');
            return;
        }

        Alert.alert(
            '⚠️ Final Warning',
            'This action cannot be undone. Your account and all your data will be permanently deleted. Are you absolutely sure?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: handleDeleteAccount
                }
            ]
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={onClose}
                    >
                        <Ionicons name="arrow-back" size={24} color="#007AFF" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Delete Account</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.warningContainer}>
                        <Ionicons name="warning" size={48} color="#dc3545" />
                        <Text style={styles.warningTitle}>⚠️ Account Deletion</Text>
                        <Text style={styles.warningText}>
                            This action will permanently delete your account and all associated data. This cannot be undone.
                        </Text>
                    </View>

                    {loadingSummary ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#007AFF" />
                            <Text style={styles.loadingText}>Loading your data...</Text>
                        </View>
                    ) : contentSummary && (
                        <View style={styles.contentSummary}>
                            <Text style={styles.summaryTitle}>Your Data That Will Be Deleted:</Text>
                            <View style={styles.summaryItem}>
                                <Ionicons name="document-outline" size={20} color="#666" />
                                <Text style={styles.summaryText}>{contentSummary.claimsCount} Claims</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Ionicons name="chatbubble-outline" size={20} color="#666" />
                                <Text style={styles.summaryText}>{contentSummary.commentsCount} Comments</Text>
                            </View>
                            <View style={styles.summaryItem}>
                                <Ionicons name="flag-outline" size={20} color="#666" />
                                <Text style={styles.summaryText}>{contentSummary.flagsCount} Flags</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.passwordContainer}>
                        <Text style={styles.passwordLabel}>Enter your password to confirm:</Text>
                        <TextInput
                            style={styles.passwordInput}
                            value={password}
                            onChangeText={setPassword}
                            placeholder="Your password"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.deleteButton,
                                (!password.trim() || loading) && styles.deleteButtonDisabled
                            ]}
                            onPress={showFinalConfirmation}
                            disabled={!password.trim() || loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.deleteButtonText}>Delete Account</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1a1a1a',
        flex: 1,
        textAlign: 'center',
    },
    headerSpacer: {
        width: 80,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    warningContainer: {
        backgroundColor: '#fff3cd',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#ffeaa7',
    },
    warningTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#856404',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 16,
        color: '#856404',
        textAlign: 'center',
        lineHeight: 22,
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
    },
    contentSummary: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    summaryText: {
        fontSize: 14,
        color: '#666',
    },
    passwordContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    passwordLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    passwordInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: 'white',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    cancelButton: {
        flex: 1,
        backgroundColor: '#6c757d',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    deleteButton: {
        flex: 1,
        backgroundColor: '#dc3545',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteButtonDisabled: {
        backgroundColor: '#ccc',
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
}); 