import type { NotificationService } from '../../src/modules/notifications/notification.service';

/**
 * No-op NotificationService stub for unit specs that manually instantiate
 * services which depend on NotificationService but whose tested method does
 * not (or whose notification side-effects are covered separately in
 * test/notifications/*.spec.ts).
 *
 * Centralised so the cast happens in one place; if NotificationService grows
 * methods that some tests SHOULD exercise, the type error surfaces here.
 */
export const noopNotificationService = (): NotificationService =>
  ({ notify: async () => {} }) as unknown as NotificationService;
