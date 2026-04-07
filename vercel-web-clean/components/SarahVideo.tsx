"use client";

import { useEffect, useRef, useState } from "react";

type SarahVideoProps = {
  src: string;
  title: string;
  loop?: boolean;
  onEnded?: () => void;
  onError?: () => void;
};

export default function SarahVideo({ src, title, loop = true, onEnded, onError }: SarahVideoProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryAutoplay = async () => {
      video.muted = false;
      setIsMuted(false);
      setNeedsUserGesture(false);

      try {
        await video.play();
      } catch {
        video.muted = true;
        setIsMuted(true);
        setNeedsUserGesture(true);
        try {
          await video.play();
        } catch {
          // Ignore if browser still blocks playback.
        }
      }
    };

    void tryAutoplay();
  }, [src]);

  useEffect(() => {
    if (!needsUserGesture) return;

    const unlockAudio = async () => {
      const video = videoRef.current;
      if (!video) return;

      video.muted = false;
      setIsMuted(false);
      setNeedsUserGesture(false);
      try {
        await video.play();
      } catch {
        video.muted = true;
        setIsMuted(true);
      }
    };

    const handleFirstInteraction = () => {
      void unlockAudio();
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };

    window.addEventListener("pointerdown", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });
    window.addEventListener("touchstart", handleFirstInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("touchstart", handleFirstInteraction);
    };
  }, [needsUserGesture]);

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[2rem] border border-[#E0E0E0] bg-white p-3 shadow-[0_18px_55px_rgba(26,26,26,0.1)] md:max-w-[420px] lg:ml-auto">
      <div className="absolute inset-0 bg-white" aria-hidden="true" />
      <video
        ref={videoRef}
        key={src}
        className="relative z-10 aspect-[4/5] w-full rounded-[1.5rem] bg-white object-cover"
        src={src}
        title={title}
        autoPlay
        loop={loop}
        muted={isMuted}
        playsInline
        controls={false}
        onEnded={onEnded}
        onError={onError}
      >
        <track kind="captions" />
      </video>
      <button
        type="button"
        onClick={handleToggleMute}
        className="absolute bottom-6 right-6 z-20 rounded-full border border-white/45 bg-black/45 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
      >
        {isMuted ? "Unmute" : "Mute"}
      </button>
      {needsUserGesture && (
        <p className="absolute bottom-6 left-6 z-20 rounded-full border border-white/35 bg-black/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          Tap to enable sound
        </p>
      )}
    </div>
  );
}
