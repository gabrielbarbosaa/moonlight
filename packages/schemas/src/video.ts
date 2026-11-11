export type VideoEmbed = { provider: 'youtube' | 'vimeo'; id: string; src: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;

export function parseVideoUrl(value: string | undefined): VideoEmbed | null {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/^m\./, '');
  const parts = url.pathname.split('/').filter(Boolean);

  let youtubeId: string | undefined;
  if (host === 'youtu.be') youtubeId = parts[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (parts[0] === 'watch') youtubeId = url.searchParams.get('v') ?? undefined;
    else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) youtubeId = parts[1];
  }
  if (youtubeId && YOUTUBE_ID.test(youtubeId)) {
    return {
      provider: 'youtube',
      id: youtubeId,
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
    };
  }

  let vimeoId: string | undefined;
  if (host === 'vimeo.com') vimeoId = parts.find((part) => /^\d+$/.test(part));
  else if (host === 'player.vimeo.com' && parts[0] === 'video') vimeoId = parts[1];
  if (vimeoId && VIMEO_ID.test(vimeoId)) {
    return {
      provider: 'vimeo',
      id: vimeoId,
      src: `https://player.vimeo.com/video/${vimeoId}?dnt=1`,
    };
  }

  return null;
}
