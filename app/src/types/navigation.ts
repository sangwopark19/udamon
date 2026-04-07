import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Explore: { teamId?: string } | undefined;
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
  Studio: { photographerId: string };
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

  // Admin
  AdminDashboard: undefined;
  AdminPostReview: undefined;
  AdminReportManage: undefined;
  AdminUserManage: undefined;
  AdminPhotographerReview: undefined;
  AdminAnnouncement: undefined;
};
