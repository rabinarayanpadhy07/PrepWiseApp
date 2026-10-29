import { Keyboard, Mic, Send } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { ErrorMessage, FieldError } from "@/components/feedback/error-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isVoiceSupported } from "@/features/interviews/use-speech-recognition";
import { VoiceRecorder } from "@/features/interviews/voice-recorder";
import { draftKey as makeDraftKey, readDraft, writeDraft } from "@/lib/drafts";

export const MAX_ANSWER_CHARS = 8000;

function AnswerPanel({ sessionId, question, mode, maxVoiceSeconds, isSubmitting, error, onSubmit }) {
  const textareaId = useId();
  const draftKey = makeDraftKey(sessionId, question.position);
  const voiceAvailable = mode === "voice" && isVoiceSupported();
  const [inputMode, setInputMode] = useState(voiceAvailable ? "voice" : "text");
  const [text, setText] = useState(() => readDraft(draftKey));
  const [voiceSeconds, setVoiceSeconds] = useState(null);
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    writeDraft(draftKey, text);
  }, [draftKey, text]);

  const handleTranscript = useCallback((transcript, seconds) => {
    setText(transcript);
    setVoiceSeconds(seconds);
    setValidationError(null);
  }, []);

  const recorded = inputMode === "voice" && voiceSeconds !== null;
  const showTextarea = inputMode === "text" || recorded;

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) {
      setValidationError(
        inputMode === "voice" ? "Record your answer, or switch to typing." : "Write your answer before submitting.",
      );
      return;
    }
    if (trimmed.length > MAX_ANSWER_CHARS) {
      setValidationError(`Answers can be at most ${MAX_ANSWER_CHARS.toLocaleString("en-IN")} characters.`);
      return;
    }
    onSubmit({
      text: trimmed,
      inputMode: recorded ? "voice" : "text",
      voiceSeconds: recorded ? voiceSeconds : null,
    });
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {mode === "voice" ? (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Answer method">
          <Button
            type="button"
            size="sm"
            variant={inputMode === "voice" ? "secondary" : "outline"}
            aria-pressed={inputMode === "voice"}
            onClick={() => setInputMode("voice")}
          >
            <Mic aria-hidden="true" />
            Speak
          </Button>
          <Button
            type="button"
            size="sm"
            variant={inputMode === "text" ? "secondary" : "outline"}
            aria-pressed={inputMode === "text"}
            onClick={() => {
              setInputMode("text");
              setVoiceSeconds(null);
            }}
          >
            <Keyboard aria-hidden="true" />
            Type
          </Button>
        </div>
      ) : null}

      {inputMode === "voice" ? (
        <VoiceRecorder
          maxSeconds={maxVoiceSeconds}
          onTranscript={handleTranscript}
          onUseTyping={() => setInputMode("text")}
          disabled={isSubmitting}
        />
      ) : null}

      {showTextarea ? (
        <div className="grid gap-2">
          <Label htmlFor={textareaId}>
            {recorded ? "Transcript (check and correct it before submitting)" : "Your answer"}
          </Label>
          <Textarea
            id={textareaId}
            rows={8}
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setValidationError(null);
            }}
            disabled={isSubmitting}
            aria-invalid={validationError ? true : undefined}
            aria-describedby={`${textareaId}-count${validationError ? ` ${textareaId}-error` : ""}`}
            placeholder={recorded ? undefined : "Answer as you would in a real interview."}
          />
          <p id={`${textareaId}-count`} className="text-right text-xs text-muted-foreground">
            {text.length.toLocaleString("en-IN")} / {MAX_ANSWER_CHARS.toLocaleString("en-IN")}
          </p>
        </div>
      ) : null}

      <FieldError id={`${textareaId}-error`}>{validationError}</FieldError>
      {error ? (
        <ErrorMessage
          title="Your answer wasn't submitted"
          error={error}
          message={error.details ? Object.values(error.details).flat().join(" ") : undefined}
        />
      ) : null}

      <Button type="submit" isLoading={isSubmitting} disabled={inputMode === "voice" && !recorded}>
        {isSubmitting ? null : <Send aria-hidden="true" />}
        Submit answer
      </Button>
    </form>
  );
}

export { AnswerPanel };
