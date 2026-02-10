import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

// Promisified DNS with timeout wrapper
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);
const resolve = promisify(dns.resolve);

const DNS_TIMEOUT_MS = 2000;
const FETCH_TIMEOUT_MS = 5000;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TEST_SECRET_PREFIX = "1x0000000000000000000000000000000";
const TURNSTILE_TEST_SITE_KEY_PREFIX = "1x00000000000000000000";
const KEV_FEED_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

type PublicBand = "green" | "amber" | "red" | "gray";

type PublicSignal = {
    verdict: PublicBand;
    severity: "success" | "warning" | "error" | "neutral";
    teaser: string;
    confidence: "high" | "medium" | "low";
};

type EmailSecurityResult = { verdict: string; severity: string; riskLevel: number };
type BlacklistResult = { verdict: string; severity: string; listedCount: number; note?: string };
type TyposquatResult = { verdict: string; severity: string; count: number };
type DnsArmorResult = { verdict: string; severity: string; riskLevel: number };
type ShadowInfraResult = { verdict: string; severity: string; count: number };
type HistoryResult = { verdict: string; severity: string; count: number };

type UrlhausResult = { available: boolean; hits: number };
type ThreatFoxResult = { available: boolean; hits: number };
type ShodanResult = { available: boolean; portCount: number; vulnCount: number; vulns: string[] };
type AbuseIpdbResult = { available: boolean; abuseScore: number | null };
type ThreatIntelResult = {
    urlhaus: UrlhausResult;
    threatfox: ThreatFoxResult;
    shodan: ShodanResult;
    abuseipdb: AbuseIpdbResult;
    kevHits: number | null;
};

type UpstreamSourceKey = "urlhaus" | "threatfox" | "shodan" | "abuseipdb" | "kev";
type ThreatIntelCacheEntry = { expiresAt: number; data: ThreatIntelResult };

// --- Rate Limiting (in-memory, per serverless instance) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;     // 10 requests per minute per IP
const UPSTREAM_RATE_WINDOW_MS = 60 * 1000; // 1 minute
const UPSTREAM_RATE_MAX_REQUESTS: Record<UpstreamSourceKey, number> = {
    urlhaus: 20,
    threatfox: 20,
    shodan: 30,
    abuseipdb: 20,
    kev: 5,
};
const THREAT_INTEL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const upstreamRateStore = new Map<UpstreamSourceKey, { count: number; resetAt: number }>();
const threatIntelCache = new Map<string, ThreatIntelCacheEntry>();
let kevCache: { expiresAt: number; cves: Set<string> } | null = null;
const KEV_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    if (rateLimitStore.size > 1000) {
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

function consumeUpstreamBudget(source: UpstreamSourceKey): boolean {
    const now = Date.now();
    const current = upstreamRateStore.get(source);
    const limit = UPSTREAM_RATE_MAX_REQUESTS[source];

    if (!current || current.resetAt < now) {
        upstreamRateStore.set(source, { count: 1, resetAt: now + UPSTREAM_RATE_WINDOW_MS });
        return true;
    }

    if (current.count >= limit) {
        return false;
    }

    current.count += 1;
    return true;
}

function isTurnstileTestSecret(secret: string): boolean {
    return secret.startsWith(TURNSTILE_TEST_SECRET_PREFIX);
}

function isTurnstileTestSiteKey(siteKey: string): boolean {
    return siteKey.startsWith(TURNSTILE_TEST_SITE_KEY_PREFIX);
}

// IP Blacklists (from sekura_avm.py)
const IP_BLACKLISTS = [
    "zen.spamhaus.org",
    "bl.spamcop.net",
    "dnsbl.sorbs.net",
    "b.barracudacentral.org",
    "spam.dnsbl.sorbs.net",
    "cbl.abuseat.org",
    "dnsbl-1.uceprotect.net",
];

// Domain Blacklists
const DOMAIN_BLACKLISTS = [
    "dbl.spamhaus.org",
    "multi.surbl.org",
];

// --- CDN Detection (Cloudflare) ---
const CLOUDFLARE_IPS = [
    "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22",
    "141.101.64.0/18", "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20",
    "197.234.240.0/22", "198.41.128.0/17", "162.158.0.0/15", "104.16.0.0/13",
    "104.24.0.0/14", "172.64.0.0/13", "131.27.0.0/16"
];

function isCloudflareIP(ip: string): boolean {
    const ipToLong = (value: string) => value.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const target = ipToLong(ip);

    for (const range of CLOUDFLARE_IPS) {
        const [base, mask] = range.split("/");
        const bitmask = (0xffffffff << (32 - parseInt(mask, 10))) >>> 0;
        if ((ipToLong(base) & bitmask) === (target & bitmask)) return true;
    }
    return false;
}

function normalizeAndValidateDomain(input: string) {
    if (!input || typeof input !== "string") return { valid: false, error: "Domän krävs" };

    let domain = input
        .replace(/<[^>]*>/g, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+=/gi, "")
        .replace(/[<>"'`]/g, "")
        .trim()
        .toLowerCase();

    domain = domain
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        .split("?")[0]
        .split("#")[0]
        .split(":")[0]
        .replace(/^\.+|\.+$/g, "");

    if (!domain) return { valid: false, error: "Ogiltig domän" };
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(domain)) return { valid: false, error: "IP-adresser stöds inte" };
    if (domain === "localhost" || domain.endsWith(".local") || domain.endsWith(".localhost")) return { valid: false, error: "Lokala domäner stöds inte" };
    if (domain.length > 253) return { valid: false, error: "Domänen är för lång" };

    const labels = domain.split(".");
    if (labels.length < 2) return { valid: false, error: "Ogiltig domän - TLD saknas" };

    for (const label of labels) {
        if (!label || label.length > 63) return { valid: false, error: "Ogiltig domän - felaktig etikett" };
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label) && !/^[a-z0-9]$/i.test(label)) {
            return { valid: false, error: "Ogiltig domän - otillåtna tecken" };
        }
    }

    return { valid: true, domain };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    const timeout = new Promise<null>((resolvePromise) => setTimeout(() => resolvePromise(null), ms));
    return Promise.race([promise, timeout]);
}

