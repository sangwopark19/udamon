import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Explore: { teamId?: string } | undefined;
  Studio: { photographerId?: string } | undefined;
  Archive: undefined;
  Community: { teamId?: string } | undefined;
  MyPage: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  PostDetail: { postId: string };
  PhotographerProfile: { photographerId: string };
  TeamDetail: { teamId: string };
  PlayerDetail: { playerId: string };
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  UploadPost: { postId?: string; draftId?: string } | undefined;
  Notifications: undefined;
  FollowingList: { initialTab?: 'followers' | 'following' } | undefined;
  Terms: undefined;
  Privacy: undefined;
  MessageList: undefined;
  MessageDetail: { conversationId: string; recipientId?: string };
  BlockedUsers: undefined;
  CommunityPostDetail: { postId: string };
  CommunityWrite: { teamId?: string } | undefined;
  CommunitySearch: undefined;
  Search: undefined;
  PhotographerRegister: undefined;
  Onboarding: undefined;
  ProfileSetup: undefined;
  // IN-06: Studio 는 MainTabParamList 에도 선언됨 — 의도된 이중 등록.
  // 탭(bottom tab)에서 진입하는 일반 경로와, 딥 링크/다른 photographer 프로필에서
  // root stack 으로 push 후 goBack() 으로 돌아오는 경로 (App.tsx:244 에 등록) 둘 다 지원.
  Studio: { photographerId?: string } | undefined;
  CollectionDetail: { collectionId: string };
  ContactSupport: undefined;
  InquiryList: undefined;
  InquiryDetail: { inquiryId: string };
  FeaturedAll: undefined;
  AllPosts: undefined;
  PopularPhotographers: undefined;
  PhotographerTerms: undefined;
  CopyrightPolicy: undefined;
  AccountManagement: undefined;
  CheerleaderProfile: { cheerleaderId: string };
  CheerleadersAll: undefined;

  Announcements: undefined;

  // OAuth callback (deep link 수신용 — 실제 처리는 AuthContext의 Linking listener가 담당)
  AuthCallback: { code?: string; access_token?: string; refresh_token?: string } | undefined;

  // Admin
  AdminDashboard: undefined;
  AdminPostReview: undefined;
  AdminReportManage: undefined;
  AdminUserManage: undefined;
  AdminPhotographerReview: undefined;
  AdminAnnouncement: undefined;
};
