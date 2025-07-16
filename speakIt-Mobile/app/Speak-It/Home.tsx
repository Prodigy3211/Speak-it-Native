//
//  Home.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

import {View, Text, StatusBar}  from "react-native";
import Trending from "@/components/dashboard/Trending";

export default function Home (){
    
    
    return(
           <View style={{flex: 1}}>
                <StatusBar 
                    barStyle="dark-content" 
                    backgroundColor="#f8f9fa"
                    translucent={false}
                />
                <Trending />
           </View>
        );
    
};
