// services/friendship.service.ts
import type { ApiResponse, Friend, FriendStatus } from '../types/chat.types';

const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function sendFriendRequest(
  userId: string,
  friendId: string
): Promise<Friend> {
  const res = await fetch(`${API_BASE}/friends/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, friendId }),
  });
  const json = (await res.json()) as ApiResponse<Friend>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to send request');
  }
  return json.data;
}

export async function acceptFriendRequest(
  userId: string,
  friendId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/friends/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, friendId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to accept');
  }
}

export async function rejectFriendRequest(
  userId: string,
  friendId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/friends/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, friendId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to reject');
  }
}

export async function removeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/friends/${friendId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message ?? 'Failed to remove');
  }
}

export async function getFriendStatus(
  userId: string,
  otherId: string
): Promise<FriendStatus> {
  const params = new URLSearchParams({ userId, otherId });
  const res = await fetch(`${API_BASE}/friends/status?${params}`);
  const json = (await res.json()) as ApiResponse<FriendStatus>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to get status');
  }
  return json.data;
}

export async function getFriends(userId: string): Promise<Friend[]> {
  const res = await fetch(
    `${API_BASE}/friends?userId=${encodeURIComponent(userId)}`
  );
  const json = (await res.json()) as ApiResponse<Friend[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to get friends');
  }
  return json.data;
}