async function safeResolveTxt(domain: string) { try { return await withTimeout(resolveTxt(domain), DNS_TIMEOUT_MS); } catch { return null; } }
async function safeResolveMx(domain: string) { try { return await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS); } catch { return null; } }
async function safeResolve4(domain: string) { try { return await withTimeout(resolve4(domain), DNS_TIMEOUT_MS); } catch { return null; } }

function severityFromBand(band: PublicBand): PublicSignal["severity"] {
    if (band === "green") return "success";
    if (band === "amber") return "warning";
    if (band === "red") return "error";
    return "neutral";
}

function makeSignal(
    verdict: PublicBand,
    teaser: string,
    confidence: PublicSignal["confidence"]
): PublicSignal {
    return {
        verdict,
        severity: severityFromBand(verdict),
        teaser,
        confidence,
    };
}

function bandScore(band: PublicBand): number {
    if (band === "red") return 2;
    if (band === "amber") return 1;
    return 0;
}

// --- Base passive checks ---
async function checkEmailSecurity(domain: string): Promise<EmailSecurityResult> {
    const mx = await safeResolveMx(domain);
    const hasMX = mx !== null && mx.length > 0;

    if (!hasMX) {
        return { verdict: "not_applicable", severity: "info", riskLevel: 0 };
    }

    const txt = await safeResolveTxt(domain);
    const spfRecord = txt?.flat().find(r => r.toLowerCase().startsWith("v=spf1"));
    const hasSPF = !!spfRecord;

    let spfEnforcement: "strict" | "soft" | "neutral" | "none" = "none";
    if (spfRecord) {
        if (spfRecord.toLowerCase().includes("-all")) spfEnforcement = "strict";
        else if (spfRecord.toLowerCase().includes("~all")) spfEnforcement = "soft";
        else if (spfRecord.toLowerCase().includes("?all")) spfEnforcement = "neutral";
    }

    const dmarcTxt = await safeResolveTxt(`_dmarc.${domain}`);
    const dmarcRecord = dmarcTxt?.flat().find(r => r.toLowerCase().startsWith("v=dmarc1"));

    let dmarcPolicy: "reject" | "quarantine" | "none" | "missing" = "missing";
    if (dmarcRecord) {
        if (dmarcRecord.toLowerCase().includes("p=reject")) dmarcPolicy = "reject";
        else if (dmarcRecord.toLowerCase().includes("p=quarantine")) dmarcPolicy = "quarantine";
        else if (dmarcRecord.toLowerCase().includes("p=none")) dmarcPolicy = "none";
    }

    if (dmarcPolicy === "reject" || dmarcPolicy === "quarantine") {
        return { verdict: "protected", severity: "success", riskLevel: 0 };
    }

    if (dmarcPolicy === "none") {
        return { verdict: "not_protected", severity: "critical", riskLevel: 3 };
    }

    if (hasSPF && spfEnforcement === "strict") {
        return { verdict: "partial", severity: "warning", riskLevel: 1 };
    }

    if (hasSPF && (spfEnforcement === "soft" || spfEnforcement === "neutral")) {
        return { verdict: "partial", severity: "warning", riskLevel: 2 };
    }

    return { verdict: "not_protected", severity: "critical", riskLevel: 3 };
}

