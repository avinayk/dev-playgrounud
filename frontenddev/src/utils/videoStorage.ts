// frontend/src/utils/videoStorage.ts
const SAMPLE_VIDEOS: Record<string, string> = {
  basketball:
    'https://assets.mixkit.co/videos/preview/mixkit-basketball-player-dunking-a-ball-40866-large.mp4',
  soccer:
    'https://assets.mixkit.co/videos/preview/mixkit-soccer-player-kicking-the-ball-1542-large.mp4',
  volleyball:
    'https://assets.mixkit.co/videos/preview/mixkit-beach-volleyball-game-in-the-sun-41855-large.mp4',
  baseball:
    'https://assets.mixkit.co/videos/preview/mixkit-baseball-player-hitting-the-ball-42855-large.mp4',
  football:
    'https://assets.mixkit.co/videos/preview/mixkit-american-football-player-throwing-the-ball-42859-large.mp4',
  pickleball:
    'https://assets.mixkit.co/videos/preview/mixkit-tennis-player-hitting-the-ball-42742-large.mp4',
  tennis:
    'https://assets.mixkit.co/videos/preview/mixkit-tennis-player-hitting-the-ball-42742-large.mp4',
};

export function getSampleFallbackVideo(sport: string): string {
  return SAMPLE_VIDEOS[sport] ?? SAMPLE_VIDEOS.basketball;
}

export async function saveVideoToCache(key: string, url: string): Promise<void> {
  if (!url || (!url.startsWith('data:') && !url.startsWith('blob:'))) return;
  try {
    localStorage.setItem(`pg_video_${key}`, url);
  } catch { /* quota */ }
}

export async function getVideoFromCache(key: string): Promise<string | null> {
  try {
    return localStorage.getItem(`pg_video_${key}`);
  } catch {
    return null;
  }
}