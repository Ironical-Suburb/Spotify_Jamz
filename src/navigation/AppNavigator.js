import React, { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import StatsScreen from "@screens/StatsScreen";
import FriendsScreen from "@screens/FriendsScreen";
import DiscoverScreen from "@screens/DiscoverScreen";
import MatchesScreen from "@screens/MatchesScreen";
import MatchChatScreen from "@screens/MatchChatScreen";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const stackOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: "bold" },
  cardStyle: { backgroundColor: COLORS.background },
};

const tabBarOptions = {
  tabBarStyle: {
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.surfaceAlt,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabBarActiveTintColor: COLORS.primary,
  tabBarInactiveTintColor: COLORS.textMuted,
  tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.textPrimary,
  headerTitleStyle: { fontWeight: "bold" },
};

function TabIcon({ emoji, focused }) {
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎵" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          title: "Discover",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{
          title: "Matches",
          tabBarIcon: ({ focused }) => <TabIcon emoji="💜" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const Loader = () => (
  <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: "center", alignItems: "center" }}>
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
      <Stack.Navigator screenOptions={stackOptions}>
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
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
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
            <Stack.Screen
              name="MatchChat"
              component={MatchChatScreen}
              options={({ route }) => ({
                title: `${route.params?.otherEmoji ?? "🎵"} ${route.params?.otherNickname ?? "Match"}`,
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
