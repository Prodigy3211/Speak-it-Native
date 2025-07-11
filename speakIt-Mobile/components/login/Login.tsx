//
//  Login.tsx
//  
//
//  Created by Amir Nasser on 7/9/25.
//

//This will be a Login Modal that pops up on the Home Screen when a user wants to comment or create a claim
import { View,Text,StyleSheet, Modal, Button, GestureResponderEvent, TextInput} from 'react-native';

interface LoginProps {
    isModalVisible: boolean;
    toggleModal: (event: GestureResponderEvent) => void;
}

export default function Login ({isModalVisible, toggleModal}: LoginProps){
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
                    Login
                  </Text>
                  <Text>Username</Text>
                  <TextInput placeholder="Username" 
                  style = {styles.input}
                  />
                  <Text>Password</Text>
                  <TextInput placeholder="Password" 
                  style = {styles.input}
                  />
                  <Text>No Account? Sign Up</Text>
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