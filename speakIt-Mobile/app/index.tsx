import { Text, View, Image } from "react-native";
import { Link } from "expo-router";

export default function Index() {
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
      <Text>Edit app/index.tsx to edit this screen.</Text>
          <Link href="/Home"> Home </Link>
    </View>
  );
}
