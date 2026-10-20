"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { Episode } from "@/lib/catalog";
import type { ContinueItem } from "./ContinueWatching";
import { fetchServerLists, syncProgressRemote } from "@/lib/clientLists";

const CONTINUE_KEY = "wd-continue";

function progressKey(slug: string, episode: number) {
  return `wd-progress:${slug}:${episode}`;
}

export default function Player({
  slug,
  titleName,
  episode,
}: {
  slug: string;
  titleName: string;
  episode: Episode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const lastSaveRef = useRef(0);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [levels, setLevels] = useState<Array<{ height: number }>>([]);
  const [quality, setQuality] = useState(-1); // -1 = auto
  const [subtitle, setSubtitle] = useState("off");
  const [status, setStatus] = useState("Loading…");
  const [resumedAt, setResumedAt] = useState<number | null>(null);

  const source = episode.sources[sourceIdx] ?? episode.sources[0];

  // Reset per-source UI state when the source changes (React's
  // render-time adjustment pattern — avoids setState inside the effect).
  const [prevSource, setPrevSource] = useState(source);
  if (prevSource !== source) {
    setPrevSource(source);
    setLevels([]);
    setQuality(-1);
    setStatus(
      source?.type === "mp4" ? "Ready" : `Loading ${source?.name ?? "source"}…`
    );
  }

  const saveProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || video.currentTime < 3) return;
    try {
      localStorage.setItem(
        progressKey(slug, episode.number),
        JSON.stringify({ t: video.currentTime, d: video.duration, at: Date.now() })
      );
      const list: ContinueItem[] = JSON.parse(
        localStorage.getItem(CONTINUE_KEY) ?? "[]"
      );
      const filtered = list.filter(
        (i) => !(i.slug === slug && i.episode === episode.number)
      );
      filtered.unshift({
        slug,
        episode: episode.number,
        progress: video.currentTime,
        duration: video.duration,
        updatedAt: Date.now(),
      });
      localStorage.setItem(CONTINUE_KEY, JSON.stringify(filtered.slice(0, 20)));
    } catch {
      /* storage unavailable */
    }
    // Phase 3: also sync to the account when logged in (fire-and-forget;
    // guests get a silent 401). Called from the throttled timeupdate path,
    // pause and unmount, so this stays a few requests per minute at most.
    syncProgressRemote({
      slug,
      episode: episode.number,
      position: video.currentTime,
      duration: video.duration,
    });
  }, [slug, episode.number]);

  // Attach the current source (HLS via hls.js, native HLS, or MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    hlsRef.current?.destroy();
    hlsRef.current = null;

    if (source.type === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(source.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLevels(hls.levels.map((l) => ({ height: l.height })));
          setStatus("Ready");
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setStatus(`Playback error (${data.type}). Try another server.`);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source.url; // Safari native HLS
        const onMeta = () => setStatus("Ready (native HLS)");
        video.addEventListener("loadedmetadata", onMeta, { once: true });
      } else {
        void Promise.resolve().then(() =>
          setStatus("HLS is not supported in this browser.")
        );
      }
    } else {
      video.src = source.url; // MP4 — status already set to "Ready" on switch
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [source]);

  // Resume position once metadata is available for this episode.
  // Phase 3: compare the local resume point with the server's (account)
  // progress for this title and use whichever is newer.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    async function onLoaded() {
      let localT = 0;
      let localAt = 0;
      try {
        const raw = localStorage.getItem(progressKey(slug, episode.number));
        if (raw) {
          const parsed = JSON.parse(raw);
          localT = Number(parsed.t) || 0;
          localAt = Number(parsed.at) || 0;
        }
      } catch {
        /* ignore */
      }
      let resumeT = localT;
      const lists = await fetchServerLists(); // null for guests
      if (cancelled) return;
      const serverEntry = lists?.progress[slug];
      if (serverEntry && serverEntry.episode === episode.number) {
        const serverMs = Date.parse(serverEntry.updatedAt) || 0;
        if (serverMs > localAt && serverEntry.position > 0) {
          resumeT = serverEntry.position;
        }
      }
      if (resumeT > 5 && video!.duration && resumeT < video!.duration - 15) {
        video!.currentTime = resumeT;
        setResumedAt(Math.round(resumeT));
      }
    }
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", onLoaded);
    };
  }, [slug, episode.number, source]);

  // Persist progress periodically + on pause/unmount
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onTime() {
      const now = Date.now();
      if (now - lastSaveRef.current > 3000) {
        lastSaveRef.current = now;
        saveProgress();
      }
    }
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", saveProgress);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", saveProgress);
      saveProgress();
    };
  }, [saveProgress]);

  function changeQuality(value: number) {
    setQuality(value);
    if (hlsRef.current) hlsRef.current.currentLevel = value;
  }

  function changeSubtitle(lang: string) {
    setSubtitle(lang);
    const video = videoRef.current;
    if (!video) return;
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      track.mode =
        lang !== "off" && (track.label === lang || track.language === lang)
          ? "showing"
          : "hidden";
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl bg-black ring-1 ring-white/10">
        <video
          ref={videoRef}
          controls
          playsInline
          className="aspect-video w-full"
          poster=""
          crossOrigin="anonymous"
        >
          {episode.subtitles.map((s) => (
            <track
              key={s.url + s.lang}
              kind="subtitles"
              label={s.lang}
              srcLang={s.lang.slice(0, 2).toLowerCase()}
              src={s.url}
            />
          ))}
        </video>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
        <span className="rounded bg-white/5 px-2 py-1">{status}</span>
        {resumedAt !== null && (
          <span className="rounded bg-emerald-500/15 px-2 py-1 text-emerald-300">
            Resumed from {Math.floor(resumedAt / 60)}:
            {String(resumedAt % 60).padStart(2, "0")}
          </span>
        )}
        <span className="rounded bg-amber-400/15 px-2 py-1 text-amber-300">
          Demo streams are SAMPLE public test streams — replace with your hosted files (see CONTENT.md)
        </span>
      </div>

      <div className="mt-4 grid gap-4 rounded-xl bg-zinc-900/70 p-4 ring-1 ring-white/10 sm:grid-cols-3">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Server / Source
          </p>
          <div className="flex flex-wrap gap-2">
            {episode.sources.map((s, i) => (
              <button
                key={s.name + i}
                onClick={() => setSourceIdx(i)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  i === sourceIdx
                    ? "bg-red-600 text-white"
                    : "bg-white/10 text-zinc-200 hover:bg-white/20"
                }`}
              >
                {s.name} · {s.type.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="mt-2 break-all text-[11px] text-zinc-500">{source?.url}</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Quality {levels.length === 0 && "(MP4 / single)"}
          </p>
          {levels.length > 0 ? (
            <select
              value={quality}
              onChange={(e) => changeQuality(Number(e.target.value))}
              className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white outline-none"
            >
              <option value={-1}>Auto</option>
              {levels.map((l, i) => (
                <option key={i} value={i}>
                  {l.height ? `${l.height}p` : `Level ${i + 1}`}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-zinc-500">
              Quality levels appear when an HLS stream with multiple renditions is playing.
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            Subtitles
          </p>
          <select
            value={subtitle}
            onChange={(e) => changeSubtitle(e.target.value)}
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white outline-none"
          >
            <option value="off">Off</option>
            {episode.subtitles.map((s) => (
              <option key={s.lang} value={s.lang}>
                {s.lang}
              </option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-zinc-500">
            {titleName} · Episode {episode.number}
          </p>
        </div>
      </div>
    </div>
  );
}
