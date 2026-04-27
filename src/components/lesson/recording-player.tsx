"use client";

/**
 * RecordingPlayer — collapsible YouTube embed for class recordings.
 *
 * For a YouTube URL: renders a "Watch recording ▼" button. Clicking it
 * mounts an inline 16:9 iframe below. Clicking again unmounts the
 * iframe. Because the iframe is mounted lazily, the YouTube URL is NOT
 * in the page's initial DOM — View Source on the page shows only the
 * button, not the recording URL.
 *
 * Defenses against casual link extraction:
 *   - youtube-nocookie.com privacy-enhanced embed domain
 *   - lazy mount (URL not in initial DOM; closing unmounts and removes
 *     it from the live DOM too)
 *   - context menu (right-click) suppressed on the wrapper
 *   - picture-in-picture disabled (no popout window)
 *   - clipboard-write disabled (YouTube's Share button can't copy)
 *   - modestbranding + rel=0 + iv_load_policy=3 (clean, no related videos
 *     or annotations)
 *
 * What it does NOT block (browser-tech limitations, document for honesty):
 *   - DevTools inspection of the iframe src after the user opens the
 *     player. Mitigated by lazy mount + immediate unmount on close.
 *   - OS-level screen recording / screenshot. Impossible to prevent on
 *     any web platform without DRM.
 *   - Clicking the small YouTube logo in the player's controls bar
 *     (it can navigate to youtube.com). modestbranding hides it on
 *     most modern Chromium versions but YouTube has been deprecating
 *     this — full removal needs a paid DRM player.
 *
 * For non-YouTube URLs (Zoom, Drive, Vimeo, etc.) the component renders
 * the `children` prop unchanged — letting each call site keep its own
 * existing "Watch" link button styling.
 */
import { useState } from "react";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { extractYouTubeId } from "@/lib/video-helpers";

interface Props {
  url: string;
  /**
   * Rendered when `url` is NOT a YouTube URL — typically a "Watch
   * recording" link button. Lets non-YouTube call sites keep working
   * without changes.
   */
  children?: React.ReactNode;
  /** Accessible iframe title. Defaults to "Class recording". */
  title?: string;
}

export function RecordingPlayer({ url, children, title = "Class recording" }: Props) {
  // Hook must be called unconditionally — keep above any early return.
  const [isOpen, setIsOpen] = useState(false);

  const id = extractYouTubeId(url);
  if (!id) return <>{children}</>;

  // Embed URL only used after the user clicks open; never rendered
  // when isOpen is false.
  const src = `https://www.youtube-nocookie.com/embed/${id}?modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`;

  return (
    <div className="w-full space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-medium px-4 py-2 transition-colors press"
      >
        <PlayCircle className="h-4 w-4" />
        <span>{isOpen ? "Hide recording" : "Watch recording"}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div
          className="relative w-full overflow-hidden rounded-lg border bg-black"
          style={{ aspectRatio: "16 / 9" }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <iframe
            src={src}
            title={title}
            // Minimal allow list. Drops picture-in-picture (popout window
            // would expose the URL) and clipboard-write (YouTube's share
            // button copy). Keeps autoplay/fullscreen/encrypted-media for
            // normal playback.
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 h-full w-full"
          />

          {/* Branding occluders — opaque black overlays sized to cover the
              YouTube share/link icon (bottom-left) and YouTube wordmark
              (bottom-right). Each overlay sits ABOVE the iframe and
              swallows clicks, so students can't open them. They're sized
              to clear the timeline scrubber and the fullscreen button
              respectively.

              Note: positions reflect YouTube's current embed UI. If
              YouTube reshuffles its controls these may need re-tuning. */}
          <div
            aria-hidden="true"
            tabIndex={-1}
            className="absolute bottom-0 left-0 z-20 bg-black"
            style={{ width: "60px", height: "40px" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          <div
            aria-hidden="true"
            tabIndex={-1}
            className="absolute bottom-0 z-20 bg-black"
            style={{ right: "50px", width: "130px", height: "40px" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      )}
    </div>
  );
}
