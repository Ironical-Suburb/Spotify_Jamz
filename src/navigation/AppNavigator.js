import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuth } from "@hooks/useAuth";
import { profileExists } from "@services/userService";
import { getMe, getTopArtists, getTopGenres } from "@services/spotify";
import { COLORS } from "@constants";

import LoginScreen from "@screens/LoginScreen";
import ProfileSetupScreen from "@screens/ProfileSetupScreen";
import HomeScreen from "@screens/HomeScreen";
import RoomScreen from "@screens/RoomScreen";
import SearchScreen from "@screens/SearchScreen";
import ProfileScreen from "@screens/ProfileScreen";

const Stack = createStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: "bold" },
  cardStyle: { backgroundColor: COLORS.background },
};

const Loader = () => (
  <View style={{
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  }}>
    <ActivityIndicator color={COLORS.primary} size="large" />
  </View>
);

export default function AppNavigator() {
  const { user, spotifyToken, loading } = useAuth();
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);
  const [spotifyProfileData, setSpotifyProfileData] = useState(null);

  useEffect(() => {
    if (!spotifyToken || !user?.uid) return;

    const check = async () => {
      setCheckingProfile(true);
      try {
        const exists = await profileExists(user.uid);
        setHasProfile(exists);

        if (!exists) {
          const [me, topArtists, topGenres] = await Promise.all([
            getMe(spotifyToken),
            getTopArtists(spotifyToken),
            getTopGenres(spotifyToken),
          ]);
          setSpotifyProfileData({ me, topArtists, topGenres });
        }
      } catch (e) {
        console.warn("Profile check error:", e.message);
      } finally {
        setCheckingProfile(false);
        setProfileReady(true);
      }
    };

    check();
  }, [spotifyToken, user?.uid]);

  if (loading || checkingProfile || (spotifyToken && !profileReady)) {
    return <Loader />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!spotifyToken ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : !hasProfile ? (
          <Stack.Screen
            name="ProfileSetup"
            component={ProfileSetupScreen}
            options={{ headerShown: false }}
            initialParams={{
              spotifyProfile: spotifyProfileData?.me,
              topArtists: spotifyProfileData?.topArtists,
              topGenres: spotifyProfileData?.topGenres,
              onProfileCreated: () => setHasProfile(true),
            }}
          />
        ) : (
          <>
            {/* Home — no header, we build our own top bar */}
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Room"
              component={RoomScreen}
              options={{ title: "Room" }}
            />
            <Stack.Screen
              name="Search"
              component={SearchScreen}
              options={{ title: "Search Tracks" }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}