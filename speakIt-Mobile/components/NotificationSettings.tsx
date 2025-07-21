import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { notificationService } from '@/lib/notificationService';
import { hapticFeedback } from '@/lib/haptics';

interface NotificationSettingsProps {
  visible: boolean;
  onClose: () => void;
}

interface NotificationPreferences {
  newComments: boolean;
  newClaims: boolean;
  mentions: boolean;
  replies: boolean;
  trending: boolean;
}

export default function NotificationSettings({ visible, onClose }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    newComments: true,
    newClaims: true,
    mentions: true,
    replies: true,
    trending: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadPreferences();
    }
  }, [visible]);

  const loadPreferences = async () => {
    // In a real app, you'd load these from your database
    // For now, we'll use default values
    setPreferences({
      newComments: true,
      newClaims: true,
      mentions: true,
      replies: true,
      trending: false,
    });
  };

  const savePreferences = async () => {
    setLoading(true);
    try {
      // In a real app, you'd save these to your database
      // For now, we'll just show a success message
      Alert.alert('Success', 'Notification preferences saved!');
      hapticFeedback.submit();
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const testNotification = async () => {
    try {
      await notificationService.sendLocalNotification(
        'Test Notification',
        'This is a test notification from SpeakIt!',
        { type: 'test' }
      );
      hapticFeedback.submit();
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
    hapticFeedback.select();
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Notification Settings</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              onClose();
              hapticFeedback.modal();
            }}
          >
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Push Notifications</Text>
          
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
              <Text style={styles.preferenceLabel}>New Comments</Text>
            </View>
            <Switch
              value={preferences.newComments}
              onValueChange={() => togglePreference('newComments')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={preferences.newComments ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="document-outline" size={20} color="#007AFF" />
              <Text style={styles.preferenceLabel}>New Claims</Text>
            </View>
            <Switch
              value={preferences.newClaims}
              onValueChange={() => togglePreference('newClaims')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={preferences.newClaims ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="at-outline" size={20} color="#007AFF" />
              <Text style={styles.preferenceLabel}>Mentions</Text>
            </View>
            <Switch
              value={preferences.mentions}
              onValueChange={() => togglePreference('mentions')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={preferences.mentions ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="arrow-undo-outline" size={20} color="#007AFF" />
              <Text style={styles.preferenceLabel}>Replies</Text>
            </View>
            <Switch
              value={preferences.replies}
              onValueChange={() => togglePreference('replies')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={preferences.replies ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.preferenceItem}>
            <View style={styles.preferenceInfo}>
              <Ionicons name="trending-up-outline" size={20} color="#007AFF" />
              <Text style={styles.preferenceLabel}>Trending Claims</Text>
            </View>
            <Switch
              value={preferences.trending}
              onValueChange={() => togglePreference('trending')}
              trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
              thumbColor={preferences.trending ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>Test Notifications</Text>
          <Text style={styles.sectionDescription}>
            Send a test notification to verify your settings are working correctly.
          </Text>

          <TouchableOpacity
            style={styles.testButton}
            onPress={testNotification}
          >
            <Ionicons name="notifications-outline" size={20} color="white" />
            <Text style={styles.testButtonText}>Send Test Notification</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionTitle}>About Notifications</Text>
          <Text style={styles.infoText}>
            • Notifications help you stay engaged with discussions you care about{'\n'}
            • You can change these settings at any time{'\n'}
            • Some notifications may be sent even when settings are off (important updates){'\n'}
            • Make sure to allow notifications in your device settings
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={savePreferences}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Preferences'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  testButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 