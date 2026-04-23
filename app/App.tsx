import './src/i18n';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Linking from 'expo-linking';

import type { RootStackParamList } from './src/types/navigation';
import { colors } from './src/constants/colors';
import { DEEP_LINK } from './src/constants/config';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { BlockProvider } from './src/contexts/BlockContext';
import { ReportProvider } from './src/contexts/ReportContext';
import { CommunityProvider } from './src/contexts/CommunityContext';
import { PhotographerProvider } from './src/contexts/PhotographerContext';
import { RankProvider } from './src/contexts/RankContext';
import { AwardsProvider } from './src/contexts/AwardsContext';
import { ArchiveProvider } from './src/contexts/ArchiveContext';
import { ThankYouWallProvider } from './src/contexts/ThankYouWallContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { InquiryProvider } from './src/contexts/InquiryContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { MessageProvider } from './src/contexts/MessageContext';
import { ComingSoonProvider } from './src/contexts/ComingSoonContext';
import { AdminProvider } from './src/contexts/AdminContext';
import ErrorBoundary from './src/components/common/ErrorBoundary';
import { navigationRef } from './src/navigation/navigationRef';
import { usePushDeepLinkHandler } from './src/hooks/usePushDeepLinkHandler';

// Set notification behavior for foreground (skip in Expo Go — not supported since SDK 53)
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo';
if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

import MainTabNavigator from './src/navigation/MainTabNavigator';
import CommunityPostDetailScreen from './src/screens/community/CommunityPostDetailScreen';
import CommunityWriteScreen from './src/screens/community/CommunityWriteScreen';
import CommunitySearchScreen from './src/screens/community/CommunitySearchScreen';
import TeamDetailScreen from './src/screens/explore/TeamDetailScreen';
import PlayerDetailScreen from './src/screens/explore/PlayerDetailScreen';
import PostDetailScreen from './src/screens/explore/PostDetailScreen';
import SearchScreen from './src/screens/explore/SearchScreen';
import NotificationsScreen from './src/screens/notifications/NotificationsScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import PhotographerProfileScreen from './src/screens/photographer/PhotographerProfileScreen';
import PhotographerRegisterScreen from './src/screens/photographer/PhotographerRegisterScreen';
import UploadPostScreen from './src/screens/photographer/UploadPostScreen';
import StudioScreen from './src/screens/photographer/StudioScreen';
import CollectionDetailScreen from './src/screens/photographer/CollectionDetailScreen';
import OnboardingScreen from './src/screens/onboarding/OnboardingScreen';
import ProfileSetupScreen from './src/screens/onboarding/ProfileSetupScreen';
import TermsScreen from './src/screens/settings/TermsScreen';
import PrivacyScreen from './src/screens/settings/PrivacyScreen';
import BlockedUsersScreen from './src/screens/settings/BlockedUsersScreen';
import AccountManagementScreen from './src/screens/settings/AccountManagementScreen';
import CheerleaderProfileScreen from './src/screens/cheerleader/CheerleaderProfileScreen';
import CheerleadersAllScreen from './src/screens/cheerleader/CheerleadersAllScreen';
import ContactSupportScreen from './src/screens/settings/ContactSupportScreen';
import InquiryListScreen from './src/screens/settings/InquiryListScreen';
import InquiryDetailScreen from './src/screens/settings/InquiryDetailScreen';
import FollowingListScreen from './src/screens/social/FollowingListScreen';
import MessageListScreen from './src/screens/message/MessageListScreen';
import MessageDetailScreen from './src/screens/message/MessageDetailScreen';
import FeaturedAllScreen from './src/screens/home/FeaturedAllScreen';
import AllPostsScreen from './src/screens/home/AllPostsScreen';
import PopularPhotographersScreen from './src/screens/home/PopularPhotographersScreen';
import PhotographerTermsScreen from './src/screens/settings/PhotographerTermsScreen';
import CopyrightPolicyScreen from './src/screens/settings/CopyrightPolicyScreen';
import AnnouncementsScreen from './src/screens/settings/AnnouncementsScreen';