async function checkDNSArmor(domain: string): Promise<DnsArmorResult> {
    try {
        const caa = await withTimeout(resolve(domain, "CAA"), DNS_TIMEOUT_MS);
        const hasArmor = caa !== null && caa.length > 0;

        return {
            verdict: hasArmor ? "hardened" : "missing",
            severity: hasArmor ? "success" : "warning",
            riskLevel: hasArmor ? 0 : 1,
        };
    } catch {
        return { verdict: "unknown", severity: "neutral", riskLevel: 0 };
    }
}

async function checkShadowInfrastructure(domain: string): Promise<ShadowInfraResult> {
    try {
        const res = await fetch(`https://crt.sh/?q=${domain}&output=json`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error("crt.sh error");

        const data = await res.json() as Array<{ name_value: string }>;
        const uniqueNames = new Set(data.map((item) => item.name_value));
        const count = uniqueNames.size;

        return {
            verdict: count > 15 ? "high_exposure" : count > 5 ? "monitored" : "stable",
            severity: count > 15 ? "critical" : count > 5 ? "warning" : "success",
            count,
        };
    } catch {
        return { verdict: "unknown", severity: "neutral", count: 0 };
    }
}

async function checkHistoricalFootprint(domain: string): Promise<HistoryResult> {
    try {
        const res = await fetch(`https://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&fl=original&collapse=urlkey&limit=100`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error("Archive error");

        const data = await res.json() as unknown[];
        const count = Math.max(0, data.length - 1);

        return {
            verdict: count > 50 ? "deep_history" : count > 20 ? "visible" : "minimal",
            severity: count > 50 ? "warning" : "success",
            count,
        };
    } catch {
        return { verdict: "unknown", severity: "neutral", count: 0 };
    }
}

async function checkBlacklists(domain: string): Promise<BlacklistResult> {
    const ips = await safeResolve4(domain);
    if (!ips || ips.length === 0) return { verdict: "clean", severity: "success", listedCount: 0 };

    const ip = ips[0];
    const isCDN = isCloudflareIP(ip);
    const reversedIP = ip.split(".").reverse().join(".");

    let ipListedCount = 0;
    let domainListedCount = 0;

    if (!isCDN) {
        for (const bl of IP_BLACKLISTS) {
            const result = await safeResolve4(`${reversedIP}.${bl}`);
            if (result && result.length > 0) ipListedCount++;
        }
    }

    for (const bl of DOMAIN_BLACKLISTS) {
        const result = await safeResolve4(`${domain}.${bl}`);
        if (result && result.length > 0) domainListedCount++;
    }

    const totalListed = ipListedCount + domainListedCount;
    if (totalListed > 0) {
        return { verdict: "listed", severity: "critical", listedCount: totalListed };
    }

    if (isCDN) {
        return {
            verdict: "clean",
            severity: "success",
            listedCount: 0,
            note: "Infrastruktur skyddad via CDN (delad IP).",
        };
    }

    return { verdict: "clean", severity: "success", listedCount: 0 };
}

async function checkTyposquats(domain: string): Promise<TyposquatResult> {
    const parts = domain.split(".");
    const name = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];

    const typos = [
        `${name}s.${tld}`,
        `${name.slice(0, -1)}.${tld}`,
        `ww${name}.${tld}`,
        `${name.replace(/a/g, "4")}.${tld}`,
        `${name.replace(/o/g, "0")}.${tld}`,
        `${name.replace(/i/g, "1")}.${tld}`,
    ];

    let resolvedCount = 0;
    for (const typo of typos) {
        const a = await safeResolve4(typo);
        if (a && a.length > 0) resolvedCount++;
        if (resolvedCount >= 3) break;
    }

    return {
        verdict: resolvedCount === 0 ? "safe" : "risk_detected",
        severity: resolvedCount === 0 ? "success" : "warning",
        count: resolvedCount,
    };
}

// --- New OSINT checks (teaser-only output downstream) ---
async function getPrimaryIp(domain: string): Promise<string | null> {
    const ips = await safeResolve4(domain);
    if (!ips || ips.length === 0) return null;
    return ips[0];
}

async function checkUrlhaus(domain: string): Promise<UrlhausResult> {
    if (!consumeUpstreamBudget("urlhaus")) {
        return { available: false, hits: 0 };
    }

    try {
        const res = await fetch("https://urlhaus-api.abuse.ch/v1/host/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ host: domain }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error("urlhaus failed");

        const data = await res.json() as { query_status?: string; urls?: unknown };
        if (data.query_status && data.query_status !== "ok") {
            return { available: true, hits: 0 };
        }

        const hits = Array.isArray(data.urls) ? data.urls.length : 0;
        return { available: true, hits };
    } catch {
        return { available: false, hits: 0 };
    }
}

async function checkThreatFox(domain: string): Promise<ThreatFoxResult> {
    if (!consumeUpstreamBudget("threatfox")) {
        return { available: false, hits: 0 };
    }

    try {
        const res = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: "search_ioc", search_term: domain }),
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!res.ok) throw new Error("threatfox failed");

        const data = await res.json() as { query_status?: string; data?: unknown };
        if (data.query_status && data.query_status !== "ok") {
            return { available: true, hits: 0 };
        }

        const hits = Array.isArray(data.data) ? data.data.length : 0;
        return { available: true, hits };
    } catch {
        return { available: false, hits: 0 };
    }
}

