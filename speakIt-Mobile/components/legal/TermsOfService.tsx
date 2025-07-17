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

export default function TermsOfService() {
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.text}>
          By accessing and using the SpeakIt mobile application, you accept and agree to be bound by the terms and provision of this agreement.
        </Text>

        <Text style={styles.sectionTitle}>2. Use License</Text>
        <Text style={styles.text}>
          Permission is granted to temporarily download one copy of the SpeakIt app for personal, non-commercial transitory viewing only.
        </Text>

        <Text style={styles.sectionTitle}>3. User Content</Text>
        <Text style={styles.text}>
          Users are responsible for the content they post. We reserve the right to remove content that violates our community guidelines.
        </Text>

        <Text style={styles.sectionTitle}>4. Privacy</Text>
        <Text style={styles.text}>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.
        </Text>

        <Text style={styles.sectionTitle}>5. Disclaimer</Text>
        <Text style={styles.text}>
          The materials on SpeakIt are provided on an &apos;as is&apos; basis. SpeakIt makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
        </Text>

        <Text style={styles.sectionTitle}>6. Limitations</Text>
        <Text style={styles.text}>
          In no event shall SpeakIt or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on SpeakIt.
        </Text>

        <Text style={styles.sectionTitle}>7. Revisions and Errata</Text>
        <Text style={styles.text}>
          The materials appearing on SpeakIt could include technical, typographical, or photographic errors. SpeakIt does not warrant that any of the materials on its app are accurate, complete or current.
        </Text>

        <Text style={styles.sectionTitle}>8. Links</Text>
        <Text style={styles.text}>
          SpeakIt has not reviewed all of the sites linked to its app and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by SpeakIt of the site.
        </Text>

        <Text style={styles.sectionTitle}>9. Modifications</Text>
        <Text style={styles.text}>
          SpeakIt may revise these terms of service for its app at any time without notice. By using this app you are agreeing to be bound by the then current version of these Terms of Service.
        </Text>

        <Text style={styles.sectionTitle}>10. Governing Law</Text>
        <Text style={styles.text}>
          These terms and conditions are governed by and construed in accordance with the laws and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
        </Text>

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Contact Us</Text>
          <Text style={styles.contactText}>
            If you have any questions about these Terms of Service, please contact us through:
          </Text>
          <TouchableOpacity onPress={handleSupportForm}>
            <Text style={styles.contactEmail}>Speak-It Support</Text>
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