// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LISTEN_TIMEOUT_MS, mapVoiceError, useVoiceSearch, type SpeechRecognitionLike } from "@/lib/voice";
import { SearchIndex, isConfident } from "@/domain/search/search";
import { realIndex } from "./fixtures";

class FakeRecognition implements SpeechRecognitionLike {
  static last: FakeRecognition | null = null;
  lang = "";
  continuous = true;
  interimResults = true;
  maxAlternatives = 1;
  onresult: SpeechRecognitionLike["onresult"] = null;
  onerror: SpeechRecognitionLike["onerror"] = null;
  onend: SpeechRecognitionLike["onend"] = null;
  started = false;
  aborted = false;
  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    this.started = true;
  }
  stop() {}
  abort() {
    this.aborted = true;
  }
  emit(alts: string[]) {
    const result = Object.assign(alts.map((t) => ({ transcript: t, confidence: 0.8 })), { isFinal: true });
    this.onresult?.({ results: Object.assign([result], {}) as never });
    this.onend?.();
  }
}

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  vi.useRealTimers();
});

describe("voice search hook", () => {
  it("reports unsupported browsers", () => {
    const { result } = renderHook(() => useVoiceSearch());
    expect(result.current.supported).toBe(false);
    act(() => result.current.start());
    expect(result.current.error).toBe("unsupported");
  });

  it("listens in he-IL only after an explicit start and returns all alternatives", () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const { result } = renderHook(() => useVoiceSearch("he-IL"));
    expect(result.current.supported).toBe(true);
    expect(FakeRecognition.last).toBeNull();
    act(() => result.current.start());
    const rec = FakeRecognition.last!;
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe("he-IL");
    expect(rec.maxAlternatives).toBe(5);
    expect(result.current.state).toBe("listening");
    act(() => rec.emit(["רייקוואזה", "ריי קוואזה"]));
    expect(result.current.state).toBe("done");
    expect(result.current.transcripts).toEqual(["רייקוואזה", "ריי קוואזה"]);
  });

  it("handles permission denial, cancel and timeout", () => {
    vi.useFakeTimers();
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const { result } = renderHook(() => useVoiceSearch());
    act(() => result.current.start());
    act(() => FakeRecognition.last!.onerror?.({ error: "not-allowed" }));
    expect(result.current.error).toBe("denied");
    act(() => result.current.start());
    act(() => result.current.cancel());
    expect(result.current.state).toBe("idle");
    expect(FakeRecognition.last!.aborted).toBe(true);
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(LISTEN_TIMEOUT_MS + 10));
    expect(result.current.error).toBe("timeout");
  });

  it("maps browser error codes", () => {
    expect(mapVoiceError("no-speech")).toBe("no-speech");
    expect(mapVoiceError("service-not-allowed")).toBe("denied");
    expect(mapVoiceError("network")).toBe("network");
  });
});

describe("voice transcripts go through the same search", () => {
  const si = new SearchIndex(realIndex());
  it.each([
    [["רייקוואזה"], "Rayquaza"],
    [["מיו טו", "מיוטו"], "Mewtwo"],
    [["פיקאצו"], "Pikachu"],
    [["צ'אריזרד"], "Charizard"],
    [["גיאראדוס"], "Gyarados"],
    [["לוגיה"], "Lugia"],
    [["דרגונייט"], "Dragonite"],
    [["mewtwo"], "Mewtwo"],
    [["גרצ'ומפ"], "Garchomp"],
    [["סנורלקס"], "Snorlax"],
  ])("%j -> %s", (alts, expected) => {
    expect(si.searchMany(alts)[0]?.species.name.en).toBe(expected);
  });
  it("offers several candidates for ambiguous / imperfect recognition", () => {
    const hits = si.searchMany(["מיו"]);
    expect(hits.length).toBeGreaterThan(1);
    expect(isConfident(hits)).toBe(false);
  });
  it("returns no candidates for unrecognized speech", () => {
    expect(si.searchMany(["שלום מה נשמע היום"])).toHaveLength(0);
  });
});
