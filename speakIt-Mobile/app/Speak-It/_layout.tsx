//
//  _layout.tsx
//
//
//  Created by Amir Nasser on 7/9/25.
//

import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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
        </Tabs>
    );
}
