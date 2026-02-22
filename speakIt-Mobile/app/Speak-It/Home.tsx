//
//  Home.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { HOME_IMAGES } from '@/lib/homeImages';
import { router } from 'expo-router';
import { Image, StatusBar,Text, View, TouchableOpacity, ScrollView, StyleSheet, GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HomeButtonProps {
  title: string;
  onPress: (event: GestureResponderEvent) => void;
};

const HomeButton = ({ title, onPress}: HomeButtonProps) => {
  return (
    <TouchableOpacity
    style = {styles.button}
    onPress = {onPress}
    activeOpacity = {0.8}
    >
      <Text style = {styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
};

export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor='#f8f9fa'
        translucent={false}
      />

      <View>
      <Text style={styles.sectionTitle}> Welcome To Speak It</Text>
      <Text style={styles.sectionSubtitle}>
        Check the hottest claims below, see all categories or create your own claim.
           </Text>
      </View>
      <ScrollView
      contentContainerStyle={{ 
        paddingHorizontal: 20,
        paddingTop: 16,
      paddingBottom: 16,
      gap: 20,
     }}
      >
      <HomeButton
        title = "Trending Claims"
        onPress={() => router.push('/Speak-It/Trending')}
        />      
        <HomeButton
        title = "My Claims"
        onPress={() => router.push('/Speak-It/MyClaims')}
        />
        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginVertical: 12,
    color: '#1a1a1a',
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3, // Android shadow
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});