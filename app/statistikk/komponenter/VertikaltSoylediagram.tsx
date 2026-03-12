import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GruppertAntall } from "../beregninger";

const SOYLEFARGE = "var(--ax-accent-500, #428ae3)";

interface DiagramTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: GruppertAntall }>;
}

function DiagramTooltip({ active, payload }: DiagramTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-ax-border-neutral-subtle bg-ax-bg-raised px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold">{payload[0].payload.navn}</p>
      <p className="text-sm text-ax-text-neutral-subtle">{payload[0].value} saker</p>
    </div>
  );
}

interface Props {
  data: GruppertAntall[];
  ariaLabel: string;
}

/** Vertikalt søylediagram med Aksel-farger og Recharts */
export function VertikaltSoylediagram({ data, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={300} initialDimension={{ width: 800, height: 300 }}>
        <BarChart data={data} margin={{ left: 0, right: 0, top: 20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
          />
          <XAxis
            dataKey="navn"
            tick={{ fontSize: 13, fill: "var(--ax-text-neutral, #262626)" }}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
          />
          <YAxis
            tick={{ fontSize: 13, fill: "var(--ax-text-neutral, #262626)" }}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
            allowDecimals={false}
          />
          <Tooltip
            content={<DiagramTooltip />}
            cursor={{ fill: "var(--ax-bg-neutral-soft, #f5f6f7)" }}
          />
          <Bar dataKey="antall" fill={SOYLEFARGE} radius={[4, 4, 0, 0]} maxBarSize={64}>
            <LabelList
              dataKey="antall"
              position="top"
              style={{
                fontSize: 13,
                fontWeight: 600,
                fill: "var(--ax-text-neutral, #262626)",
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
