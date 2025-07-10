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
    <Image
          alt="Logo"
          />
        </View>
      <Text>Edit app/index.tsx to edit this screen.</Text>
          <Link href="/Home"> Home </Link>
    </View>
  );
}
