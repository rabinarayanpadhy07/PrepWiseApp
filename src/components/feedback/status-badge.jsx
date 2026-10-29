import { Badge } from "@/components/ui/badge";

const STATUSES = {
  completed: { label: "Completed", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  pending: { label: "In progress", variant: "neutral" },
  in_progress: { label: "In progress", variant: "default" },
};

function StatusBadge({ status }) {
  const config = STATUSES[status] ?? { label: status, variant: "neutral" };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export { StatusBadge };
