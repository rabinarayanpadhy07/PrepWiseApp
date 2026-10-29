import { Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

function speechSynthesisAvailable() {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

/** Reads the question aloud with the browser's built-in speech synthesis, where available. */
function ReadAloudButton({ text }) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(
    () => () => {
      if (speechSynthesisAvailable()) window.speechSynthesis.cancel();
    },
    [],
  );

  if (!speechSynthesisAvailable()) return null;

  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={toggle} aria-pressed={speaking}>
      {speaking ? <Square aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      {speaking ? "Stop reading" : "Read aloud"}
    </Button>
  );
}

export { ReadAloudButton };
