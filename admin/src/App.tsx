import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PostReviewPage from './pages/PostReviewPage';
import ReportPage from './pages/ReportPage';
import UserPage from './pages/UserPage';
import PhotographerPage from './pages/PhotographerPage';
import AnnouncementPage from './pages/AnnouncementPage';
import TeamPage from './pages/TeamPage';
import PlayerPage from './pages/PlayerPage';
import CheerleaderPage from './pages/CheerleaderPage';
import NotificationPage from './pages/NotificationPage';
import SystemSettingsPage from './pages/SystemSettingsPage';
import AdManagementPage from './pages/AdManagementPage';
import CommunityManagePage from './pages/CommunityManagePage';
import InquiryPage from './pages/InquiryPage';
import TicketRevenuePage from './pages/TicketRevenuePage';
import RankAwardsPage from './pages/RankAwardsPage';
import FeaturedCollectionPage from './pages/FeaturedCollectionPage';
import AnalyticsPage from './pages/AnalyticsPage';
import EventManagePage from './pages/EventManagePage';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <AuthGuard>
            <AdminProvider>
              <Layout />
            </AdminProvider>
          </AuthGuard>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/posts" element={<PostReviewPage />} />
        <Route path="/reports" element={<ReportPage />} />
        <Route path="/users" element={<UserPage />} />
        <Route path="/photographers" element={<PhotographerPage />} />
        <Route path="/community" element={<CommunityManagePage />} />
        <Route path="/inquiries" element={<InquiryPage />} />
        <Route path="/announcements" element={<AnnouncementPage />} />
        <Route path="/notifications" element={<NotificationPage />} />
        <Route path="/revenue" element={<TicketRevenuePage />} />
        <Route path="/rank-awards" element={<RankAwardsPage />} />
        <Route path="/featured" element={<FeaturedCollectionPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/events" element={<EventManagePage />} />
        <Route path="/ads" element={<AdManagementPage />} />
        <Route path="/teams" element={<TeamPage />} />
        <Route path="/players" element={<PlayerPage />} />
        <Route path="/cheerleaders" element={<CheerleaderPage />} />
        <Route path="/settings" element={<SystemSettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
