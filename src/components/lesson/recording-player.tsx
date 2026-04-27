"use client";

/**
 * RecordingPlayer — wraps a "Watch recording" UI.
 *
 * If the recording URL is a YouTube link, renders the video as an
 * inline 16:9 embed (privacy-enhanced youtube-nocookie domain, minimal
 * branding, related videos disabled, keyboard shortcuts disabled,
 * right-click context menu suppressed on the wrapper). The actual
 * youtube.com URL is hidden inside the iframe so a casual student
 * can't pull it off the page via "View source" / right-click.
 *
 * For any other URL (Zoom, Drive, Vimeo, ...) the component renders
 * the `children` prop unchanged — letting the existing link-button UI
 * each call site provides keep working exactly as before.
 *
 * NOTE: this only deters casual sharing. OS-level screen recording
 * cannot be prevented by any web technology.
 */
import { extractYouTubeId } from "@/lib/video-helpers";

interface Props {
  url: string;
  /**
   * Rendered when `url` is NOT a YouTube URL — typically the existing
   * "Watch recording" link button. Lets each call site keep its own
   * styling for the non-YouTube case.
   */
  children: React.ReactNode;
  /**
   * Optional title shown to assistive tech for the iframe. Defaults to
   * "Class recording".
   */
  title?: string;
}

export function RecordingPlayer({ url, children, title = "Class recording" }: Props) {
  const id = extractYouTubeId(url);
  if (!id) return <>{children}</>;

  // youtube-nocookie: privacy-enhanced embed domain (no third-party
  // tracking cookies dropped on the LMS page).
  // modestbranding=1: hides the YouTube logo in the controls bar.
  // rel=0:           does NOT cross-pollinate with random "related"
  //                  videos — only shows more from the same channel.
  //
  // Default controls remain ON — students get play/pause, timeline
  // scrubbing (forward/backward), keyboard shortcuts (←/→ to seek 5s,
  // J/L to seek 10s, K to toggle play, comma/period to step frame),
  // captions toggle, fullscreen, and the Settings gear (which exposes
  // playback speed 0.25x → 2x).
  const src = `https://www.youtube-nocookie.com/embed/${id}?modestbranding=1&rel=0`;

  return (
    <div
      className="relative w-full basis-full overflow-hidden rounded-lg border bg-black"
      style={{ aspectRatio: "16 / 9" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
