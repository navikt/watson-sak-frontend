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
  payload?: Array<{ value: number }>;
  label?: string;
}

function DiagramTooltip({ active, payload, label }: DiagramTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-ax-border-neutral-subtle bg-ax-bg-raised px-3 py-2 shadow-sm">
      <p className="text-sm font-semibold capitalize">{label}</p>
      <p className="text-sm text-ax-text-neutral-subtle">{payload[0].value} saker</p>
    </div>
  );
}

interface Props {
  data: GruppertAntall[];
  ariaLabel: string;
}

/** Horisontalt søylediagram med Aksel-farger og Recharts */
export function HorisontaltSoylediagram({ data, ariaLabel }: Props) {
  const høyde = Math.max(200, data.length * 44 + 40);

  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={høyde} initialDimension={{ width: 800, height: høyde }}>
        <BarChart layout="vertical" data={data} margin={{ left: 0, right: 40, top: 5, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            horizontal={false}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
          />
          <XAxis
            type="number"
            tick={{ fontSize: 13, fill: "var(--ax-text-neutral, #262626)" }}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="navn"
            width={140}
            tick={{ fontSize: 13, fill: "var(--ax-text-neutral, #262626)" }}
            stroke="var(--ax-border-neutral-subtle, #c9c9c9)"
            tickFormatter={(value: string) => value.replace(/\b\w/g, (c) => c.toUpperCase())}
          />
          <Tooltip
            content={<DiagramTooltip />}
            cursor={{ fill: "var(--ax-bg-neutral-soft, #f5f6f7)" }}
          />
          <Bar dataKey="antall" fill={SOYLEFARGE} radius={[0, 4, 4, 0]} barSize={24}>
            <LabelList
              dataKey="antall"
              position="right"
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