async function checkShodanInternetDb(ip: string | null): Promise<ShodanResult> {
    if (!ip) {
        return { available: false, portCount: 0, vulnCount: 0, vulns: [] };
    }

    if (!consumeUpstreamBudget("shodan")) {
        return { available: false, portCount: 0, vulnCount: 0, vulns: [] };
    }

    try {
        const res = await fetch(`https://internetdb.shodan.io/${ip}`, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (res.status === 404) {
            return { available: true, portCount: 0, vulnCount: 0, vulns: [] };
        }

        if (!res.ok) throw new Error("shodan failed");

        const data = await res.json() as { ports?: unknown; vulns?: unknown };
        const ports = Array.isArray(data.ports) ? data.ports : [];
        const vulns = Array.isArray(data.vulns)
            ? data.vulns.filter((item): item is string => typeof item === "string")
            : [];

        return {
            available: true,
            portCount: ports.length,
            vulnCount: vulns.length,
            vulns,
        };
    } catch {
        return { available: false, portCount: 0, vulnCount: 0, vulns: [] };
    }
}

async function getKevCves(): Promise<Set<string> | null> {
    if (kevCache && kevCache.expiresAt > Date.now()) {
        return kevCache.cves;
    }

    if (!consumeUpstreamBudget("kev")) {
        return kevCache?.cves ?? null;
    }

    try {
        const res = await fetch(KEV_FEED_URL, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            cache: "no-store",
        });
        if (!res.ok) throw new Error("kev feed failed");

        const data = await res.json() as { vulnerabilities?: unknown };
        const vulnerabilities = Array.isArray(data.vulnerabilities) ? data.vulnerabilities : [];
        const cves = new Set<string>();

        for (const item of vulnerabilities) {
            if (!item || typeof item !== "object") continue;
            const cve = (item as { cveID?: unknown }).cveID;
            if (typeof cve === "string" && cve.trim()) {
                cves.add(cve.trim().toUpperCase());
            }
        }

        kevCache = {
            cves,
            expiresAt: Date.now() + KEV_CACHE_TTL_MS,
        };

        return cves;
    } catch {
        return null;
    }
}

