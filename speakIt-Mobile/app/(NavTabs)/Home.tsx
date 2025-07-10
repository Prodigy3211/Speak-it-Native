//
//  Home.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import Login from "@/components/login/Login";
import {Text, View, Image}  from "react-native";

export default function Home (){
    
    
    return(
           <View>
           <Image source={require('../../assets/images/speak-logo.png')}
           style={{height:300,width:300}}
           />
           <View>
            <Login />
           </View>
           </View>
        );
    
};
