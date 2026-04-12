import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "@hooks/useAuth";
import { COLORS } from "@constants";

import LoginScreen from "@screens/LoginScreen";
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
  const { spotifyToken, loading } = useAuth();

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!spotifyToken ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: "Jam Sesh 🎵", headerLeft: null }}
            />
            <Stack.Screen name="Room" component={RoomScreen} options={{ title: "Room" }} />
            <Stack.Screen name="Search" component={SearchScreen} options={{ title: "Search Tracks" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}