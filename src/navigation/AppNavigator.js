import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { COLORS } from "@constants";

import HomeScreen from "@screens/HomeScreen";
import RoomScreen from "@screens/RoomScreen";
import SearchScreen from "@screens/SearchScreen";

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: "bold" },
  cardStyle: { backgroundColor: COLORS.background },
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Jam Sesh 🎵", headerLeft: null }}
        />
        <Stack.Screen name="Room" component={RoomScreen} options={{ title: "Room" }} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search Tracks" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}