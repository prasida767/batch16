export const NOTIFICATION_TYPES = {
  BAAJI_CHALLENGE: "baaji_challenge",
  BAAJI_ACCEPTED: "baaji_accepted",
  BAAJI_DECLINED: "baaji_declined",
  BAAJI_RESULT: "baaji_result",
  CHAT_REPLY: "chat_reply",
  CHAT_MENTION: "chat_mention",
  TAUNT: "taunt",
  AWARDS_PUBLISHED: "awards_published",
  DOCUMENTARY_EPISODE: "documentary_episode",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export type NotificationView = {
  id: number;
  recipientManagerId: number;
  actorManagerId: number | null;
  actorName: string | null;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type CreateNotificationInput = {
  recipientManagerId: number;
  actorManagerId?: number | null;
  type: NotificationType | string;
  title: string;
  body?: string | null;
  href?: string | null;
  meta?: Record<string, unknown>;
};

export const NOTIFICATIONS_CHANNEL_PREFIX = "notifications";
