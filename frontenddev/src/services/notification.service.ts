// services/notification.service.ts
import type { AppNotification, NotificationStatus } from '../types/notification.types';

const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function fetchNotifications(
  userId: string
): Promise<AppNotification[]> {
  const url = `${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`;
  console.log('🌐 GET:', url);      // ✅ DEBUG

  const res = await fetch(url);
  const json = await res.json();
  console.log('📥 RAW:', json);     // ✅ DEBUG

  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message ?? 'Failed to load notifications');
  }

  const mapped = json.data.map((raw: any) => ({
    id: raw.id,
    userId: raw.user_id,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    senderId: raw.sender_id,
    senderName: raw.sender_name ?? null,
    senderAvatar: raw.sender_avatar ?? null,
    referenceId: raw.reference_id,
    actionUrl: raw.action_url,
    status: raw.status,
    read: raw.is_read === 1,
    createdAt: raw.created_at,
  }));

  console.log('✅ Mapped:', mapped);  // ✅ DEBUG
  return mapped;
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const res = await fetch(
    `${API_BASE}/notifications/unread-count?userId=${encodeURIComponent(userId)}`
  );
  const json = await res.json();
  if (!res.ok || !json.success) return 0;
  return json.data.count ?? 0;
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<void> {
  await fetch(`${API_BASE}/notifications/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId, userId }),
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await fetch(`${API_BASE}/notifications/read-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
}

export async function deleteNotificationAPI(
  notificationId: string,
  userId: string
): Promise<void> {
  await fetch(
    `${API_BASE}/notifications/${notificationId}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

export async function clearAllNotificationsAPI(userId: string): Promise<void> {
  await fetch(
    `${API_BASE}/notifications?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

export async function updateNotificationStatus(
  notificationId: string,
  userId: string,
  status: NotificationStatus
): Promise<void> {
  await fetch(`${API_BASE}/notifications/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId, userId, status }),
  });
}