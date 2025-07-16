import React, { useState, useRef } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    ScrollView, 
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { CATEGORIES } from '@/lib/constants';
import { hapticFeedback } from '@/lib/haptics';

const categories = CATEGORIES;

export default function CreateClaim() {
    const [title, setTitle] = useState('');
    const [claim, setClaim] = useState('');
    const [category, setCategory] = useState('');
    const [rules, setRules] = useState('');
    const [loading, setLoading] = useState(false);
    
    const titleInputRef = useRef<TextInput>(null);
    const claimInputRef = useRef<TextInput>(null);
    const rulesInputRef = useRef<TextInput>(null);

    const handleSubmit = async () => {
        // Validation
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title for your claim');
            return;
        }
        if (!claim.trim()) {
            Alert.alert('Error', 'Please enter your claim');
            return;
        }
        if (!category) {
            Alert.alert('Error', 'Please select a category');
            return;
        }

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Error', 'You must be logged in to create a claim');
                return;
            }

            const { error } = await supabase
                .from('claims')
                .insert({
                    title: title.trim(),
                    claim: claim.trim(),
                    category: category,
                    rules: rules.trim(),
                    op_id: user.id,
                    up_votes: 0,
                    down_votes: 0
                });

            if (error) {
                throw error;
            }

            Alert.alert(
                'Success!', 
                'Your claim has been created successfully!',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset form
                            setTitle('');
                            setClaim('');
                            setCategory('');
                            setRules('');
                            // Navigate to home
                            router.push('/Speak-It/Home');
                            hapticFeedback.submit();
                        }
                    }
                ]
            );
        } catch (error: any) {
            console.error('Error creating claim:', error);
            Alert.alert('Error', error.message || 'Failed to create claim');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={() => {
                Keyboard.dismiss();
                hapticFeedback.modal()
            }}>
                <ScrollView style={styles.scrollContainer}>
                    <Text style={styles.title}>Create a New Claim</Text>
                    <Text style={styles.subtitle}>
                        Share your perspective and start a meaningful discussion
                    </Text>

            {/* Title Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>What is your claim? *</Text>
                <TextInput
                    ref={titleInputRef}
                    style={styles.input}
                    value={title}
                    onChangeText={setTitle}
                    placeholder="I think that..."
                    maxLength={100}
                    returnKeyType="next"
                    onSubmitEditing={() => claimInputRef.current?.focus()}
                    blurOnSubmit={false}
                />
                <Text style={styles.characterCount}>{title.length}/100</Text>
            </View>

            {/* Claim Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Support your claim with all your soul *</Text>
                <TextInput
                    ref={claimInputRef}
                    style={[styles.input, styles.textArea]}
                    value={claim}
                    onChangeText={setClaim}
                    placeholder="Tell us why you think this way..."
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={6}
                    maxLength={500}
                    returnKeyType="next"
                    onSubmitEditing={() => rulesInputRef.current?.focus()}
                    blurOnSubmit={false}
                />
                <Text style={styles.characterCount}>{claim.length}/500</Text>
            </View>

            {/* Category Selection */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.categoryContainer}>
                    {categories.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryButton,
                                category === cat && styles.categoryButtonSelected
                            ]}
                            onPress={() => {
                                setCategory(cat);
                                hapticFeedback.select()
                            }}
                            onLongPress={() => hapticFeedback.longPress()}
                        >
                            <Text style={[
                                styles.categoryButtonText,
                                category === cat && styles.categoryButtonTextSelected
                            ]}>
                                {cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Rules Input */}
            <View style={styles.inputGroup}>
                <Text style={styles.label}>Discussion Rules (Optional)</Text>
                <TextInput
                    ref={rulesInputRef}
                    style={[styles.input, styles.textArea]}
                    value={rules}
                    onChangeText={setRules}
                    placeholder="Set guidelines for the discussion (e.g., 'Be respectful', 'Provide evidence')"
                    placeholderTextColor="#999"
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                />
                <Text style={styles.characterCount}>{rules.length}/200</Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={() => {
                    handleSubmit();
                    hapticFeedback.submit()
                }}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.submitButtonText}>Create Claim</Text>
                )}
            </TouchableOpacity>

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    * Required fields
                </Text>
            </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    scrollContainer: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    characterCount: {
        fontSize: 12,
        color: '#999',
        textAlign: 'right',
        marginTop: 4,
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryButton: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    categoryButtonSelected: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    categoryButtonText: {
        fontSize: 14,
        color: '#666',
    },
    categoryButtonTextSelected: {
        color: 'white',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#999',
    },
}); 