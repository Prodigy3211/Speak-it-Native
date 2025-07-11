import { Text, View, Image, Modal, Button, StyleSheet } from "react-native";
import { useState } from "react";
import Login from "@/components/login/Login";

export default function Index() {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const toggleModal = () => {
    setIsModalVisible(!isModalVisible);
  };
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
    <View>
      <Text>
        Speak Now Or Forever Hold Your Peace
      </Text>
    <Image
    source={require('../assets/images/speak-logo.png')}
    style={{height:300,width:300}}
          alt="Logo"
          />
        </View>
          <Button
          title="Login"
          onPress={toggleModal}
          />
            <Login isModalVisible={isModalVisible} toggleModal={toggleModal} />

    </View>
  );
};
