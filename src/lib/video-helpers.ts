/**
 * Helpers for video URLs we accept in lesson.recording_url.
 *
 * Today we recognise YouTube. Anything else falls through to the
 * existing "open in new tab" behaviour, so admins can paste Drive /
 * Zoom / Vimeo / etc. URLs without breakage.
 */

// 11-char YouTube IDs in any of the four common URL shapes.
const YOUTUBE_PATTERNS: RegExp[] = [
  /^https?:\/\/(?:www\.)?youtube\.com\/watch\?(?:[^&]*&)*v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

/**
 * Returns the 11-char YouTube video ID if the URL points at a YouTube
 * video in any of the common URL shapes (watch, youtu.be short link,
 * embed, shorts), otherwise null.
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  for (const re of YOUTUBE_PATTERNS) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeId(url) !== null;
}
