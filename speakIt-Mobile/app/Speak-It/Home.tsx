//
//  Home.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { HOME_IMAGES } from '@/lib/homeImages';
import { router } from 'expo-router';
import { Image, StatusBar,Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor='#f8f9fa'
        translucent={false}
      />

      <View>
      <Text style={{ 
        fontSize: 24, 
        fontWeight: 'bold', 
        marginBottom: 16,
        textAlign: 'center',
        color: '#1a1a1a',
        paddingHorizontal: 12,
        shadowColor: '#1a1a1a',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 12,
        }}>
           Join the Discussion or stare at all the arguments you've posted.
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
      <TouchableOpacity
        onPress={() => router.push('/Speak-It/Trending')}
        activeOpacity={0.8}
        style = {{marginBottom: 16,
          borderRadius: 12,
          backgroundColor: '#f8f9fa',
          shadowColor: '#1a1a1a',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
        >
        <Image source={{ uri: HOME_IMAGES.Trending }} style={{ width: '100%', height: 450}}
        resizeMode='contain'
        />        
        </TouchableOpacity>
        <TouchableOpacity
        onPress={() => router.push('/Speak-It/MyClaims')}
        activeOpacity={0.8}
        style = {{
          marginBottom: 16,
          borderRadius: 12,
          backgroundColor: '#f8f9fa',
          shadowColor: '#1a1a1a',
          shadowOffset: {
            width: 0,
            height: 4,
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 5,
        }}
        >
        <Image source={{ uri: HOME_IMAGES.MyClaims }} style={{ width: '100%', height: 450}}
        resizeMode='contain'
        />        
        </TouchableOpacity> 
        </ScrollView>
      {/* <Trending /> */}
      {/* <MyClaims /> */}
    </SafeAreaView>
  );
}
