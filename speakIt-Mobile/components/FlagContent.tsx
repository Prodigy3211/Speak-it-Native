import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Modal,
    ScrollView,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { getFlaggingOptions } from '@/lib/contentModeration';
import { flagContent } from '@/lib/flaggingService';

interface FlagContentProps {
    contentId: string;
    contentType: 'claim' | 'comment';
    contentText: string;
    onFlag?: (reason: string) => void;
}

export default function FlagContent({ contentId, contentType, contentText, onFlag }: FlagContentProps) {
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const flaggingOptions = getFlaggingOptions();

    const handleFlag = () => {
        hapticFeedback.select();
        setModalVisible(true);
    };

    const handleSubmitFlag = async () => {
        if (!selectedReason) {
            Alert.alert('Error', 'Please select a reason for flagging this content');
            return;
        }

        setSubmitting(true);
        try {
            const result = await flagContent({
                contentId: contentId,
                contentType: contentType,
                flagReason: selectedReason,
                contentText: contentText,
                contentAuthorId: undefined // You can pass this if available
            });

            if (result.success) {
                const selectedOption = flaggingOptions.find(option => option.id === selectedReason);
                
                Alert.alert(
                    'Content Flagged',
                    `Thank you for your report. The content has been flagged for: ${selectedOption?.label}. Our community moderators will review it.`,
                    [
                        {
                            text: 'OK',
                            onPress: () => {
                                setModalVisible(false);
                                setSelectedReason(null);
                                if (onFlag) {
                                    onFlag(selectedReason);
                                }
                            }
                        }
                    ]
                );
            } else {
                Alert.alert('Error', result.error || 'Failed to submit flag. Please try again.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to submit flag. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <TouchableOpacity
                style={styles.flagButton}
                onPress={handleFlag}
            >
                <Ionicons name="flag-outline" size={16} color="#666" />
                <Text style={styles.flagButtonText}>Flag</Text>
            </TouchableOpacity>

            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Flag Content</Text>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    setSelectedReason(null);
                                    hapticFeedback.select();
                                }}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalBody}>
                            <Text style={styles.modalDescription}>
                                Help us maintain a respectful community by flagging content that violates our guidelines.
                            </Text>

                            <Text style={styles.contentPreview}>
                                Content: &ldquo;{contentText.substring(0, 100)}{contentText.length > 100 ? '...' : ''}&rdquo;
                            </Text>

                            <Text style={styles.reasonLabel}>Reason for flagging:</Text>

                            {flaggingOptions.map((option) => (
                                <TouchableOpacity
                                    key={option.id}
                                    style={[
                                        styles.reasonOption,
                                        selectedReason === option.id && styles.reasonOptionSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedReason(option.id);
                                        hapticFeedback.select();
                                    }}
                                >
                                    <View style={styles.reasonHeader}>
                                        <Text style={[
                                            styles.reasonTitle,
                                            selectedReason === option.id && styles.reasonTitleSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                        {selectedReason === option.id && (
                                            <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
                                        )}
                                    </View>
                                    <Text style={[
                                        styles.reasonDescription,
                                        selectedReason === option.id && styles.reasonDescriptionSelected
                                    ]}>
                                        {option.description}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setModalVisible(false);
                                    setSelectedReason(null);
                                    hapticFeedback.select();
                                }}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    (!selectedReason || submitting) && styles.submitButtonDisabled
                                ]}
                                onPress={handleSubmitFlag}
                                disabled={!selectedReason || submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Submit Flag</Text>
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
    flagButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        padding: 8,
    },
    flagButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '500',
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
        flex: 1,
        textAlign: 'center',
    },
    closeButton: {
        padding: 4,
    },
    modalBody: {
        padding: 20,
        maxHeight: 400,
    },
    modalDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 16,
    },
    contentPreview: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
        marginBottom: 16,
        padding: 12,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
    },
    reasonLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 12,
    },
    reasonOption: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    reasonOptionSelected: {
        backgroundColor: '#e3f2fd',
        borderColor: '#007AFF',
    },
    reasonHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    reasonTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1a1a1a',
    },
    reasonTitleSelected: {
        color: '#007AFF',
    },
    reasonDescription: {
        fontSize: 12,
        color: '#666',
        lineHeight: 16,
    },
    reasonDescriptionSelected: {
        color: '#007AFF',
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
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    submitButton: {
        flex: 1,
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
    },
}); 