async function checkAbuseIpdb(ip: string | null): Promise<AbuseIpdbResult> {
    const key = process.env.ABUSEIPDB_API_KEY;
    if (!key || !ip) {
        return { available: false, abuseScore: null };
    }

    if (!consumeUpstreamBudget("abuseipdb")) {
        return { available: false, abuseScore: null };
    }

    try {
        const res = await fetch(`https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`, {
            headers: {
                Key: key,
                Accept: "application/json",
            },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });

        if (!res.ok) throw new Error("abuseipdb failed");

        const data = await res.json() as { data?: { abuseConfidenceScore?: unknown } };
        const rawScore = data.data?.abuseConfidenceScore;
        const abuseScore = typeof rawScore === "number" && Number.isFinite(rawScore) ? rawScore : null;

        return { available: true, abuseScore };
    } catch {
        return { available: false, abuseScore: null };
    }
}

async function checkThreatIntel(domain: string, ip: string | null): Promise<ThreatIntelResult> {
    const cacheKey = `${domain}|${ip ?? "no-ip"}`;
    const cached = threatIntelCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    if (threatIntelCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of threatIntelCache.entries()) {
            if (value.expiresAt < now) threatIntelCache.delete(key);
        }
    }

    const [urlhaus, threatfox, shodan, abuseipdb] = await Promise.all([
        checkUrlhaus(domain),
        checkThreatFox(domain),
        checkShodanInternetDb(ip),
        checkAbuseIpdb(ip),
    ]);

    let kevHits: number | null = null;
    if (shodan.vulnCount > 0) {
        const kevCves = await getKevCves();
        if (kevCves) {
            kevHits = shodan.vulns.reduce((sum, cve) => {
                return sum + (kevCves.has(cve.toUpperCase()) ? 1 : 0);
            }, 0);
        }
    }

    const result = {
        urlhaus,
        threatfox,
        shodan,
        abuseipdb,
        kevHits,
    };

    threatIntelCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + THREAT_INTEL_CACHE_TTL_MS,
    });

    return result;
}

// --- Mapping raw results to public teaser signals ---
function mapEmailSignal(raw: EmailSecurityResult): PublicSignal {
    if (raw.verdict === "protected") {
        return makeSignal("green", "Inga akuta indikationer på e-postkapning i ytläget.", "high");
    }

    if (raw.verdict === "partial") {
        return makeSignal("amber", "Identitetslagret visar svagheter som ofta utnyttjas i tidiga attacker.", "high");
    }

    if (raw.verdict === "not_protected") {
        return makeSignal("red", "Domänen kan sannolikt imiteras i kommunikationsflöden.", "high");
    }

    return makeSignal("gray", "Otillräcklig signal i gratisläget för e-postbedömning.", "low");
}

function mapBlacklistSignal(raw: BlacklistResult): PublicSignal {
    if (raw.verdict === "listed") {
        return makeSignal("red", "Negativa ryktessignaler hittades i öppna underrättelseflöden.", "high");
    }

    if (raw.verdict === "clean") {
        return makeSignal("green", "Ingen tydlig blocklistsignal i det publika ytskiktet just nu.", "medium");
    }

    return makeSignal("gray", "Ryktesbedömningen kunde inte verifieras i tid.", "low");
}

function mapTyposquatSignal(raw: TyposquatResult): PublicSignal {
    if (raw.verdict === "risk_detected") {
        if (raw.count >= 2) {
            return makeSignal("red", "Flera varumärkesliknande signaler kräver manuell verifiering.", "medium");
        }
        return makeSignal("amber", "Möjlig varumärkesförväxling upptäcktes i öppna källor.", "medium");
    }

    if (raw.verdict === "safe") {
        return makeSignal("green", "Ingen tydlig varumärkesförväxlingssignal i snabbkontrollen.", "medium");
    }

    return makeSignal("gray", "Varumärkeskartläggningen returnerade otillräcklig signal.", "low");
}

