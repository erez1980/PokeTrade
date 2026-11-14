"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hebrew voice search on top of the browser Web Speech API (SpeechRecognition / webkitSpeechRecognition).
 *  - Only starts on an explicit user tap.
 *  - We never access raw audio and store nothing; the browser returns text transcripts.
 *  - Note: some browsers (e.g. Chrome) send audio to their own speech service; this is disclosed in the UI.
 */

export type VoiceError = "denied" | "unsupported" | "no-speech" | "network" | "timeout" | "aborted" | "unknown";
export type VoiceState = "idle" | "listening" | "done" | "error";

interface SpeechRecognitionAlternativeLike { transcript: string; confidence: number }
interface SpeechRecognitionResultLike { length: number; [i: number]: SpeechRecognitionAlternativeLike; isFinal?: boolean }
interface SpeechRecognitionEventLike { results: { length: number; [i: number]: SpeechRecognitionResultLike } }
interface SpeechRecognitionErrorEventLike { error: string }
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type Ctor = new () => SpeechRecognitionLike;

export function getRecognitionCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function mapVoiceError(code: string): VoiceError {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
    case "audio-capture":
      return "denied";
    case "no-speech":
      return "no-speech";
    case "network":
      return "network";
    case "aborted":
      return "aborted";
    case "language-not-supported":
      return "unsupported";
    default:
      return "unknown";
  }
}

export const LISTEN_TIMEOUT_MS = 8000;

export function useVoiceSearch(lang: "he-IL" | "en-US" = "he-IL") {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<VoiceError | null>(null);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gotResult = useRef(false);

  useEffect(() => setSupported(!!getRecognitionCtor()), []);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };

  const cancel = useCallback(() => {
    clearTimer();
    try {
      recRef.current?.abort();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setState("idle");
    setError(null);
  }, []);

  const start = useCallback(() => {
    const C = getRecognitionCtor();
    if (!C) {
      setState("error");
      setError("unsupported");
      return;
    }
    cancel();
    const rec = new C();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 5;
    gotResult.current = false;
    rec.onresult = (e) => {
      gotResult.current = true;
      const out: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i]!;
        for (let j = 0; j < r.length; j++) {
          const t = r[j]?.transcript?.trim();
          if (t) out.push(t);
        }
      }
      clearTimer();
      setTranscripts(Array.from(new Set(out)).slice(0, 8));
      setState("done");
    };
    rec.onerror = (e) => {
      clearTimer();
      const code = mapVoiceError(e.error);
      if (code === "aborted") return;
      setError(code);
      setState("error");
    };
    rec.onend = () => {
      clearTimer();
      recRef.current = null;
      if (!gotResult.current) {
        setState((s) => (s === "listening" ? "error" : s));
        setError((er) => er ?? "no-speech");
      }
    };
    recRef.current = rec;
    setTranscripts([]);
    setError(null);
    setState("listening");
    try {
      rec.start();
    } catch {
      setState("error");
      setError("unknown");
      return;
    }
    timer.current = setTimeout(() => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      setError("timeout");
      setState("error");
    }, LISTEN_TIMEOUT_MS);
  }, [cancel, lang]);

  useEffect(() => () => cancel(), [cancel]);

  return { supported, state, error, transcripts, start, cancel };
}
