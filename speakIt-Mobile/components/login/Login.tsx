//
//  Login.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

//This will be a Login Modal that pops up on the Home Screen when a user wants to comment or create a claim
import { View,Text,StyleSheet, Modal, Button, GestureResponderEvent, TextInput, Alert} from 'react-native';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';

interface LoginProps {
    isModalVisible: boolean;
    toggleModal: (event: GestureResponderEvent) => void;
}

export default function Login ({isModalVisible, toggleModal}: LoginProps){
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                Alert.alert('Success', 'Check your email for the confirmation link!');
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                Alert.alert('Success', 'Logged in successfully!');
                toggleModal({} as GestureResponderEvent);
                router.push('/Home');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View>
            <Modal
             visible={isModalVisible}
             animationType="slide"
             transparent={true}
             onRequestClose= {toggleModal}
             >
                <View style = {styles.overlay}>
                <View style = {styles.modal}>
                  <Text style = {styles.title}>
                    {isSignUp ? 'Sign Up' : 'Login'}
                  </Text>
                  <Text>Email</Text>
                  <TextInput 
                    placeholder="Email" 
                    style = {styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Text>Password</Text>
                  <TextInput 
                    placeholder="Password" 
                    style = {styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                  <Button 
                    title={loading ? "Loading..." : (isSignUp ? "Sign Up" : "Login")} 
                    onPress={handleAuth}
                    disabled={loading}
                  />
                  <Button 
                    title={isSignUp ? "Already have an account? Login" : "No Account? Sign Up"} 
                    onPress={() => setIsSignUp(!isSignUp)}
                  />
              <Button title= "Close" onPress={toggleModal} />
              </View>
              </View>
             </Modal>
        </View>
            );
};

const styles = StyleSheet.create({
    overlay:{
      flex:1,
      backgroundColor:'rgba(0,0,0,0.5)',
      justifyContent:'center',
      alignItems:'center',
    },
    modal:{
      width:'80%',
      backgroundColor:'white',
      borderRadius:10,
      padding: 20,
      alignItems:'center',
      elevation:5
    },
    title:{
      fontSize:24,
      marginBottom:10,
    },
    input:{
        backgroundColor:'#f0f0f0',
        borderRadius:5,
        padding:10,
        marginBottom:10,
        width:'100%'
    }
  })