function mapDnsArmorSignal(raw: DnsArmorResult): PublicSignal {
    if (raw.verdict === "hardened") {
        return makeSignal("green", "Ytnivån visar modern DNS-armorering.", "high");
    }

    if (raw.verdict === "missing") {
        return makeSignal("amber", "Skyddslager saknas i DNS-ytan och bör valideras djupare.", "high");
    }

    return makeSignal("gray", "DNS-armoreringen kunde inte verifieras i detta pass.", "low");
}

function mapShadowInfraSignal(raw: ShadowInfraResult): PublicSignal {
    if (raw.verdict === "high_exposure") {
        return makeSignal("red", "Exponeringsmönster antyder större attackyta än vad som normalt syns internt.", "medium");
    }

    if (raw.verdict === "monitored") {
        return makeSignal("amber", "Utökad offentlig infrastrukturindikation hittad.", "medium");
    }

    if (raw.verdict === "stable") {
        return makeSignal("green", "Begränsat exponeringsavtryck i snabbanalysen.", "medium");
    }

    return makeSignal("gray", "Infrastrukturavtrycket kunde inte avgöras säkert.", "low");
}

function mapHistorySignal(raw: HistoryResult): PublicSignal {
    if (raw.verdict === "deep_history") {
        return makeSignal("amber", "Historiska spår antyder äldre ytor som kan kräva sanering.", "medium");
    }

    if (raw.verdict === "visible") {
        return makeSignal("amber", "Måttlig historisk exponering identifierad i öppna arkiv.", "medium");
    }

    if (raw.verdict === "minimal") {
        return makeSignal("green", "Lågt historiskt avtryck i publik arkivyta.", "medium");
    }

    return makeSignal("gray", "Historisk exponeringssignal saknas i detta pass.", "low");
}

function mapLiveThreatSignal(raw: ThreatIntelResult): PublicSignal {
    const urlhausHits = raw.urlhaus.hits;
    const threatfoxHits = raw.threatfox.hits;
    const abuseScore = raw.abuseipdb.abuseScore;

    const hasHighThreat = urlhausHits > 0 || threatfoxHits >= 3 || (typeof abuseScore === "number" && abuseScore >= 70);
    const hasMediumThreat = threatfoxHits > 0 || (typeof abuseScore === "number" && abuseScore >= 35);

    if (hasHighThreat) {
        return makeSignal("red", "Aktiva hotindikatorer syns i externa underrättelseflöden.", "high");
    }

    if (hasMediumThreat) {
        return makeSignal("amber", "Förhöjd hotsignal upptäckt. Kontext kräver djupare korrelation.", "medium");
    }

    if (raw.urlhaus.available || raw.threatfox.available || raw.abuseipdb.available) {
        return makeSignal("green", "Inga tydliga direktsignaler i de öppna hotflöden som hann svara.", "medium");
    }

    return makeSignal("gray", "Hotflöden svarade inte tillräckligt snabbt för säker bedömning.", "low");
}

function mapExposedServicesSignal(raw: ThreatIntelResult): PublicSignal {
    if (!raw.shodan.available) {
        return makeSignal("gray", "Exponeringskartan kunde inte laddas inom tidsfönstret.", "low");
    }

    if (raw.shodan.portCount >= 8) {
        return makeSignal("red", "Tjänsteexponeringen ser bred ut i publik infrastrukturyta.", "medium");
    }

    if (raw.shodan.portCount >= 3) {
        return makeSignal("amber", "Flera exponerade tjänster kräver validerad ägar- och riskkartläggning.", "medium");
    }

    return makeSignal("green", "Ingen bred tjänsteexponering i snabb OSINT-kontroll.", "medium");
}

function mapExploitedRiskSignal(raw: ThreatIntelResult): PublicSignal {
    if (!raw.shodan.available) {
        return makeSignal("gray", "Exploateringsrisken kunde inte bedömas med hög säkerhet.", "low");
    }

    if (typeof raw.kevHits === "number" && raw.kevHits > 0) {
        return makeSignal("red", "Signal matchar sårbarheter som prioriteras i verkliga intrång.", "high");
    }

    if (raw.shodan.vulnCount > 0) {
        return makeSignal("amber", "Sårbarhetssignal hittad i publik data. Prioritering kräver djupanalyspass.", "medium");
    }

    return makeSignal("green", "Ingen direkt exploateringssignal i tillgänglig publik metadata.", "medium");
}

