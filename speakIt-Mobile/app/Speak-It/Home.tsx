//
//  Home.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { View, StatusBar } from 'react-native';
import Trending from '@/components/dashboard/Trending';
import MyClaims from '@/components/dashboard/MyClaims';

export default function Home() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar
        barStyle='dark-content'
        backgroundColor='#f8f9fa'
        translucent={false}
      />
      <Trending />
      <MyClaims />
    </View>
  );
}
