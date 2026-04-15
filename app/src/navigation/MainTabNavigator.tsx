import React, { useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import type { MainTabParamList } from '../types/navigation';
import BottomTabBar from '../components/shared/BottomTabBar';

import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import ArchiveScreen from '../screens/archive/ArchiveScreen';
import CommunityMainScreen from '../screens/community/CommunityMainScreen';
import StudioScreen from '../screens/photographer/StudioScreen';
import MyPageScreen from '../screens/my/MyPageScreen';

import { useAuth } from '../contexts/AuthContext';
import * as photographerApi from '../services/photographerApi';

const Tab = createBottomTabNavigator<MainTabParamList>();

type StudioTabState = 'no_app' | 'pending' | 'approved' | 'rejected';

export default function MainTabNavigator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [studioState, setStudioState] = useState<StudioTabState>('no_app');

  useEffect(() => {
    if (!user?.id) {
      setStudioState('no_app');
      return;
    }
    let cancelled = false;
    photographerApi
      .fetchMyPhotographerApplication(user.id)
      .then((res) => {
        if (cancelled) return;
        if (!res.data) setStudioState('no_app');
        else if (res.data.status === 'pending') setStudioState('pending');
        else if (res.data.status === 'rejected') setStudioState('rejected');
        else setStudioState('approved');
      })
      .catch(() => {
        if (!cancelled) setStudioState('no_app');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // UI-SPEC §MainTabNavigator: label/icon 분기
  const studioLabel =
    studioState === 'pending'
      ? t('tab_pending_review')
      : studioState === 'approved'
        ? t('tab_studio')
        : t('tab_photographer');

  const studioIconInactive: keyof typeof Ionicons.glyphMap =
    studioState === 'pending'
      ? 'time-outline'
      : studioState === 'approved'
        ? 'aperture-outline'
        : 'camera-outline';

  const studioIconActive: keyof typeof Ionicons.glyphMap =
    studioState === 'pending'
      ? 'time'
      : studioState === 'approved'
        ? 'aperture'
        : 'camera';

  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen
        name="Studio"
        component={StudioScreen}
        options={{
          tabBarLabel: studioLabel,
          tabBarIcon: ({ focused, size, color }) => (
            <Ionicons
              name={focused ? studioIconActive : studioIconInactive}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen name="Archive" component={ArchiveScreen} />
      <Tab.Screen name="Community" component={CommunityMainScreen} />
      <Tab.Screen name="MyPage" component={MyPageScreen} />
    </Tab.Navigator>
  );
}
