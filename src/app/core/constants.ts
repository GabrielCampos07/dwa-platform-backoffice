export const SESSION_API_KEY = 'platform-backoffice-internal-api-key';
export const SESSION_TENANT_ID = 'platform-backoffice-tenant-id';
export const SESSION_PRODUCT_ID = 'platform-backoffice-product-id';

export const FEATURE_FLAG_KEYS = [
  'notifications',
  'attendance',
  'gamification',
  'banners',
  'ranking',
  'feed',
  'i18n',
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export const FEATURE_FLAG_LABELS: Record<FeatureFlagKey, string> = {
  notifications: 'Notifications (bell, WS, /me/notifications)',
  attendance: 'Attendance / check-in',
  gamification: 'Gamification (points, badges)',
  banners: 'Campus notices / banners',
  ranking: 'Attendance leaderboards',
  feed: 'Social activity feed',
  i18n: 'Locale selector + copy overlays',
};
