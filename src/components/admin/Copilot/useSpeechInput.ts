"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SpeechLang = "uk-UA" | "en-US";

interface SpeechAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  item?: (index: number) => SpeechAlternativeLike | null;
  readonly 0?: SpeechAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  item?: (index: number) => SpeechRecognitionResultLike | null;
  [index: number]: SpeechRecognitionResultLike | undefined;
}

interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorLike {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

function resultAt(
  list: SpeechRecognitionResultListLike,
  index: number
): SpeechRecognitionResultLike | undefined {
  return list.item?.(index) ?? list[index];
}

function transcriptOf(result: SpeechRecognitionResultLike | undefined): string {
  if (!result) return "";
  return result.item?.(0)?.transcript ?? result[0]?.transcript ?? "";
}

function joinParts(...parts: Array<string | undefined>): string {
  return parts
    .map((part) => part?.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

interface UseSpeechInputArgs {
  /** Live composer value — snapshotted when recording starts, never closed over. */
  input: string;
  /** Called on every interim and final slice so the textarea streams live. */
  onTranscript: (fullText: string) => void;
  /** Stop listening when the drawer closes so the mic does not stay hot. */
  enabled?: boolean;
}

export function useSpeechInput({
  input,
  onTranscript,
  enabled = true,
}: UseSpeechInputArgs) {
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lang, setLang] = useState<SpeechLang>("uk-UA");

  useEffect(() => {
    setIsSupported(isSpeechRecognitionSupported());
  }, []);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef("");
  const finalAccumulatedRef = useRef("");
  const lastEmittedRef = useRef("");
  const wantListeningRef = useRef(false);
  const startIdRef = useRef(0);
  const inputRef = useRef(input);
  const onTranscriptRef = useRef(onTranscript);

  inputRef.current = input;
  onTranscriptRef.current = onTranscript;

  const emit = useCallback((interimTranscript = "") => {
    const nextText = joinParts(
      baseTextRef.current,
      finalAccumulatedRef.current,
      interimTranscript
    );
    lastEmittedRef.current = nextText;
    onTranscriptRef.current(nextText);
  }, []);

  const stop = useCallback(() => {
    startIdRef.current += 1;
    wantListeningRef.current = false;
    const recognition = recognitionRef.current;
    if (!recognition) {
      setIsListening(false);
      return;
    }
    // stop() (not abort()) lets the engine flush a last final result.
    try {
      recognition.stop();
    } catch (error) {
      console.warn("[SpeechRecognition] stop failed:", error);
      setIsListening(false);
    }
  }, []);

  const start = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor || !enabled) return;

    const startId = ++startIdRef.current;

    const existing = recognitionRef.current;
    if (existing) {
      try {
        existing.stop();
      } catch {
        // already stopped
      }
      recognitionRef.current = null;
    }

    // Chrome on localhost often starts recognition before the OS has handed
    // over the capture device, which surfaces as a silent `no-speech`. A
    // short getUserMedia handshake wakes the hardware and prompts permission;
    // tracks are released immediately so SpeechRecognition can own the mic.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.error("[SpeechRecognition] Mic access denied:", error);
      if (startIdRef.current === startId) {
        wantListeningRef.current = false;
        setIsListening(false);
      }
      return;
    }

    if (startIdRef.current !== startId || !enabled) return;

    baseTextRef.current = inputRef.current;
    finalAccumulatedRef.current = "";
    lastEmittedRef.current = inputRef.current;
    wantListeningRef.current = true;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = resultAt(event.results, i);
        const text = transcriptOf(result);
        if (result?.isFinal) {
          finalTranscript += text;
        } else {
          interimTranscript += text;
        }
      }

      if (finalTranscript) {
        finalAccumulatedRef.current = joinParts(
          finalAccumulatedRef.current,
          finalTranscript
        );
      }

      emit(interimTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === "no-speech" || event.error === "aborted") {
        // Silence timeout is expected; onend decides whether listening stops.
        return;
      }
      if (event.error === "not-allowed" || event.error === "audio-capture") {
        console.error(
          "[SpeechRecognition] microphone unavailable:",
          event.error
        );
      } else {
        console.warn("[SpeechRecognition] error:", event.error);
      }
      wantListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
      wantListeningRef.current = false;
      // Commit the last assembled string in case the final slice raced stop().
      if (lastEmittedRef.current) {
        onTranscriptRef.current(lastEmittedRef.current);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.lang = lang;
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.warn("[SpeechRecognition] start failed:", error);
      wantListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [enabled, emit, lang]);

  const toggleListening = useCallback(() => {
    if (isListening) stop();
    else void start();
  }, [isListening, start, stop]);

  const toggleLang = useCallback(() => {
    setLang((current) => (current === "uk-UA" ? "en-US" : "uk-UA"));
  }, []);

  const prevLangRef = useRef(lang);
  useEffect(() => {
    if (prevLangRef.current === lang) return;
    prevLangRef.current = lang;
    if (wantListeningRef.current) void start();
  }, [lang, start]);

  useEffect(() => {
    if (!enabled && isListening) stop();
  }, [enabled, isListening, stop]);

  useEffect(
    () => () => {
      startIdRef.current += 1;
      wantListeningRef.current = false;
      const recognition = recognitionRef.current;
      if (!recognition) return;
      try {
        recognition.stop();
      } catch {
        // already stopped
      }
    },
    []
  );

  return {
    isSupported,
    isListening,
    lang,
    toggleLang,
    toggleListening,
    stop,
  };
}
