//
//  Home.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {View, Text}  from "react-native";
import Trending from "@/components/dashboard/Trending";

export default function Home (){
    
    
    return(
           <View style={{flex: 1}}>
            <Text>Welcome to SpeakIt
            </Text>
                <Trending />
           </View>
        );
    
};
