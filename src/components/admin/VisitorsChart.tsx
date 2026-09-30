"use client";

import { useEffect, useRef, useState } from "react";
import type { DayPoint } from "@/lib/analytics/types";
import { formatDay } from "@/lib/format";

const H = 200;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };

/** Clean axis maximum and step: 0 / 5 / 10, 0 / 20 / 40 … */
function niceScale(max: number) {
  if (max <= 4) return { top: 4, step: 1 };
  const rough = max / 4;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= rough) ?? 10 * mag;
  return { top: Math.ceil(max / step) * step, step };
}

/**
 * Daily unique visitors: one series, so no legend (the card title names it). Bars are
 * capped at 24px with a rounded top; hovering or focusing a day shows its numbers, and
 * the same data is available as a table underneath.
 */
export function VisitorsChart({ daily }: { daily: DayPoint[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(260, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { top, step } = niceScale(Math.max(0, ...daily.map((d) => d.visitors)));
  const plotW = width - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = plotW / daily.length;
  const barW = Math.max(2, Math.min(24, band - 2)); // 2px surface gap between neighbours
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const ticks = Array.from({ length: top / step + 1 }, (_, i) => i * step);
  // Label about six days along the axis, always including the last one.
  const every = Math.max(1, Math.ceil(daily.length / 6));
  const labelled = (i: number) => (daily.length - 1 - i) % every === 0;
  const a = active !== null ? daily[active] : null;

  return (
    <div className="chart" ref={box}>
      <svg viewBox={`0 0 ${width} ${H}`} height={H} role="img" aria-label={`Daily visitors over the last ${daily.length} days`}>
        {ticks.map((t) => (
          <g key={t}>
            {t > 0 ? <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} /> : null}
            <text className="chart__axis" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
              {t.toLocaleString("en-IN")}
            </text>
          </g>
        ))}
        {daily.map((d, i) => {
          const x = PAD.left + i * band;
          const h = y(0) - y(d.visitors);
          const bx = x + (band - barW) / 2;
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={d.day}>
              {active === i ? <rect className="chart__band--on" x={x} y={PAD.top} width={band} height={plotH} /> : null}
              {d.visitors > 0 ? (
                <path
                  className="chart__bar"
                  // Rounded data-end, square at the baseline.
                  d={`M${bx},${y(0)} V${y(d.visitors) + r} Q${bx},${y(d.visitors)} ${bx + r},${y(d.visitors)} H${bx + barW - r} Q${bx + barW},${y(d.visitors)} ${bx + barW},${y(d.visitors) + r} V${y(0)} Z`}
                />
              ) : null}
              {labelled(i) ? (
                <text className="chart__axis" x={x + band / 2} y={H - 8} textAnchor="middle">
                  {formatDay(d.day, "axis")}
                </text>
              ) : null}
              {/* The whole day's column is the hover/focus target, not just the bar. */}
              <rect
                className="chart__hit"
                x={x}
                y={PAD.top}
                width={band}
                height={plotH}
                tabIndex={0}
                aria-label={`${formatDay(d.day, "long")}: ${d.visitors} visitors, ${d.pageviews} page views`}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
            </g>
          );
        })}
        <line className="chart__base" x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} />
      </svg>
      {a && active !== null ? (
        <div
          className="chart__tip"
          style={{
            left: Math.min(Math.max(PAD.left + active * band + band / 2, 80), width - 80),
            top: y(a.visitors),
          }}
        >
          <b>{formatDay(a.day)}</b>
          <span className="chart__key" aria-hidden />
          {a.visitors.toLocaleString("en-IN")} visitor{a.visitors === 1 ? "" : "s"}
          <br />
          <span className="muted">{a.pageviews.toLocaleString("en-IN")} page views</span>
        </div>
      ) : null}
      <details style={{ marginTop: 10 }}>
        <summary className="muted" style={{ cursor: "pointer" }}>
          View as table
        </summary>
        <div className="table-scroll">
          <table className="datatable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Visitors</th>
                <th>Page views</th>
              </tr>
            </thead>
            <tbody>
              {[...daily].reverse().map((d) => (
                <tr key={d.day}>
                  <td>{formatDay(d.day)}</td>
                  <td>{d.visitors}</td>
                  <td>{d.pageviews}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
