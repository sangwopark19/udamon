import i18n from '../i18n';

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return i18n.t('time_just_now');
  if (mins < 60) return i18n.t('time_m_ago', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return i18n.t('time_h_ago', { count: hrs });
  const days = Math.floor(hrs / 24);
  if (days < 7) return i18n.t('time_d_ago', { count: days });
  const weeks = Math.floor(days / 7);
  return i18n.t('time_w_ago', { count: weeks });
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}
