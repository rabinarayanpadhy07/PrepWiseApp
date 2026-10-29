import { Mic, MicOff, RotateCcw, Square } from "lucide-react";
import { useEffect, useRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSpeechRecognition } from "@/features/interviews/use-speech-recognition";
import { formatClock, formatDuration } from "@/lib/format";

const STATUS_TEXT = {
  idle: "Microphone not enabled",
  requesting: "Waiting for microphone permission",
  ready: "Ready to record",
  listening: "Listening. Start speaking.",
  recording: "Recording",
  processing: "Processing your recording",
  complete: "Recording complete",
  denied: "Microphone access blocked",
  error: "Recording failed",
  unsupported: "Voice answers aren't supported in this browser",
};

const PRIVACY_NOTE =
  "Speech is converted to text by your browser. Some browsers, including Chrome, send the audio to their own speech service to do this. PrepWise receives only the text and the recording length.";

/**
 * Records a spoken answer and reports the transcript via `onTranscript(text, seconds)`.
 * `maxSeconds` comes from the backend (per-answer cap and remaining allowance).
 */
function VoiceRecorder({ maxSeconds, onTranscript, onUseTyping, disabled = false }) {
  const voice = useSpeechRecognition({ maxSeconds });
  const { status, error } = voice;
  const reportedRef = useRef(false);

  useEffect(() => {
    if (status === "complete" && !reportedRef.current) {
      reportedRef.current = true;
      onTranscript(voice.transcript, voice.recordedSeconds);
    }
    if (status !== "complete") reportedRef.current = false;
  }, [status, voice.transcript, voice.recordedSeconds, onTranscript]);

  if (status === "unsupported") {
    return (
      <Alert variant="info" role="status">
        <MicOff aria-hidden="true" />
        <AlertTitle>Voice answers aren't available in this browser</AlertTitle>
        <AlertDescription>
          <p>Use a recent version of Chrome, Edge or Safari to answer by voice, or type your answer.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={onUseTyping}>
            Type my answer instead
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const isActive = status === "listening" || status === "recording";
  const remaining = Math.max(0, maxSeconds - voice.elapsedSeconds);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-medium" aria-live="polite">
          {isActive ? (
            <span className="size-2.5 rounded-full bg-destructive" aria-hidden="true" />
          ) : null}
          {status === "requesting" || status === "processing" ? (
            <Spinner className="size-4" label={STATUS_TEXT[status]} />
          ) : null}
          <span>{STATUS_TEXT[status]}</span>
        </p>
        {isActive || status === "complete" ? (
          <p className="font-mono text-sm tabular-nums" aria-label="Recording time">
            {formatClock(voice.elapsedSeconds)} / {formatClock(maxSeconds)}
          </p>
        ) : null}
      </div>

      {status === "idle" || status === "requesting" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            To answer by voice, allow PrepWise to use your microphone. You can stop recording at
            any time, and you can edit the transcript before submitting.
          </p>
          <Button onClick={voice.requestPermission} isLoading={status === "requesting"} disabled={disabled}>
            {status === "requesting" ? null : <Mic aria-hidden="true" />}
            Allow microphone
          </Button>
        </div>
      ) : null}

      {status === "ready" ? (
        <div className="space-y-2">
          <Button onClick={voice.start} disabled={disabled || maxSeconds <= 0}>
            <Mic aria-hidden="true" />
            Start recording
          </Button>
          <p className="text-sm text-muted-foreground">
            You can record up to {formatDuration(maxSeconds)} for this answer.
          </p>
        </div>
      ) : null}

      {isActive ? (
        <div className="space-y-3">
          <Button variant="destructive" onClick={voice.stop}>
            <Square aria-hidden="true" />
            Stop recording
          </Button>
          {remaining <= 15 ? (
            <p className="text-sm text-destructive-text" role="status">
              Recording stops automatically in {Math.ceil(remaining)} seconds.
            </p>
          ) : null}
          {voice.transcript || voice.interimText ? (
            <p className="rounded-md bg-surface p-3 text-sm leading-6">
              {voice.transcript} <span className="text-muted-foreground">{voice.interimText}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {status === "complete" ? (
        <Button variant="outline" size="sm" onClick={voice.reset} disabled={disabled}>
          <RotateCcw aria-hidden="true" />
          Record again
        </Button>
      ) : null}

      {status === "denied" || status === "error" ? (
        <Alert variant="destructive" role="alert">
          <MicOff aria-hidden="true" />
          <AlertDescription>
            <p>{error?.message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={status === "denied" ? voice.requestPermission : voice.reset}
              >
                Try again
              </Button>
              <Button variant="outline" size="sm" onClick={onUseTyping}>
                Type my answer instead
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      <p className="text-xs leading-5 text-muted-foreground">{PRIVACY_NOTE}</p>
    </div>
  );
}

export { VoiceRecorder };
