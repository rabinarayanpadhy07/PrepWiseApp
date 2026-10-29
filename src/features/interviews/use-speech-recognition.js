import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Browser speech-to-text for voice answers (Web Speech API).
 *
 * States:
 *   unsupported - the browser has no speech recognition or microphone API
 *   idle        - supported; microphone permission not requested yet
 *   requesting  - waiting for the user to answer the browser's permission prompt
 *   denied      - microphone permission refused or blocked
 *   ready       - permission granted; ready to record
 *   listening   - recognition started, waiting for speech
 *   recording   - speech detected and being transcribed
 *   processing  - stopped; waiting for the final transcript
 *   complete    - transcript available
 *   error       - something failed (see `error`)
 */

export const VOICE_ERRORS = {
  denied: {
    code: "denied",
    message:
      "Microphone access is blocked. Allow microphone access for this site in your browser settings, then try again.",
  },
  noMicrophone: {
    code: "no_microphone",
    message: "We couldn't find a microphone. Connect one and try again.",
  },
  network: {
    code: "network",
    message:
      "Speech recognition needs a network connection and couldn't reach your browser's speech service. Check your connection, or type your answer instead.",
  },
  noSpeech: {
    code: "no_speech",
    message: "We didn't hear anything. Check your microphone and try again.",
  },
  serviceUnavailable: {
    code: "service_unavailable",
    message: "Your browser's speech recognition service isn't available. Type your answer instead.",
  },
  generic: {
    code: "unknown",
    message: "Recording stopped unexpectedly. Try again, or type your answer instead.",
  },
};

const RECOGNITION_ERRORS = {
  "not-allowed": VOICE_ERRORS.denied,
  "service-not-allowed": VOICE_ERRORS.serviceUnavailable,
  "audio-capture": VOICE_ERRORS.noMicrophone,
  network: VOICE_ERRORS.network,
  "no-speech": VOICE_ERRORS.noSpeech,
};

export function getSpeechRecognition() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isVoiceSupported() {
  return Boolean(
    getSpeechRecognition() &&
      typeof navigator !== "undefined" &&
      navigator.mediaDevices?.getUserMedia,
  );
}

function recognitionLanguage() {
  const language = typeof navigator !== "undefined" ? navigator.language : "";
  return language?.toLowerCase().startsWith("en") ? language : "en-US";
}

export function useSpeechRecognition({ maxSeconds = 180 } = {}) {
  const [status, setStatus] = useState(() => (isVoiceSupported() ? "idle" : "unsupported"));
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const errorRef = useRef(null);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(
    () => () => {
      clearTimer();
      recognitionRef.current?.abort?.();
    },
    [],
  );

  const requestPermission = useCallback(async () => {
    setError(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Only the permission was needed; recognition opens the microphone itself.
      stream.getTracks().forEach((track) => track.stop());
      setStatus("ready");
    } catch (permissionError) {
      const name = permissionError?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setStatus("denied");
        setError(VOICE_ERRORS.denied);
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setStatus("error");
        setError(VOICE_ERRORS.noMicrophone);
      } else {
        setStatus("error");
        setError(VOICE_ERRORS.generic);
      }
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    clearTimer();
    setStatus("processing");
    recognition.stop();
  }, []);

  const start = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setStatus("unsupported");
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = recognitionLanguage();

    finalRef.current = "";
    interimRef.current = "";
    errorRef.current = null;
    setTranscript("");
    setInterimText("");
    setElapsedSeconds(0);
    setError(null);

    recognition.onstart = () => {
      startedAtRef.current = Date.now();
      setStatus("listening");
      timerRef.current = setInterval(() => {
        const seconds = (Date.now() - startedAtRef.current) / 1000;
        setElapsedSeconds(Math.min(seconds, maxSeconds));
        if (seconds >= maxSeconds) stop();
      }, 250);
    };
    recognition.onspeechstart = () => {
      setStatus((current) => (current === "listening" ? "recording" : current));
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) {
          finalRef.current = `${finalRef.current} ${result[0].transcript}`.trim();
        } else {
          interim += result[0].transcript;
        }
      }
      interimRef.current = interim;
      setTranscript(finalRef.current);
      setInterimText(interim);
      setStatus((current) => (current === "listening" ? "recording" : current));
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      errorRef.current = RECOGNITION_ERRORS[event.error] ?? VOICE_ERRORS.generic;
    };
    recognition.onend = () => {
      clearTimer();
      recognitionRef.current = null;
      if (startedAtRef.current) {
        setElapsedSeconds(Math.min((Date.now() - startedAtRef.current) / 1000, maxSeconds));
      }
      const text = `${finalRef.current} ${interimRef.current}`.trim();
      setTranscript(text);
      setInterimText("");

      const failure = errorRef.current;
      if (failure && !(failure === VOICE_ERRORS.noSpeech && text)) {
        setError(failure);
        setStatus(failure === VOICE_ERRORS.denied ? "denied" : "error");
      } else if (!text) {
        setError(VOICE_ERRORS.noSpeech);
        setStatus("error");
      } else {
        setStatus("complete");
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setError(VOICE_ERRORS.generic);
      setStatus("error");
    }
  }, [maxSeconds, stop]);

  const reset = useCallback(() => {
    clearTimer();
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
    finalRef.current = "";
    interimRef.current = "";
    setTranscript("");
    setInterimText("");
    setElapsedSeconds(0);
    setError(null);
    setStatus(isVoiceSupported() ? "ready" : "unsupported");
  }, []);

  return {
    status,
    error,
    transcript,
    interimText,
    elapsedSeconds,
    /** Whole seconds to report to the server (at least 1). */
    recordedSeconds: Math.max(1, Math.ceil(elapsedSeconds)),
    requestPermission,
    start,
    stop,
    reset,
  };
}
