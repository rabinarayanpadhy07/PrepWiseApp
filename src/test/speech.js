import { vi } from "vitest";

/** Minimal stand-in for the browser's SpeechRecognition. */
export class FakeRecognition {
  static instances = [];

  constructor() {
    FakeRecognition.instances.push(this);
  }

  static get latest() {
    return FakeRecognition.instances.at(-1);
  }

  start() {
    this.started = true;
    this.onstart?.();
  }

  stop() {
    this.stopped = true;
    this.onend?.();
  }

  abort() {
    this.aborted = true;
  }

  /** results: [{ transcript, isFinal }] */
  emitResults(results, resultIndex = 0) {
    const list = results.map(({ transcript, isFinal }) => {
      const alternative = [{ transcript }];
      alternative.isFinal = isFinal;
      return alternative;
    });
    this.onresult?.({ resultIndex, results: list });
  }

  emitError(error) {
    this.onerror?.({ error });
  }
}

export function installSpeech({ permission = "granted" } = {}) {
  FakeRecognition.instances = [];
  window.SpeechRecognition = FakeRecognition;
  const track = { stop: vi.fn() };
  const getUserMedia =
    permission === "granted"
      ? vi.fn().mockResolvedValue({ getTracks: () => [track] })
      : vi.fn().mockRejectedValue(Object.assign(new Error("denied"), { name: permission }));
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  return { getUserMedia, track };
}

export function uninstallSpeech() {
  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
}
