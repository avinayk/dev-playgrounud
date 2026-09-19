// services/chat.service.ts
import type {
  ApiResponse,
  Conversation,
  Message,
  AthleteListItem,
} from '../types/chat.types';

const API_BASE =
  import.meta.env?.VITE_API_URL ?? 'http://localhost:3001/api';

export async function fetchConversations(
  athleteId: string
): Promise<Conversation[]> {
  const res = await fetch(
    `${API_BASE}/chat/conversations?athleteId=${encodeURIComponent(athleteId)}`
  );
  const json = (await res.json()) as ApiResponse<Conversation[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to fetch conversations');
  }
  return json.data;
}

export async function fetchMessages(
  conversationId: string,
  athleteId: string
): Promise<Message[]> {
  const res = await fetch(
    `${API_BASE}/chat/conversations/${conversationId}/messages?athleteId=${encodeURIComponent(
      athleteId
    )}`
  );
  const json = (await res.json()) as ApiResponse<Message[]>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to fetch messages');
  }
  return json.data;
}

export async function markAsReadAPI(
  conversationId: string,
  athleteId: string
): Promise<void> {
  await fetch(
    `${API_BASE}/chat/conversations/${conversationId}/read`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ athleteId }),
    }
  );
}

export async function fetchAthletesForChat(
  excludeId: string,
  query = ''
): Promise<AthleteListItem[]> {
  const params = new URLSearchParams({ excludeId });
  if (query.trim()) params.set('q', query.trim());

  const res = await fetch(`${API_BASE}/chat/athletes?${params.toString()}`);
  const json = await res.json();

  if (!res.ok || !json.success || !Array.isArray(json.data)) {
    throw new Error(json.message ?? 'Failed to fetch athletes');
  }

  return json.data.map((a: any) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    userhandle: a.userhandle,
    profilepicture: a.profilepicture,
    position: a.position,
    primary_sport: a.primary_sport,
    school: a.school,
    level: a.level,
    state: a.state,
    city: a.city,
    avatar: a.profilepicture,
    primarySport: a.primary_sport,
    schoolOrLeague: a.school,
    isPro: false,
    isOnline: false,
  }));
}

export async function getOrCreateDirectAPI(
  athleteA: string,
  athleteB: string
): Promise<Conversation> {
  const res = await fetch(`${API_BASE}/chat/conversations/direct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteA, athleteB }),
  });
  const json = (await res.json()) as ApiResponse<Conversation>;
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Failed to create conversation');
  }
  return json.data;
}

export async function uploadFile(file: File): Promise<{
  url: string;
  name: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.success || !json.data) {
    throw new Error(json.message ?? 'Upload failed');
  }

  return {
    url: json.data.url,
    name: json.data.name,
  };
}



