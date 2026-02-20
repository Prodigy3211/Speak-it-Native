//
//  Home.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { router } from 'expo-router';
import { View, StatusBar,Text,Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Home() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor='#f8f9fa'
        translucent={false}
      />

      <Text> Join the Discussion or stare at all the arguments you've posted.</Text>
      <Button title='Trending' onPress={() => router.push('/Speak-It/Trending')} />

      <Button title='My Claims' onPress={() => router.push('/Speak-It/MyClaims')} />
      {/* <Trending /> */}
      {/* <MyClaims /> */}
    </SafeAreaView>
  );
}
