export const environment = {
  /** Optional defaults; sessionStorage context bar overrides at runtime */
  tenantId: '',
  productId: '',
  appTitle: 'Platform Backoffice',
  /** Dev-only hint from NG_APP_INTERNAL_API_KEY at build time */
  devInternalApiKeyHint: '' as string,
  /**
   * Optional override for platform-api base URL (e.g. `https://api.example.com/platform/v1`).
   * Leave empty in dev — `ng serve` proxies `/platform` → localhost:3010.
   */
  platformApiUrl: '' as string,
};
