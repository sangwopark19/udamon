export const APP_VERSION = '1.0.0';

export const DEEP_LINK = {
  scheme: 'udamon',
  host: 'udamonfan.com',
} as const;

export const SUPPORT_EMAIL = 'support@udamonfan.com';

/** Set to true to enable support/ticket/revenue features */
export const SUPPORT_FEATURE_ENABLED = false;

/** Set to true to enable messaging/chat features */
export const MESSAGE_FEATURE_ENABLED = false;

/** Set to true when Apple Developer DUNS registration is complete (D-02) */
export const APPLE_SIGNIN_ENABLED = false;
