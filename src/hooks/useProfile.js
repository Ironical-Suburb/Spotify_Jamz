import { useState, useEffect } from "react";
import { profileExists, getProfile, subscribeToProfile, setOnlineStatus } from "@services/userService";
import { useAuth } from "./useAuth";

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const checkAndSubscribe = async () => {
      try {
        const exists = await profileExists(user.uid);
        setHasProfile(exists);

        if (exists) {
          // Set online status
          await setOnlineStatus(user.uid, true);

          // Subscribe to real-time profile updates
          const unsubscribe = subscribeToProfile(user.uid, (data) => {
            setProfile(data);
            setProfileLoading(false);
          });

          return unsubscribe;
        } else {
          setProfileLoading(false);
        }
      } catch (e) {
        console.error("Profile error:", e);
        setProfileLoading(false);
      }
    };

    let unsubscribe;
    checkAndSubscribe().then((unsub) => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
      // Set offline on unmount
      if (user?.uid) setOnlineStatus(user.uid, false).catch(() => {});
    };
  }, [user?.uid]);

  const refreshProfile = async () => {
    if (!user?.uid) return;
    const data = await getProfile(user.uid);
    setProfile(data);
    setHasProfile(!!data);
  };

  return { profile, profileLoading, hasProfile, refreshProfile };
}
