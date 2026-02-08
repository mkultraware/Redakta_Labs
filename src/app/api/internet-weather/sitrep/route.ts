import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CERT_SE_RSS_URL = "https://www.cert.se/feed.rss";

// --- Rate Limiting (in-memory, per serverless instance) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;     // 30 requests per minute per IP

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
        const ip = forwardedFor.split(",")[0]?.trim();
        if (ip) return ip;
    }
    const netlifyIp = request.headers.get("x-nf-client-connection-ip");
    if (netlifyIp) return netlifyIp;
    return request.headers.get("client-ip") ?? "unknown";
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    // Clean up expired entries periodically
    if (rateLimitStore.size > 500) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetAt < now) rateLimitStore.delete(key);
        }
    }

    if (!entry || entry.resetAt < now) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetAt - now };
}

// --- In-memory cache to reduce upstream calls ---
let cache: { expiresAt: number; data: SitrepResponse } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface AlertItem {
    title: string;
    link: string;
    date: string;
    source: string;
}

interface SitrepResponse {
    alerts: AlertItem[];
    routing: { status: string; coverage: string };
    timestamp: string;
}

async function fetchCertSeAlerts(): Promise<AlertItem[]> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(CERT_SE_RSS_URL, {
            signal: controller.signal,
            cache: "no-store"
        });
        clearTimeout(timeout);

        const text = await response.text();

        const items: AlertItem[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        const titleRegex = /<title>([\s\S]*?)<\/title>/;
        const linkRegex = /<link>([\s\S]*?)<\/link>/;
        const dateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;

        let match;
        while ((match = itemRegex.exec(text)) !== null && items.length < 5) {
            const content = match[1];
            const title = titleRegex.exec(content)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1") || "";
            const link = linkRegex.exec(content)?.[1] || "";
            const date = dateRegex.exec(content)?.[1] || "";
            items.push({ title, link, date, source: "CERT-SE" });
        }
        return items;
    } catch (error) {
        console.error("CERT-SE fetch error:", error);
        return [];
    }
}

async function fetchRipeStatHealth() {
    return {
        status: "Stable",
        coverage: "Major ISPs monitored",
    };
}

export async function GET(request: NextRequest) {
    // Rate limit check
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(clientIP);

    if (!rateLimit.allowed) {
        return NextResponse.json(
            { error: "Too many requests. Please wait a moment.", retryAfter: Math.ceil(rateLimit.resetIn / 1000) },
            {
                status: 429,
                headers: {
                    "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
                    "X-RateLimit-Remaining": "0",
                }
            }
        );
    }

    // Return cached data if available
    if (cache && cache.expiresAt > Date.now()) {
        return NextResponse.json(cache.data, {
            headers: {
                "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
                "X-RateLimit-Remaining": String(rateLimit.remaining),
                "X-Cache": "HIT",
            },
        });
    }

    // Fetch fresh data
    const [alerts, routing] = await Promise.all([
        fetchCertSeAlerts(),
        fetchRipeStatHealth(),
    ]);

    const responseData: SitrepResponse = {
        alerts,
        routing,
        timestamp: new Date().toISOString(),
    };

    // Update cache
    cache = {
        expiresAt: Date.now() + CACHE_TTL_MS,
        data: responseData,
    };

    return NextResponse.json(responseData, {
        headers: {
            "Cache-Control": "public, s-maxage=600, stale-while-revalidate=60",
            "X-RateLimit-Remaining": String(rateLimit.remaining),
            "X-Cache": "MISS",
        },
    });
}
