import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

// Single-series charts use the brand primary (validated: contrast >= 3:1 on the surface).
const SERIES = "var(--primary)";
const GRID = "var(--border)";
const AXIS_TEXT = { fill: "var(--muted-foreground)", fontSize: 12 };

function ChartTooltip({ active, payload, label, formatLabel }) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{formatLabel ? formatLabel(point.payload, label) : label}</p>
      <p className="text-muted-foreground">
        <span
          aria-hidden="true"
          className="mr-1.5 inline-block size-2 rounded-full align-middle"
          style={{ background: SERIES }}
        />
        Average {Number(point.value).toFixed(1)} / 5
      </p>
    </div>
  );
}

function TableView({ caption, columns, rows }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        Show as table
      </summary>
      <Table className="mt-2">
        <caption className="sr-only">{caption}</caption>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column}>{column}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row[0]}>
              {row.map((cell, index) => (
                <TableCell key={index}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </details>
  );
}

/** Horizontal bars: average rubric score per competency (1 to 5). */
function CompetencyChart({ competencies }) {
  const data = competencies.filter((item) => item.average !== null);
  const summary = data.map((item) => `${item.label} ${item.average.toFixed(1)}`).join(", ");

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`Average score out of 5 by competency: ${summary}.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
            <CartesianGrid horizontal={false} stroke={GRID} strokeDasharray="0" />
            <XAxis
              type="number"
              domain={[0, 5]}
              ticks={[0, 1, 2, 3, 4, 5]}
              tick={AXIS_TEXT}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={130}
              tick={AXIS_TEXT}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip cursor={{ fill: "var(--muted)" }} content={<ChartTooltip />} />
            <Bar dataKey="average" fill={SERIES} radius={[0, 4, 4, 0]} barSize={16} isAnimationActive={false}>
              <LabelList
                dataKey="average"
                position="right"
                formatter={(value) => Number(value).toFixed(1)}
                style={{ fill: "var(--foreground)", fontSize: 12 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableView
        caption="Average score by competency"
        columns={["Competency", "Average (out of 5)", "Scored answers"]}
        rows={competencies.map((item) => [
          item.label,
          item.average === null ? "No data" : item.average.toFixed(1),
          item.count,
        ])}
      />
    </div>
  );
}

/** Line: average answer score per interview, oldest to newest. */
function SessionTrendChart({ sessions }) {
  const data = sessions.map((session, index) => ({
    ...session,
    label: `#${index + 1}`,
  }));
  const formatLabel = (point) => `${point.role_title} · ${formatDate(point.created_at)}`;

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={`Average score per interview, oldest to newest: ${data
          .map((point) => point.average_score.toFixed(1))
          .join(", ")}.`}
        className="h-64 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -16 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={AXIS_TEXT} axisLine={false} tickLine={false} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={AXIS_TEXT} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1 }}
              content={<ChartTooltip formatLabel={formatLabel} />}
            />
            <Line
              type="monotone"
              dataKey="average_score"
              stroke={SERIES}
              strokeWidth={2}
              dot={{ r: 4, fill: SERIES, stroke: "var(--surface)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: SERIES, stroke: "var(--surface)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <TableView
        caption="Average score per interview"
        columns={["Interview", "Role", "Date", "Average (out of 5)", "Evaluated answers"]}
        rows={data.map((point) => [
          point.label,
          point.role_title,
          formatDate(point.created_at),
          point.average_score.toFixed(1),
          point.evaluated_count,
        ])}
      />
    </div>
  );
}

export { CompetencyChart, SessionTrendChart };
