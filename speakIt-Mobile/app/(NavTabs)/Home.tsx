//
//  Home.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {Text, View, Image}  from "react-native";

export default function Home (){
    const loginModal = require('@/components/login/Login');
    
    
    return(
           <View>
           <Text>Login</Text>
           <Text>Password</Text>
           <Image source={require('/Users/amirnasser/Documents/Speak-it-Native/speakIt-Mobile/assets/images/speak-logo.png')}
           style={{height:300,width:300}}
           />
           <View source={loginModal}>
           </View>
           </View>
        );
    
};