function overallFromSignals(signals: PublicSignal[]): { overallVerdict: "secure" | "attention" | "risk"; pressureBand: "low" | "medium" | "high" } {
    const total = signals.reduce((sum, signal) => sum + bandScore(signal.verdict), 0);

    if (total >= 7) return { overallVerdict: "risk", pressureBand: "high" };
    if (total >= 3) return { overallVerdict: "attention", pressureBand: "medium" };
    return { overallVerdict: "secure", pressureBand: "low" };
}

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        const rateLimit = checkRateLimit(ip);
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: "För många förfrågningar. Försök igen om en minut." },
                {
                    status: 429,
                    headers: {
                        "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)),
                        "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
                        "X-RateLimit-Remaining": "0",
                    }
                }
            );
        }

        const { domain: inputDomain, turnstileToken } = await req.json();

        const secret = process.env.TURNSTILE_SECRET_KEY;
        if (!secret) {
            console.error("CRITICAL: TURNSTILE_SECRET_KEY is not configured.");
            return NextResponse.json({ error: "Säkerhetskonfiguration saknas. Kontakta administratören." }, { status: 500 });
        }

        if (process.env.NODE_ENV === "production") {
            const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
            if (isTurnstileTestSecret(secret) || (siteKey && isTurnstileTestSiteKey(siteKey))) {
                console.error("CRITICAL: Turnstile test keys are configured in production.");
                return NextResponse.json(
                    { error: "Säkerhetskonfiguration ogiltig för produktionsläge. Kontakta administratören." },
                    { status: 500 }
                );
            }
        }

        if (!turnstileToken) {
            return NextResponse.json({ error: "Captcha krävs" }, { status: 401 });
        }

        const verifyRes = await fetch(TURNSTILE_VERIFY_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ secret, response: turnstileToken }),
        });

        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
            return NextResponse.json({ error: "Captcha verifiering misslyckades" }, { status: 401 });
        }

        const validation = normalizeAndValidateDomain(inputDomain || "");
        if (!validation.valid || !validation.domain) {
            return NextResponse.json({ error: validation.error || "Ogiltig domän" }, { status: 400 });
        }

        const domain = validation.domain;
        const primaryIp = await getPrimaryIp(domain);

        const [emailRaw, blacklistRaw, typosquatRaw, dnsArmorRaw, shadowRaw, historyRaw, intelRaw] = await Promise.all([
            checkEmailSecurity(domain),
            checkBlacklists(domain),
            checkTyposquats(domain),
            checkDNSArmor(domain),
            checkShadowInfrastructure(domain),
            checkHistoricalFootprint(domain),
            checkThreatIntel(domain, primaryIp),
        ]);

        const emailSecurity = mapEmailSignal(emailRaw);
        const blacklist = mapBlacklistSignal(blacklistRaw);
        const typosquat = mapTyposquatSignal(typosquatRaw);
        const dnsArmor = mapDnsArmorSignal(dnsArmorRaw);
        const shadowInfra = mapShadowInfraSignal(shadowRaw);
        const history = mapHistorySignal(historyRaw);

        const liveThreat = mapLiveThreatSignal(intelRaw);
        const exposedServices = mapExposedServicesSignal(intelRaw);
        const exploitedRisk = mapExploitedRiskSignal(intelRaw);

        const allSignals = [
            emailSecurity,
            blacklist,
            typosquat,
            dnsArmor,
            shadowInfra,
            history,
            liveThreat,
            exposedServices,
            exploitedRisk,
        ];

        const { overallVerdict, pressureBand } = overallFromSignals(allSignals);

        return NextResponse.json({
            domain,
            timestamp: new Date().toISOString(),
            overallVerdict,
            pressureBand,
            reportClassified: true,
            emailSecurity,
            blacklist,
            typosquat,
            dnsArmor,
            shadowInfra,
            history,
            liveThreat,
            exposedServices,
            exploitedRisk,
            lockedModules: [
                { key: "portscan", collected: false },
                { key: "cve-correlation", collected: false },
                { key: "subdomain-map", collected: false },
                { key: "waf-bypass", collected: false },
                { key: "active-vuln-test", collected: false },
                { key: "api-review", collected: false },
            ],
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internt serverfel" }, { status: 500 });
    }
}