import AdminDashboardScreen from './src/screens/admin/AdminDashboardScreen';
import AdminPostReviewScreen from './src/screens/admin/AdminPostReviewScreen';
import AdminReportManageScreen from './src/screens/admin/AdminReportManageScreen';
import AdminUserManageScreen from './src/screens/admin/AdminUserManageScreen';
import AdminPhotographerReviewScreen from './src/screens/admin/AdminPhotographerReviewScreen';
import AdminAnnouncementScreen from './src/screens/admin/AdminAnnouncementScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    Linking.createURL('/'),
    `https://${DEEP_LINK.host}`,
    `${DEEP_LINK.scheme}://`,
  ],
  config: {
    screens: {
      PostDetail: 'post/:postId',
      PhotographerProfile: 'photographer/:photographerId',
      MainTabs: {
        screens: {
          Home: '',
          Explore: 'explore',
          Community: 'community',
        },
      },
    },
  },
};

function SplashScreen() {
  return (
    <View style={splashStyles.container}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <View style={splashStyles.logoWrap}>
        <Text style={splashStyles.brand}>우다몬</Text>
        <Text style={splashStyles.tagline}>KBO Fan Photo Community</Text>
      </View>
      <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" style={splashStyles.spinner} />
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 2,
  },
  spinner: {
    marginTop: 40,
  },
});

function PushHandler() {
  usePushDeepLinkHandler();
  return null;
}

