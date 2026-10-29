import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnswerPanel } from "@/features/interviews/answer-panel";
import { FakeRecognition, installSpeech, uninstallSpeech } from "@/test/speech";

const question = { position: 1, text: "Tell me about a conflict.", competency: "communication" };

function renderPanel(props = {}) {
  const onSubmit = vi.fn();
  render(
    <AnswerPanel
      sessionId={9}
      question={question}
      mode="voice"
      maxVoiceSeconds={120}
      isSubmitting={false}
      error={null}
      onSubmit={onSubmit}
      {...props}
    />,
  );
  return onSubmit;
}

afterEach(() => {
  uninstallSpeech();
  window.localStorage.clear();
});

describe("AnswerPanel (voice)", () => {
  it("records, lets the user correct the transcript, and submits it as a voice answer", async () => {
    installSpeech();
    const user = userEvent.setup();
    const onSubmit = renderPanel();

    await user.click(screen.getByRole("button", { name: "Allow microphone" }));
    await user.click(await screen.findByRole("button", { name: "Start recording" }));
    expect(screen.getByText("Listening. Start speaking.")).toBeInTheDocument();

    act(() => FakeRecognition.latest.emitResults([{ transcript: "We resolved it by talking", isFinal: true }]));
    expect(screen.getByText("Recording")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stop recording" }));

    const transcript = await screen.findByLabelText(/Transcript/);
    expect(transcript).toHaveValue("We resolved it by talking");
    await user.type(transcript, " directly.");
    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmit).toHaveBeenCalledWith({
      text: "We resolved it by talking directly.",
      inputMode: "voice",
      voiceSeconds: expect.any(Number),
    });
    expect(onSubmit.mock.calls[0][0].voiceSeconds).toBeGreaterThanOrEqual(1);
  });

  it("offers typing when microphone access is blocked", async () => {
    installSpeech({ permission: "NotAllowedError" });
    const user = userEvent.setup();
    const onSubmit = renderPanel();

    await user.click(screen.getByRole("button", { name: "Allow microphone" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Microphone access is blocked");
    await user.click(screen.getByRole("button", { name: "Type my answer instead" }));
    await user.type(screen.getByLabelText("Your answer"), "Typed instead.");
    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(onSubmit).toHaveBeenCalledWith({ text: "Typed instead.", inputMode: "text", voiceSeconds: null });
  });

  it("explains when the browser doesn't support voice", () => {
    uninstallSpeech();
    renderPanel();

    // Falls back to typing straight away.
    expect(screen.getByLabelText("Your answer")).toBeInTheDocument();
  });

  it("requires an answer before submitting", async () => {
    uninstallSpeech();
    const user = userEvent.setup();
    const onSubmit = renderPanel({ mode: "text" });

    await user.click(screen.getByRole("button", { name: "Submit answer" }));

    expect(screen.getByText("Write your answer before submitting.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
