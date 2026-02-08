"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

type ConnectionState = "connecting" | "connected" | "reconnecting" | "error";

type Bucket = {
  minute: number;
  announcements: number;
  withdrawals: number;
};

type IodaSnapshot = {
  available: boolean;
  source: string | null;
  updatedAt: string;
  normalcy: number | null;
  delta: number | null;
  eventCount: number | null;
  note: string;
};

const TRACKED_SWEDISH_ASNS = [3301, 2119, 1257, 1653, 8674, 29518];
const RIS_WS_URL = "wss://ris-live.ripe.net/v1/ws/?client=redakta-labs-internet-weather";
const BUCKET_WINDOW_MS = 30 * 60 * 1000;

function numberOrNull(value: unknown): number | null {
  if (typeof value !== "number") {
    return null;
  }
  return Number.isFinite(value) ? value : null;
}

function parseAnnouncements(data: Record<string, unknown>): number {
  const announcements = data.announcements;
  if (Array.isArray(announcements)) {
    return announcements.reduce((sum, item) => {
      if (!item || typeof item !== "object") {
        return sum;
      }
      const prefixes = (item as { prefixes?: unknown }).prefixes;
      if (Array.isArray(prefixes) && prefixes.length > 0) {
        return sum + prefixes.length;
      }
      return sum + 1;
    }, 0);
  }

  if (typeof data.announcement === "string") {
    return 1;
  }

  return 0;
}

function parseWithdrawals(data: Record<string, unknown>): number {
  const withdrawals = data.withdrawals;
  if (Array.isArray(withdrawals)) {
    return withdrawals.length;
  }

  if (typeof data.withdrawal === "string") {
    return 1;
  }

  return 0;
}

function parseRisEnvelope(rawMessage: string): { timestampMs: number; announcements: number; withdrawals: number } | null {
  try {
    const payload = JSON.parse(rawMessage) as { type?: unknown; data?: unknown };
    if (payload.type !== "ris_message" || !payload.data || typeof payload.data !== "object") {
      return null;
    }

    const data = payload.data as Record<string, unknown>;
    let announcements = parseAnnouncements(data);
    let withdrawals = parseWithdrawals(data);

    const updateType = typeof data.type === "string" ? data.type.toUpperCase() : "";
    if (announcements === 0 && withdrawals === 0) {
      if (updateType === "A" || updateType === "ANNOUNCEMENT") {
        announcements = 1;
      } else if (updateType === "W" || updateType === "WITHDRAWAL") {
        withdrawals = 1;
      } else if (updateType === "UPDATE") {
        announcements = 1;
      }
    }

    if (announcements === 0 && withdrawals === 0) {
      return null;
    }

    const ts = numberOrNull(data.timestamp);
    const timestampMs = ts === null ? Date.now() : ts > 1_000_000_000_000 ? ts : ts * 1000;
    return { timestampMs, announcements, withdrawals };
  } catch {
    return null;
  }
}

function upsertBuckets(
  existing: Bucket[],
  update: { timestampMs: number; announcements: number; withdrawals: number }
): Bucket[] {
  const minute = Math.floor(update.timestampMs / 60_000) * 60_000;
  const bucketMap = new Map(existing.map((bucket) => [bucket.minute, { ...bucket }]));
  const current = bucketMap.get(minute) ?? { minute, announcements: 0, withdrawals: 0 };
  current.announcements += update.announcements;
  current.withdrawals += update.withdrawals;
  bucketMap.set(minute, current);

  const cutoff = Date.now() - BUCKET_WINDOW_MS;
  return Array.from(bucketMap.values())
    .filter((bucket) => bucket.minute >= cutoff)
    .sort((a, b) => a.minute - b.minute);
}