function AppNavigator() {
  const { loading, isAuthenticated, guestMode, signupInProgress, profileReady, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const prevCanBrowseRef = useRef(false);

  // iOS 빌드타임 임베딩(app.json expo-font)과 별개로, 런타임 폰트 로딩도 보장
  const [fontsLoaded, fontsError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsError) {
      console.error('[Font] Failed to load Ionicons:', fontsError);
    }
  }, [fontsError]);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then((v) => setOnboardingDone(v === 'true'));
  }, []);

  const canBrowse = (isAuthenticated && !signupInProgress) || guestMode;
  const needsProfileSetup = isAuthenticated && profileReady && user && (!user.nickname || user.nickname.startsWith('user_') || !user.my_team_id);

  // Navigator key 변경 시 NavigationContainer가 이전 state를 캐싱하여
  // initialRouteName이 무시되는 문제 해결 — canBrowse 전환 시 직접 resetRoot
  useEffect(() => {
    if (canBrowse && !prevCanBrowseRef.current && navigationRef.isReady()) {
      const route = canBrowse
        ? (onboardingDone === false ? 'Onboarding' : needsProfileSetup ? 'ProfileSetup' : 'MainTabs')
        : 'Login';
      if (__DEV__) console.log('[AppNavigator] resetRoot →', route);
      navigationRef.resetRoot({ index: 0, routes: [{ name: route }] });
    }
    prevCanBrowseRef.current = canBrowse;
  }, [canBrowse, onboardingDone, needsProfileSetup]);

  if (loading || onboardingDone === null || (!fontsLoaded && !fontsError) || (isAuthenticated && !profileReady)) return <SplashScreen />;

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!canBrowse) return 'Login';
    if (!onboardingDone) return 'Onboarding';
    if (needsProfileSetup) return 'ProfileSetup';
    return 'MainTabs';
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      {!isExpoGo && <PushHandler />}
      <StatusBar style="dark" backgroundColor={colors.background} />
      <RootStack.Navigator
        key={canBrowse ? 'main' : 'auth'}
        initialRouteName={getInitialRoute()}
        screenOptions={{ headerShown: false }}
      >
        {canBrowse ? (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
            <RootStack.Screen name="CommunityPostDetail" component={CommunityPostDetailScreen} />
            <RootStack.Screen name="CommunityWrite" component={CommunityWriteScreen} />
            <RootStack.Screen name="CommunitySearch" component={CommunitySearchScreen} />
            <RootStack.Screen name="TeamDetail" component={TeamDetailScreen} />
            <RootStack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
            <RootStack.Screen name="PostDetail" component={PostDetailScreen} />
            <RootStack.Screen name="Search" component={SearchScreen} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} />
            <RootStack.Screen name="Login" component={LoginScreen} options={{ presentation: 'modal' }} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="PhotographerProfile" component={PhotographerProfileScreen} />
            <RootStack.Screen name="PhotographerRegister" component={PhotographerRegisterScreen} />
            <RootStack.Screen name="UploadPost" component={UploadPostScreen} />
            <RootStack.Screen name="Terms" component={TermsScreen} />
            <RootStack.Screen name="Privacy" component={PrivacyScreen} />
            <RootStack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <RootStack.Screen name="FollowingList" component={FollowingListScreen} />
            <RootStack.Screen name="MessageList" component={MessageListScreen} />
            <RootStack.Screen name="MessageDetail" component={MessageDetailScreen} />
            <RootStack.Screen name="Studio" component={StudioScreen} />
            <RootStack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
            <RootStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
            <RootStack.Screen name="ContactSupport" component={ContactSupportScreen} />
            <RootStack.Screen name="InquiryList" component={InquiryListScreen} />
            <RootStack.Screen name="InquiryDetail" component={InquiryDetailScreen} />
            <RootStack.Screen name="FeaturedAll" component={FeaturedAllScreen} />
            <RootStack.Screen name="AllPosts" component={AllPostsScreen} />
            <RootStack.Screen name="PopularPhotographers" component={PopularPhotographersScreen} />
            <RootStack.Screen name="PhotographerTerms" component={PhotographerTermsScreen} />
            <RootStack.Screen name="CopyrightPolicy" component={CopyrightPolicyScreen} />
            <RootStack.Screen name="AccountManagement" component={AccountManagementScreen} />
            <RootStack.Screen name="CheerleaderProfile" component={CheerleaderProfileScreen} />
            <RootStack.Screen name="CheerleadersAll" component={CheerleadersAllScreen} />
            <RootStack.Screen name="Announcements" component={AnnouncementsScreen} />
            <RootStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <RootStack.Screen name="AdminPostReview" component={AdminPostReviewScreen} />
            <RootStack.Screen name="AdminReportManage" component={AdminReportManageScreen} />
            <RootStack.Screen name="AdminUserManage" component={AdminUserManageScreen} />
            <RootStack.Screen name="AdminPhotographerReview" component={AdminPhotographerReviewScreen} />
            <RootStack.Screen name="AdminAnnouncement" component={AdminAnnouncementScreen} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Login" component={LoginScreen} />
            <RootStack.Screen name="Signup" component={SignupScreen} />
            <RootStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <RootStack.Screen name="Terms" component={TermsScreen} />
            <RootStack.Screen name="Privacy" component={PrivacyScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <SafeAreaProvider>
      <ToastProvider>
      <ComingSoonProvider>
      <AuthProvider>
        <BlockProvider>
          <ReportProvider>
                <CommunityProvider>
                  <PhotographerProvider>
                    <RankProvider>
                    <AwardsProvider>
                      <ArchiveProvider>
                        <ThankYouWallProvider>
                        <InquiryProvider>
                          <NotificationProvider>
                            <AdminProvider>
                            <MessageProvider>
                              <AppNavigator />
                            </MessageProvider>
                            </AdminProvider>
                          </NotificationProvider>
                        </InquiryProvider>
                        </ThankYouWallProvider>
                      </ArchiveProvider>
                    </AwardsProvider>
                    </RankProvider>
                  </PhotographerProvider>
                </CommunityProvider>
          </ReportProvider>
        </BlockProvider>
      </AuthProvider>
      </ComingSoonProvider>
      </ToastProvider>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}
