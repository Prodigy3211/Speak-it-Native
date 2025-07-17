import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function PrivacyPolicy() {
  const handleSupportForm = async () => {
    const url = 'https://forms.gle/EGr4DYCQR7px8QoG8';
    const supported = await Linking.canOpenURL(url);
    
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Unable to open support form');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.text}>
          We collect information you provide directly to us, such as when you create an account, post content, or contact us for support.
        </Text>

        <Text style={styles.subsectionTitle}>Account Information</Text>
        <Text style={styles.text}>
          When you create an account, we collect your email address and any other information you choose to provide.
        </Text>

        <Text style={styles.subsectionTitle}>Content You Post</Text>
        <Text style={styles.text}>
          We collect the content you post, including text, images, and other materials you share through the app.
        </Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.text}>
          We use the information we collect to provide, maintain, and improve our services, communicate with you, and ensure the security of our platform.
        </Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.text}>
          We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.
        </Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.text}>
          We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
        </Text>

        <Text style={styles.sectionTitle}>5. Data Retention</Text>
        <Text style={styles.text}>
          We retain your personal information for as long as necessary to provide our services and comply with legal obligations.
        </Text>

        <Text style={styles.sectionTitle}>6. Your Rights</Text>
        <Text style={styles.text}>
          You have the right to access, update, or delete your personal information. You can also opt out of certain communications.
        </Text>

        <Text style={styles.sectionTitle}>7. Cookies and Tracking</Text>
        <Text style={styles.text}>
          We may use cookies and similar tracking technologies to enhance your experience and collect usage information.
        </Text>

        <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
        <Text style={styles.text}>
          Our app may contain links to third-party services. We are not responsible for the privacy practices of these services.
        </Text>

        <Text style={styles.sectionTitle}>9. Children&apos;s Privacy</Text>
        <Text style={styles.text}>
          Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
        </Text>

        <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
        <Text style={styles.text}>
          We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.
        </Text>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactText}>
            If you have any questions about this Privacy Policy, please contact us through our:
          </Text>
          <TouchableOpacity onPress={handleSupportForm}>
            <Text style={styles.contactEmail}>Contact Form</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 8,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1a1a1a',
    marginTop: 12,
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  contactSection: {
    marginTop: 32,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 8,
  },
  contactEmail: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
}); 