function formatLocalTime(value: number): string {
  return new Date(value).toLocaleTimeString("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function weatherForScore(score: number): { label: string; detail: string; tone: string } {
  if (score >= 85) {
    return { label: "Lugnt", detail: "Stabil routing i bevakat svenskt AS-kluster.", tone: "text-emerald-600" };
  }
  if (score >= 65) {
    return { label: "Bris", detail: "Mindre turbulens men inga tydliga stress-signaler.", tone: "text-sky-600" };
  }
  if (score >= 45) {
    return { label: "Blåsigt", detail: "Förhöjd BGP-volatilitet i svenska transitvägar.", tone: "text-amber-600" };
  }
  return { label: "Storm", detail: "Markant turbulens med hög andel withdrawals.", tone: "text-rose-600" };
}

function connectionText(connection: ConnectionState): string {
  if (connection === "connected") {
    return "Ansluten";
  }
  if (connection === "reconnecting") {
    return "Återansluter";
  }
  if (connection === "error") {
    return "Otillg\u00E4nglig";
  }
  return "Ansluter";
}

export default function InternetWeatherPanel() {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [ioda, setIoda] = useState<IodaSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;

    const connect = () => {
      setConnection((previous) => (previous === "connected" ? "reconnecting" : "connecting"));
      ws = new WebSocket(RIS_WS_URL);

      ws.onopen = () => {
        if (!active || !ws) {
          return;
        }
        setConnection("connected");
        ws.send(
          JSON.stringify({
            type: "ris_subscribe",
            data: {
              type: "UPDATE",
              path: `(${TRACKED_SWEDISH_ASNS.join("|")})`,
            },
          })
        );
      };

      ws.onmessage = (event) => {
        if (!active) {
          return;
        }
        const parsed = parseRisEnvelope(String(event.data));
        if (!parsed) {
          return;
        }
        setLastEventAt(parsed.timestampMs);
        setBuckets((previous) => upsertBuckets(previous, parsed));
      };

      ws.onerror = () => {
        if (active) {
          setConnection("reconnecting");
        }
      };

      ws.onclose = () => {
        if (!active) {
          return;
        }
        setConnection("reconnecting");
        reconnectTimer = window.setTimeout(connect, 3_000);
      };
    };

    connect();

    return () => {
      active = false;
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadIoda = async () => {
      try {
        const response = await fetch("/api/internet-weather/ioda", { cache: "no-store" });
        const data = (await response.json()) as IodaSnapshot;
        if (!cancelled) {
          setIoda(data);
        }
      } catch {
        if (!cancelled) {
          setIoda({
            available: false,
            source: null,
            updatedAt: new Date().toISOString(),
            normalcy: null,
            delta: null,
            eventCount: null,
            note: "IODA kunde inte hämtas just nu.",
          });
        }
      }
    };

    loadIoda();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartBuckets = useMemo(() => {
    if (buckets.length === 0) {
      return [] as Array<Bucket & { total: number }>;
    }

    const minuteNow = buckets[buckets.length - 1].minute;
    const bucketMap = new Map(buckets.map((bucket) => [bucket.minute, bucket]));
    const points: Array<Bucket & { total: number }> = [];

    for (let index = 29; index >= 0; index -= 1) {
      const minute = minuteNow - index * 60_000;
      const bucket = bucketMap.get(minute) ?? { minute, announcements: 0, withdrawals: 0 };
      points.push({
        ...bucket,
        total: bucket.announcements + bucket.withdrawals,
      });
    }

    return points;
  }, [buckets]);

  const metrics = useMemo(() => {
    const totals = chartBuckets.map((bucket) => bucket.total);
    const totalAnnouncements = chartBuckets.reduce((sum, bucket) => sum + bucket.announcements, 0);
    const totalWithdrawals = chartBuckets.reduce((sum, bucket) => sum + bucket.withdrawals, 0);
    const totalMessages = totalAnnouncements + totalWithdrawals;

    const averageVolume = totals.reduce((sum, value) => sum + value, 0) / Math.max(totals.length, 1);
    const variance =
      totals.reduce((sum, value) => {
        const diff = value - averageVolume;
        return sum + diff * diff;
      }, 0) / Math.max(totals.length, 1);
    const volatility = Math.sqrt(variance);

    const withdrawalRatio = totalMessages > 0 ? totalWithdrawals / totalMessages : 0;
    const normalizedVolume = Math.min(averageVolume / 25, 1);
    const normalizedVolatility = Math.min(volatility / 20, 1);

    const pressure = Math.min(withdrawalRatio * 0.55 + normalizedVolume * 0.3 + normalizedVolatility * 0.15, 1);
    const score = Math.round((1 - pressure) * 100);

    return {
      score,
      totalAnnouncements,
      totalWithdrawals,
      maxPerMinute: Math.max(...totals, 1),
    };
  }, [chartBuckets]);

  const weather = weatherForScore(metrics.score);
  const connectionBadgeClass =
    connection === "connected"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : connection === "reconnecting"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : connection === "error"
          ? "bg-slate-50 text-slate-700 border-slate-200"
          : "bg-slate-50 text-slate-700 border-slate-200";

  return (
    <section className="card-premium p-5 sm:p-8 md:p-10 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 font-mono">Sweden Internet Weather</p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-900 font-mono">
            Internetprognos i realtid
          </h1>
          <p className="text-sm sm:text-base text-slate-500 max-w-3xl">
            Offentliga data från RIPE RIS Live, med valfri komplettering från CAIDA IODA.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <span className={`inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider ${connectionBadgeClass}`}>
            RIS Live: {connectionText(connection)}
          </span>
          <span className="text-[11px] text-slate-400 font-mono text-center md:text-right">
            {lastEventAt ? `Senaste BGP-event: ${formatLocalTime(lastEventAt)}` : "Väntar på BGP-event..."}
          </span>
          {connection !== "connected" ? (
            <span className="text-[11px] text-slate-400 font-mono text-center md:text-right">
              {"Visar anslutning till datak\u00E4llan, inte ett bekr\u00E4ftat driftfel i Sverige."}
            </span>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500 font-mono">Sverigekarta</h2>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] items-center">
          <div className="rounded-2xl border border-slate-100 bg-linear-to-br from-sky-50 to-emerald-50 p-4 sm:p-6">
            <Image
              src="/sweden.svg"
              alt="Karta över Sverige"
              width={880}
              height={980}
              className="mx-auto h-auto w-full max-w-sm sm:max-w-md"
              priority
            />
          </div>
          <div className="space-y-3">
            <p className={`text-2xl sm:text-3xl font-black ${weather.tone}`}>{weather.label}</p>
            <p className="text-sm text-slate-500">{weather.detail}</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Detta är en snabb temperaturmätning av BGP-turbulens i svenska nätvägar. Den ersätter inte en full outage-analys.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Bevakade AS-nummer: {TRACKED_SWEDISH_ASNS.join(", ")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-mono">Weather score</p>
          <p className={`mt-1 text-4xl font-black ${weather.tone}`}>{metrics.score}</p>
          <p className="mt-2 text-xs text-slate-500">Skala 0-100 där högre betyder stabilare läge.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-mono">Announcements</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{metrics.totalAnnouncements}</p>
          <p className="mt-2 text-xs text-slate-500">Observerade prefixannonseringar senaste 30 min.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-mono">Withdrawals</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{metrics.totalWithdrawals}</p>
          <p className="mt-2 text-xs text-slate-500">Hög andel withdrawals kan indikera instabilitet.</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-mono">CAIDA IODA</p>
          {ioda === null ? (
            <p className="mt-2 text-sm text-slate-500">Laddar valfri signal...</p>
          ) : ioda.available ? (
            <div className="mt-2 space-y-1">
              <p className="text-2xl font-black text-slate-900">
                {ioda.normalcy !== null ? ioda.normalcy.toFixed(3) : ioda.eventCount ?? "OK"}
              </p>
              <p className="text-xs text-slate-500">
                {ioda.normalcy !== null ? "Normalcy-värde" : "Eventsammanfattning"} {ioda.source ? `(${ioda.source})` : ""}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Ingen färsk IODA-data just nu.</p>
          )}
          <p className="mt-2 text-xs text-slate-500">Påverkar inte huvudmätningen från RIPE RIS Live.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-slate-500 font-mono">Turbulens senaste 30 min</h2>
          <p className="text-[11px] text-slate-400 font-mono">1 stapel = 1 minut</p>
        </div>
        {chartBuckets.length === 0 ? (
          <div className="h-32 rounded-xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center text-xs text-slate-500">
            Inga BGP-event ännu, väntar på streamen...
          </div>
        ) : (
          <div className="flex h-32 items-end gap-1">
            {chartBuckets.map((bucket) => {
              const heightPct = bucket.total === 0 ? 4 : Math.max((bucket.total / metrics.maxPerMinute) * 100, 8);
              const isWithdrawalHeavy = bucket.withdrawals > bucket.announcements;
              return (
                <div key={bucket.minute} className="group relative flex-1">
                  <div
                    className={`w-full rounded-t-sm ${isWithdrawalHeavy ? "bg-rose-300" : "bg-sky-300"} transition-all`}
                    style={{ height: `${heightPct}%` }}
                    aria-label={`${formatLocalTime(bucket.minute)}: ${bucket.total} events`}
                  />
                  <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                    {formatLocalTime(bucket.minute)} · {bucket.total}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
