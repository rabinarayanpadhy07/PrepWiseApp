import { Progress } from "@/components/ui/progress";

function InterviewProgress({ answered, total, currentPosition }) {
  const label = currentPosition
    ? `Question ${currentPosition} of ${total}`
    : `${answered} of ${total} questions answered`;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span id="interview-progress-label" className="font-medium">
          {label}
        </span>
        <span className="text-muted-foreground">{answered} answered</span>
      </div>
      <Progress value={answered} max={total} aria-labelledby="interview-progress-label" />
    </div>
  );
}

export { InterviewProgress };
