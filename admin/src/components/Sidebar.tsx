import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Images,
  Flag,
  Users,
  Camera,
  Megaphone,
  Bell,
  LogOut,
  Shield,
  Trophy,
  UserCheck,
  Heart,
  Monitor,
  Settings,
  MessageSquare,
  HelpCircle,
  Ticket,
  Award,
  Star,
  BarChart3,
  Calendar,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdmin } from '../contexts/AdminContext';
import type { AdminStats } from '../types';

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  badgeKey: keyof AdminStats | null;
};

type NavGroup = {
  title: string | null;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    title: null,
    items: [
      { to: '/', icon: LayoutDashboard, label: '대시보드', badgeKey: null },
    ],
  },
  {
    title: '심사/운영',
    items: [
      { to: '/posts', icon: Images, label: '게시물 심사', badgeKey: 'pendingReviewCount' },
      { to: '/reports', icon: Flag, label: '신고 관리', badgeKey: 'pendingReportCount' },
      { to: '/photographers', icon: Camera, label: '포토그래퍼 인증', badgeKey: 'pendingPhotographerCount' },
    ],
  },
  {
    title: '유저',
    items: [
      { to: '/users', icon: Users, label: '유저 관리', badgeKey: null },
    ],
  },
  {
    title: '콘텐츠',
    items: [
      { to: '/community', icon: MessageSquare, label: '커뮤니티 관리', badgeKey: null },
      { to: '/featured', icon: Star, label: '피처/컬렉션', badgeKey: null },
      { to: '/events', icon: Calendar, label: '이벤트', badgeKey: null },
    ],
  },
  {
    title: '소통',
    items: [
      { to: '/inquiries', icon: HelpCircle, label: '문의 관리', badgeKey: null },
      { to: '/announcements', icon: Megaphone, label: '공지사항', badgeKey: null },
      { to: '/notifications', icon: Bell, label: '알림 관리', badgeKey: null },
    ],
  },
  {
    title: '비즈니스',
    items: [
      { to: '/revenue', icon: Ticket, label: '티켓/수익', badgeKey: null },
      { to: '/rank-awards', icon: Award, label: '랭크/어워드', badgeKey: null },
      { to: '/ads', icon: Monitor, label: '광고 관리', badgeKey: null },
      { to: '/analytics', icon: BarChart3, label: '분석', badgeKey: null },
    ],
  },
  {
    title: '야구 데이터',
    items: [
      { to: '/teams', icon: Trophy, label: '구단 정보', badgeKey: null },
      { to: '/players', icon: UserCheck, label: '선수 관리', badgeKey: null },
      { to: '/cheerleaders', icon: Heart, label: '치어리더 관리', badgeKey: null },
    ],
  },
];

function NavItemLink({ item, stats, pathname }: { item: NavItem; stats: AdminStats; pathname: string }) {
  const isActive = pathname === item.to;
  const Icon = item.icon;
  const badge = item.badgeKey ? (stats[item.badgeKey] as number) : 0;

  return (
    <NavLink
      to={item.to}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-white/15 text-white font-semibold'
          : 'text-white/60 hover:text-white hover:bg-white/5'
      }`}
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
    </NavLink>
  );
}

export default function Sidebar() {
  const { logout } = useAuth();
  const { stats } = useAdmin();
  const location = useLocation();
  const isSettingsActive = location.pathname === '/settings';

  return (
    <aside className="w-64 bg-navy text-white flex flex-col h-screen fixed left-0 top-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <div className="font-bold text-sm">Udamon</div>
            <div className="text-[11px] text-white/50">Admin Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map((group, gi) => (
          <div key={gi}>
            {group.title && (
              <div className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                {group.title}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavItemLink key={item.to} item={item} stats={stats} pathname={location.pathname} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Logout */}
      <div className="px-3 pb-5 space-y-0.5 border-t border-white/10 pt-3">
        <NavLink
          to="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            isSettingsActive
              ? 'bg-white/15 text-white font-semibold'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={16} />
          <span>설정</span>
        </NavLink>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/5 w-full transition-colors"
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}
