import { NextResponse } from "next/server";

type IodaPoint = {
  timestamp: number;
  value: number;
};

type CandidateSource = {
  name: string;
  url: string;
  kind: "signals" | "events";
};

export const dynamic = "force-dynamic";

function toEpochSeconds(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  if (value > 1_000_000_000_000) {
    return Math.floor(value / 1000);
  }
  return Math.floor(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function parseSignals(payload: unknown): IodaPoint[] {
  const points: IodaPoint[] = [];
  if (!payload || typeof payload !== "object") {
    return points;
  }

  const candidates: unknown[] = [];
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.results)) {
    candidates.push(...root.results);
  }
  if (Array.isArray(root.data)) {
    candidates.push(...root.data);
  }
  if (Array.isArray(payload)) {
    candidates.push(...payload);
  }

  candidates.forEach((candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return;
    }
    const entry = candidate as Record<string, unknown>;
    if (!Array.isArray(entry.values)) {
      return;
    }

    entry.values.forEach((valueEntry) => {
      if (Array.isArray(valueEntry) && valueEntry.length >= 2) {
        const timestamp = toEpochSeconds(toFiniteNumber(valueEntry[0]));
        const value = toFiniteNumber(valueEntry[1]);
        if (timestamp !== null && value !== null) {
          points.push({ timestamp, value });
        }
        return;
      }

      if (valueEntry && typeof valueEntry === "object") {
        const valueObject = valueEntry as Record<string, unknown>;
        const timestamp = toEpochSeconds(
          toFiniteNumber(valueObject.timestamp) ?? toFiniteNumber(valueObject.time)
        );
        const value =
          toFiniteNumber(valueObject.normalcy) ??
          toFiniteNumber(valueObject.value) ??
          toFiniteNumber(valueObject.signalValue);
        if (timestamp !== null && value !== null) {
          points.push({ timestamp, value });
        }
      }
    });
  });

  return points.sort((left, right) => left.timestamp - right.timestamp);
}

function parseEventsCount(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.events)) {
    return root.events.length;
  }
  if (Array.isArray(root.results)) {
    return root.results.length;
  }
  return null;
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const now = Math.floor(Date.now() / 1000);
  const from = now - 24 * 60 * 60;

  const sources: CandidateSource[] = [
    {
      name: "ioda.caida.org/signals",
      url: `https://ioda.caida.org/ioda/data/signals?from=${from}&until=${now}&meta=country&entityCode=SE`,
      kind: "signals",
    },
    {
      name: "ioda.caida.org/events",
      url: `https://ioda.caida.org/ioda/data/events?from=${from}&until=${now}&meta=country&entityCode=SE`,
      kind: "events",
    },
  ];

  for (const source of sources) {
    try {
      const payload = await fetchJson(source.url, 6_000);

      if (source.kind === "signals") {
        const points = parseSignals(payload);
        if (points.length > 0) {
          const latest = points[points.length - 1];
          const baseline =
            points.reduce((sum, point) => sum + point.value, 0) / Math.max(points.length, 1);
          return NextResponse.json({
            available: true,
            source: source.name,
            updatedAt: new Date().toISOString(),
            normalcy: latest.value,
            delta: latest.value - baseline,
            eventCount: null,
            note: "Publik IODA normalcy-signal for SE senaste 24h.",
          });
        }
      }

      const eventCount = parseEventsCount(payload);
      if (eventCount !== null) {
        return NextResponse.json({
          available: true,
          source: source.name,
          updatedAt: new Date().toISOString(),
          normalcy: null,
          delta: null,
          eventCount,
          note: "Publik IODA event-sammanfattning for SE senaste 24h.",
        });
      }
    } catch {
      // Try next candidate source.
    }
  }

  return NextResponse.json({
    available: false,
    source: null,
    updatedAt: new Date().toISOString(),
    normalcy: null,
    delta: null,
    eventCount: null,
    note: "IODA kunde inte returnera data inom timeout-fonstret.",
  });
}
