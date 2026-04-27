"use client";

/**
 * RecordingPlayer — collapsible YouTube embed wrapped in Plyr.
 *
 * Why Plyr (not the bare YouTube iframe): Plyr replaces YouTube's native
 * control bar with its own custom controls. That means the YouTube
 * wordmark, the "share / copy link" chain icon, and the on-pause
 * "Watch on YouTube" overlay all stop being part of the player UI —
 * Plyr's own controls sit on top of the iframe and there's no surface
 * the student can click to leak the URL.
 *
 * Defenses delivered:
 *   - Custom controls (no YouTube branding visible at all)
 *   - youtube-nocookie.com privacy domain
 *   - Lazy mount (Plyr only initialises once the student clicks Watch)
 *   - Iframe destroyed on close so the URL leaves the live DOM
 *   - Right-click suppressed on the wrapper AND in Plyr's
 *     `disableContextMenu` option
 *   - Picture-in-picture and airplay buttons not in the controls list
 *
 * What it does NOT defend against (browser tech limit):
 *   - DevTools inspection of the live iframe src once Plyr has booted.
 *     Anyone with DevTools open can read the src. The lazy mount +
 *     destroy-on-close raises the bar but cannot eliminate it. Full
 *     mitigation requires DRM (Mux / Cloudflare Stream / Vimeo OTT).
 *   - OS-level screen recording / screenshot. Impossible on any web
 *     platform without DRM.
 *
 * For non-YouTube URLs (Zoom, Drive, Vimeo, ...) the component renders
 * the `children` prop unchanged so each call site keeps its own link
 * UI.
 */
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { extractYouTubeId } from "@/lib/video-helpers";
import "plyr/dist/plyr.css";

interface Props {
  url: string;
  /**
   * Lesson title shown in our own overlay strip at the top of the
   * player — covers YouTube's clickable title/channel overlay (which
   * navigates to youtube.com when clicked).
   */
  title?: string;
  /**
   * Rendered when `url` is NOT a YouTube URL — typically a "Watch
   * recording" link button. Lets non-YouTube call sites work as before.
   */
  children?: React.ReactNode;
}

// Plyr brand override — match the LMS primary colour for the progress
// bar and accents (default is YouTube red).
const PLYR_THEME: CSSProperties = {
  // Plyr's CSS variables — strings, applied via inline style.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ["--plyr-color-main" as any]: "#8b1a4a",
};

export function RecordingPlayer({ url, title, children }: Props) {
  // Hooks must be unconditional — keep above any early return.
  const [isOpen, setIsOpen] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);

  const id = extractYouTubeId(url);

  // Boot Plyr when the player opens; tear it down when it closes (or
  // the component unmounts). This is what removes the iframe URL from
  // the live DOM after the student clicks Hide.
  useEffect(() => {
    if (!isOpen || !id || !mountRef.current) return;

    let cancelled = false;
    const host = mountRef.current;

    (async () => {
      // Dynamic import keeps Plyr (~15 KB) out of the initial JS bundle.
      const Plyr = (await import("plyr")).default;
      if (cancelled || !host) return;

      // Plyr discovers YouTube videos via a div with these data attrs;
      // it then constructs the iframe internally with our youtube
      // options applied.
      const target = document.createElement("div");
      target.setAttribute("data-plyr-provider", "youtube");
      target.setAttribute("data-plyr-embed-id", id);
      host.replaceChildren(target);

      playerRef.current = new Plyr(target, {
        controls: [
          "play-large",
          "play",
          "rewind",
          "fast-forward",
          "progress",
          "current-time",
          "duration",
          "mute",
          "volume",
          "captions",
          "settings",
          "fullscreen",
        ],
        settings: ["captions", "speed"],
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
        seekTime: 10,
        keyboard: { focused: true, global: false },
        tooltips: { controls: true, seek: true },
        clickToPlay: true,
        hideControls: true,
        disableContextMenu: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        youtube: {
          noCookie: true,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          playsinline: 1,
        } as any,
      });
    })();

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore destroy errors (e.g. when iframe was never attached)
        }
        playerRef.current = null;
      }
      // Wipe any DOM remnants — guarantees URL leaves the live DOM.
      if (host) host.replaceChildren();
    };
  }, [isOpen, id]);

  if (!id) return <>{children}</>;

  return (
    <div className="w-full space-y-3" style={PLYR_THEME}>
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
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={mountRef} className="plyr__video-embed" />

          {/* Top title strip — covers YouTube's clickable
              title/channel overlay (which navigates to youtube.com on
              click) and shows our own non-clickable label instead.
              pointer-events:none lets pause/seek-on-tap fall through
              to the player below. */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black via-black/85 to-transparent px-4 pt-3 pb-10"
            aria-hidden="true"
          >
            <p className="line-clamp-1 text-sm font-semibold text-white sm:text-base">
              {title ?? "Class recording"}
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              Nisa Al-Huda
            </p>
          </div>

          {/* Bottom-right cover — opaque tile over the YouTube
              wordmark that pokes through Plyr's controls bar in some
              builds. Sized + positioned to sit between Plyr's volume
              slider and the settings/fullscreen icons. Click events
              are swallowed so even if the wordmark text peeks out it
              isn't actionable. */}
          <div
            aria-hidden="true"
            tabIndex={-1}
            className="absolute z-30 bg-black"
            style={{ bottom: "8px", right: "70px", width: "90px", height: "32px" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />

          {/* Bottom-left cover — opaque tile over YouTube's
              "share / copy link" chain icon, which is rendered by
              YouTube outside Plyr's controls. */}
          <div
            aria-hidden="true"
            tabIndex={-1}
            className="absolute z-30 bg-black"
            style={{ bottom: "8px", left: "8px", width: "44px", height: "32px" }}
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
