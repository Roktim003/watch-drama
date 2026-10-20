"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { Episode } from "@/lib/catalog";
import type { ContinueItem } from "./ContinueWatching";

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
  }, [slug, episode.number]);

  // Attach the current source (HLS via hls.js, native HLS, or MP4)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;
    setLevels([]);
    setQuality(-1);
    setStatus(`Loading ${source.name}…`);
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
        setStatus("Ready (native HLS)");
      } else {
        setStatus("HLS is not supported in this browser.");
      }
    } else {
      video.src = source.url;
      setStatus("Ready");
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [source]);

  // Resume position once metadata is available for this episode
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    function onLoaded() {
      try {
        const raw = localStorage.getItem(progressKey(slug, episode.number));
        if (!raw) return;
        const { t, d } = JSON.parse(raw);
        if (t > 5 && video!.duration && t < video!.duration - 15) {
          video!.currentTime = t;
          setResumedAt(Math.round(t));
        }
        void d;
      } catch {
        /* ignore */
      }
    }
    video.addEventListener("loadedmetadata", onLoaded);
    return () => video.removeEventListener("loadedmetadata", onLoaded);
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
