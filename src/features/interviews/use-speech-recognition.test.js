import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isVoiceSupported,
  useSpeechRecognition,
  VOICE_ERRORS,
} from "@/features/interviews/use-speech-recognition";
import { FakeRecognition, installSpeech, uninstallSpeech } from "@/test/speech";

afterEach(() => {
  uninstallSpeech();
  vi.useRealTimers();
});

async function readyHook(options) {
  const hook = renderHook(() => useSpeechRecognition(options));
  await act(() => hook.result.current.requestPermission());
  return hook;
}

describe("useSpeechRecognition", () => {
  it("reports unsupported browsers", () => {
    uninstallSpeech();

    const { result } = renderHook(() => useSpeechRecognition());

    expect(isVoiceSupported()).toBe(false);
    expect(result.current.status).toBe("unsupported");
  });

  it("asks for microphone permission explicitly before recording", async () => {
    const { getUserMedia, track } = installSpeech();
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.status).toBe("idle");
    expect(getUserMedia).not.toHaveBeenCalled();

    await act(() => result.current.requestPermission());

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(track.stop).toHaveBeenCalled(); // the probe stream is released immediately
    expect(result.current.status).toBe("ready");
  });

  it("handles denied permission", async () => {
    installSpeech({ permission: "NotAllowedError" });

    const { result } = await readyHook();

    expect(result.current.status).toBe("denied");
    expect(result.current.error).toBe(VOICE_ERRORS.denied);
  });

  it("handles a missing microphone", async () => {
    installSpeech({ permission: "NotFoundError" });

    const { result } = await readyHook();

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(VOICE_ERRORS.noMicrophone);
  });

  it("moves through listening, recording, processing and complete", async () => {
    installSpeech();
    vi.useFakeTimers();
    const { result } = await readyHook();

    act(() => result.current.start());
    expect(result.current.status).toBe("listening");

    act(() => FakeRecognition.latest.onspeechstart());
    expect(result.current.status).toBe("recording");

    act(() => {
      FakeRecognition.latest.emitResults([{ transcript: "I led the migration", isFinal: true }]);
      FakeRecognition.latest.emitResults(
        [
          { transcript: "I led the migration", isFinal: true },
          { transcript: "to Kubernetes", isFinal: false },
        ],
        1,
      );
    });
    expect(result.current.transcript).toBe("I led the migration");
    expect(result.current.interimText).toBe("to Kubernetes");

    act(() => vi.advanceTimersByTime(12_400));
    act(() => result.current.stop());

    expect(result.current.status).toBe("complete");
    expect(result.current.transcript).toBe("I led the migration to Kubernetes");
    expect(result.current.recordedSeconds).toBe(13);
  });

  it("stops automatically at the maximum length", async () => {
    installSpeech();
    vi.useFakeTimers();
    const { result } = await readyHook({ maxSeconds: 30 });

    act(() => result.current.start());
    act(() => FakeRecognition.latest.emitResults([{ transcript: "A long answer", isFinal: true }]));
    act(() => vi.advanceTimersByTime(31_000));

    expect(FakeRecognition.latest.stopped).toBe(true);
    expect(result.current.status).toBe("complete");
    expect(result.current.recordedSeconds).toBe(30);
  });

  it("reports network failures from the speech service", async () => {
    installSpeech();
    const { result } = await readyHook();

    act(() => result.current.start());
    act(() => {
      FakeRecognition.latest.emitError("network");
      FakeRecognition.latest.onend();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(VOICE_ERRORS.network);
  });

  it("reports silence instead of an empty transcript", async () => {
    installSpeech();
    const { result } = await readyHook();

    act(() => result.current.start());
    act(() => result.current.stop());

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe(VOICE_ERRORS.noSpeech);
  });

  it("treats a recognition permission error as denied", async () => {
    installSpeech();
    const { result } = await readyHook();

    act(() => result.current.start());
    act(() => {
      FakeRecognition.latest.emitError("not-allowed");
      FakeRecognition.latest.onend();
    });

    expect(result.current.status).toBe("denied");
  });

  it("can record again after completing", async () => {
    installSpeech();
    const { result } = await readyHook();
    act(() => result.current.start());
    act(() => FakeRecognition.latest.emitResults([{ transcript: "First try", isFinal: true }]));
    act(() => result.current.stop());

    act(() => result.current.reset());

    expect(result.current.status).toBe("ready");
    expect(result.current.transcript).toBe("");
  });
});
