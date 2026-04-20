import React from 'react';
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
import { usePhotographer } from '../contexts/PhotographerContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

type StudioTabState = 'no_app' | 'pending' | 'approved' | 'rejected';

export default function MainTabNavigator() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { myApplication } = usePhotographer();

  // HI-02 유지: user.is_photographer 가 synchronous baseline. application 상태가
  // 더 최신이면 우선 반영. derive-only → submit → Context update → 자동 리렌더 체인.
  const studioState: StudioTabState = !user?.id
    ? 'no_app'
    : user.is_photographer
      ? 'approved'
      : myApplication?.status === 'pending'
        ? 'pending'
        : myApplication?.status === 'rejected'
          ? 'rejected'
          : 'no_app';

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
