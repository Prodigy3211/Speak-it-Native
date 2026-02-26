import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    TextInput,
    ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { 
    getAllFlags, 
    updateFlagStatus, 
    getFlaggingAnalytics,
    FlaggedContent 
} from '@/lib/flaggingService';

interface AdminFlagDashboardProps {
    visible: boolean;
    onClose: () => void;
}

export default function AdminFlagDashboard({ visible, onClose }: AdminFlagDashboardProps) {
    const [flags, setFlags] = useState<FlaggedContent[]>([]);
    const [analytics, setAnalytics] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFlag, setSelectedFlag] = useState<FlaggedContent | null>(null);
    const [reviewModalVisible, setReviewModalVisible] = useState(false);
    const [reviewNotes, setReviewNotes] = useState('');
    const [actionTaken, setActionTaken] = useState('');

    useEffect(() => {
        if (visible) {
            loadData();
        }
    }, [visible]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [flagsData, analyticsData] = await Promise.all([
                getAllFlags(),
                getFlaggingAnalytics()
            ]);
            
            setFlags(flagsData);
            setAnalytics(analyticsData);
        } catch (error) {
            console.error('Error loading admin data:', error);
            Alert.alert('Error', 'Failed to load flagged content data');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleReviewFlag = (flag: FlaggedContent) => {
        setSelectedFlag(flag);
        setReviewNotes('');
        setActionTaken('');
        setReviewModalVisible(true);
        hapticFeedback.select();
    };

    const handleUpdateStatus = async (status: 'resolved' | 'dismissed') => {
        if (!selectedFlag) return;

        try {
            const result = await updateFlagStatus(
                selectedFlag.id,
                status,
                reviewNotes,
                actionTaken
            );

            if (result.success) {
                Alert.alert(
                    'Success',
                    `Flag marked as ${status}`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setReviewModalVisible(false);
                                setSelectedFlag(null);
                                loadData(); // Refresh the list
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to update flag status');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to update flag status');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#ff9500';
            case 'reviewed': return '#007AFF';
            case 'resolved': return '#34c759';
            case 'dismissed': return '#8e8e93';
            default: return '#8e8e93';
        }
    };

    const getReasonLabel = (reason: string) => {
        const reasonMap: Record<string, string> = {
            'inappropriate': 'Inappropriate Content',
            'hate_speech': 'Hate Speech',
            'harassment': 'Harassment',
            'spam': 'Spam',
            'misinformation': 'Misinformation',
            'other': 'Other'
        };
        return reasonMap[reason] || reason;
    };

    const renderFlagItem = ({ item }: { item: FlaggedContent }) => (
        <View style={styles.flagCard}>
            <View style={styles.flagHeader}>
                <View style={styles.flagInfo}>
                    <Text style={styles.flagType}>
                        {item.content_type.toUpperCase()}
                    </Text>
                    <View style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusColor(item.status) }
                    ]}>
                        <Text style={styles.statusText}>
                            {item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>
                <Text style={styles.flagDate}>
                    {new Date(item.created_at).toLocaleDateString()}
                </Text>
            </View>

            <Text style={styles.reasonText}>
                Reason: {getReasonLabel(item.flag_reason)}
            </Text>

            <Text style={styles.contentPreview} numberOfLines={3}>
                &ldquo;{item.content_text}&rdquo;
            </Text>

            {item.flag_description && (
                <Text style={styles.descriptionText}>
                    Description: {item.flag_description}
                </Text>
            )}

            {item.status === 'pending' && (
                <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => handleReviewFlag(item)}
                >
                    <Text style={styles.reviewButtonText}>Review Flag</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderAnalytics = () => {
        if (!analytics) return null;

        return (
            <View style={styles.analyticsContainer}>
                <Text style={styles.analyticsTitle}>Flagging Analytics</Text>
                <View style={styles.analyticsGrid}>
                    <View style={styles.analyticsItem}>
                        <Text style={styles.analyticsValue}>{analytics.totalFlags}</Text>
                        <Text style={styles.analyticsLabel}>Total Flags</Text>
                    </View>
                    <View style={styles.analyticsItem}>
                        <Text style={styles.analyticsValue}>{analytics.pendingFlags}</Text>
                        <Text style={styles.analyticsLabel}>Pending</Text>
                    </View>
                    <View style={styles.analyticsItem}>
                        <Text style={styles.analyticsValue}>{analytics.resolvedFlags}</Text>
                        <Text style={styles.analyticsLabel}>Resolved</Text>
                    </View>
                    <View style={styles.analyticsItem}>
                        <Text style={styles.analyticsValue}>{analytics.dismissedFlags}</Text>
                        <Text style={styles.analyticsLabel}>Dismissed</Text>
                    </View>
                </View>
            </View>
        );
    };

        if (loading) {
        return (
            <Modal visible={visible} animationType="slide">
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <TouchableOpacity 
                            style={styles.backButton}
                            onPress={onClose}
                        >
                            <Ionicons name="arrow-back" size={24} color="#007AFF" />
                            <Text style={styles.backButtonText}>Back</Text>
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Admin Dashboard</Text>
                        <View style={styles.headerSpacer} />
                    </View>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <Text style={styles.loadingText}>Loading flagged content...</Text>
                    </View>
                </SafeAreaView>
            </Modal>
        );
    }

    return (
        
        <Modal visible={visible} animationType="slide">
            <SafeAreaView>
                <View style={styles.header}>
                    <TouchableOpacity 
                        style={styles.backButton}
                        onPress={onClose}
                    >
                        <Ionicons name="arrow-back" size={24} color="#007AFF" />
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Admin Dashboard</Text>
                    <View style={styles.headerSpacer} />
                </View>

                <FlatList
                    data={flags}
                    renderItem={renderFlagItem}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#007AFF']}
                        />
                    }
                    ListHeaderComponent={renderAnalytics}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="flag-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyTitle}>No flagged content</Text>
                            <Text style={styles.emptyText}>
                                All content is clean and respectful!
                            </Text>
                        </View>
                    }
                    contentContainerStyle={styles.listContainer}
                />

                {/* Review Modal */}
                <Modal
                    visible={reviewModalVisible}
                    animationType="slide"
                    transparent={true}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Review Flag</Text>
                                <TouchableOpacity
                                    onPress={() => setReviewModalVisible(false)}
                                >
                                    <Ionicons name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody}>
                                {selectedFlag && (
                                    <>
                                        <Text style={styles.modalLabel}>Content:</Text>
                                        <Text style={styles.modalContentText}>
                                            &ldquo;{selectedFlag.content_text}&rdquo;
                                        </Text>

                                        <Text style={styles.modalLabel}>Reason:</Text>
                                        <Text style={styles.modalContentText}>
                                            {getReasonLabel(selectedFlag.flag_reason)}
                                        </Text>

                                        <Text style={styles.modalLabel}>Review Notes:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={reviewNotes}
                                            onChangeText={setReviewNotes}
                                            placeholder="Add review notes..."
                                            multiline
                                            numberOfLines={3}
                                        />

                                        <Text style={styles.modalLabel}>Action Taken:</Text>
                                        <TextInput
                                            style={styles.textInput}
                                            value={actionTaken}
                                            onChangeText={setActionTaken}
                                            placeholder="e.g., Warned user, Removed content..."
                                            multiline
                                            numberOfLines={2}
                                        />
                                    </>
                                )}
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.dismissButton]}
                                    onPress={() => handleUpdateStatus('dismissed')}
                                >
                                    <Text style={styles.dismissButtonText}>Dismiss</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.resolveButton]}
                                    onPress={() => handleUpdateStatus('resolved')}
                                >
                                    <Text style={styles.resolveButtonText}>Resolve</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
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
        width: 80, // Same width as back button for balance
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
    listContainer: {
        padding: 16,
    },
    analyticsContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    analyticsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    analyticsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    analyticsItem: {
        alignItems: 'center',
        flex: 1,
    },
    analyticsValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    analyticsLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    flagCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    flagHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    flagInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    flagType: {
        fontSize: 12,
        fontWeight: '600',
        color: '#007AFF',
        backgroundColor: '#e3f2fd',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '600',
    },
    flagDate: {
        fontSize: 12,
        color: '#999',
    },
    reasonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    contentPreview: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 12,
    },
    reviewButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    reviewButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
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
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    modalBody: {
        padding: 20,
        maxHeight: 400,
    },
    modalLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
        marginTop: 16,
    },
    modalContentText: {
        fontSize: 14,
        color: '#666',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    textInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginBottom: 8,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    dismissButton: {
        backgroundColor: '#8e8e93',
    },
    dismissButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    resolveButton: {
        backgroundColor: '#34c759',
    },
    resolveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
}); 