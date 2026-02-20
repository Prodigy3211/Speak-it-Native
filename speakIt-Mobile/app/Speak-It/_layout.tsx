//
//  _layout.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import * as Haptics from 'expo-haptics';

// Custom tab bar button with haptic feedback
const TabBarButton = ({ children, onPress, ...props }: any) => {
    const handlePress = () => {
        // Light haptic feedback for tab navigation
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    };

    return (
        <TouchableOpacity onPress={handlePress} {...props}>
            {children}
        </TouchableOpacity>
    );
};

export default function Layout(){
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#007AFF',
                tabBarInactiveTintColor: '#666',
                tabBarStyle: {
                    backgroundColor: 'white',
                    borderTopWidth: 1,
                    borderTopColor: '#e0e0e0',
                },
                headerStyle: {
                    backgroundColor: '#007AFF',
                },
                headerTintColor: 'white',
                headerTitleStyle: {
                    fontWeight: 'bold',
                    fontSize: 32,
                },
                // Add haptic feedback to all tab bar buttons
                tabBarButton: (props) => <TabBarButton {...props} />,
            }}
        >
            <Tabs.Screen
                name="Home"
                options={{
                    title: 'Home',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Categories"
                options={{
                    title: 'Categories',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="grid" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="CreateClaim"
                options={{
                    title: 'Create',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="add-circle" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="Profile"
                options={{
                    title: 'Profile',
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="ClaimDetail"
                options={{
                    href: null, // This hides it from the tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="CategoryClaims"
                options={{
                    href: null, // This hides it from the tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="MyClaims"
                options={{
                    href: null, // This hides it from the tab bar
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="Trending"
                options={{
                    href: null, // This hides it from the tab bar
                    headerShown: false,
                }}
            />
        </Tabs>
    );
}
