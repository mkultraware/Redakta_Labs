import { NextRequest, NextResponse } from "next/server";
import dns from "dns";
import { promisify } from "util";

// Promisified DNS with timeout wrapper
const resolveTxt = promisify(dns.resolveTxt);
const resolveMx = promisify(dns.resolveMx);
const resolve4 = promisify(dns.resolve4);

const DNS_TIMEOUT_MS = 2000;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// --- Rate Limiting (in-memory, per serverless instance) ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;     // 10 requests per minute per IP

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(ip);

    // Clean up expired entries periodically
    if (rateLimitStore.size > 1000) {
        for (const [key, value] of rateLimitStore.entries()) {
            if (value.resetAt < now) rateLimitStore.delete(key);
        }
    }

    if (!entry || entry.resetAt < now) {
        // New window
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, resetIn: RATE_LIMIT_WINDOW_MS };
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetIn: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count, resetIn: entry.resetAt - now };
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
    const ipToLong = (ip: string) => ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
    const target = ipToLong(ip);

    for (const range of CLOUDFLARE_IPS) {
        const [base, mask] = range.split('/');
        const bitmask = (0xffffffff << (32 - parseInt(mask, 10))) >>> 0;
        if ((ipToLong(base) & bitmask) === (target & bitmask)) return true;
    }
    return false;
}

// --- Domain Validation with XSS Sanitization ---
function normalizeAndValidateDomain(input: string) {
    if (!input || typeof input !== "string") return { valid: false, error: "Domän krävs" };

    // XSS Sanitization: Strip HTML/script tags and dangerous patterns
    let domain = input
        .replace(/<[^>]*>/g, "")           // Remove HTML tags
        .replace(/javascript:/gi, "")       // Remove javascript: protocol
        .replace(/on\w+=/gi, "")            // Remove event handlers (onclick=, onerror=, etc.)
        .replace(/[<>"'`]/g, "")            // Remove characters used in XSS
        .trim()
        .toLowerCase();

    // Normalize: strip protocol, paths, query strings, fragments, ports
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
        if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(label) && !/^[a-z0-9]$/i.test(label)) return { valid: false, error: "Ogiltig domän - otillåtna tecken" };
    }
    return { valid: true, domain };
}

// --- DNS Helpers ---
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), ms));
    return Promise.race([promise, timeout]);
}

async function safeResolveTxt(domain: string) { try { return await withTimeout(resolveTxt(domain), DNS_TIMEOUT_MS); } catch { return null; } }
async function safeResolveMx(domain: string) { try { return await withTimeout(resolveMx(domain), DNS_TIMEOUT_MS); } catch { return null; } }
async function safeResolve4(domain: string) { try { return await withTimeout(resolve4(domain), DNS_TIMEOUT_MS); } catch { return null; } }

// --- Advanced Email Security Check (from sekura_avm.py) ---
async function checkEmailSecurity(domain: string) {
    const mx = await safeResolveMx(domain);
    const hasMX = mx !== null && mx.length > 0;

    // If no MX records, email spoofing is less relevant (but not zero risk)
    if (!hasMX) {
        return { verdict: "not_applicable", severity: "info", riskLevel: 0 };
    }

    const txt = await safeResolveTxt(domain);
    const spfRecord = txt?.flat().find(r => r.toLowerCase().startsWith("v=spf1"));
    const hasSPF = !!spfRecord;

    // SPF enforcement level (from sekura_avm.py logic)
    let spfEnforcement: "strict" | "soft" | "neutral" | "none" = "none";
    if (spfRecord) {
        if (spfRecord.toLowerCase().includes("-all")) spfEnforcement = "strict";
        else if (spfRecord.toLowerCase().includes("~all")) spfEnforcement = "soft";
        else if (spfRecord.toLowerCase().includes("?all")) spfEnforcement = "neutral";
    }

    const dmarcTxt = await safeResolveTxt(`_dmarc.${domain}`);
    const dmarcRecord = dmarcTxt?.flat().find(r => r.toLowerCase().startsWith("v=dmarc1"));
    const hasDMARC = !!dmarcRecord;

    // DMARC policy extraction (from sekura_avm.py logic)
    let dmarcPolicy: "reject" | "quarantine" | "none" | "missing" = "missing";
    if (dmarcRecord) {
        if (dmarcRecord.toLowerCase().includes("p=reject")) dmarcPolicy = "reject";
        else if (dmarcRecord.toLowerCase().includes("p=quarantine")) dmarcPolicy = "quarantine";
        else if (dmarcRecord.toLowerCase().includes("p=none")) dmarcPolicy = "none";
    }

    // Determine overall verdict (from sekura_avm.py logic)
    if (dmarcPolicy === "reject" || dmarcPolicy === "quarantine") {
        return { verdict: "protected", severity: "success", riskLevel: 0 };
    } else if (dmarcPolicy === "none") {
        // p=none is a CRITICAL RISK - it allows spoofing!
        return { verdict: "not_protected", severity: "critical", riskLevel: 3 };
    } else if (hasSPF && spfEnforcement === "strict") {
        // SPF with hard fail but no DMARC
        return { verdict: "partial", severity: "warning", riskLevel: 1 };
    } else if (hasSPF && (spfEnforcement === "soft" || spfEnforcement === "neutral")) {
        // SPF with soft/neutral is weak
        return { verdict: "partial", severity: "warning", riskLevel: 2 };
    } else {
        // No protection at all
        return { verdict: "not_protected", severity: "critical", riskLevel: 3 };
    }
}

// --- Advanced Blacklist Check (from sekura_avm.py) ---
async function checkBlacklists(domain: string) {
    const ips = await safeResolve4(domain);
    if (!ips || ips.length === 0) return { verdict: "clean", severity: "success", listedCount: 0 };

    const ip = ips[0];
    const isCDN = isCloudflareIP(ip);
    const reversedIP = ip.split(".").reverse().join(".");
    let ipListedCount = 0;
    let domainListedCount = 0;
    let ignoredCount = 0;

    // Check IP blacklists
    // Lists known to frequently flag shared CDN infrastructure
    const CDN_AGGRESSIVE_LISTS = [
        "dnsbl-1.uceprotect.net",
        "dnsbl.sorbs.net",
        "spam.dnsbl.sorbs.net",
        "b.barracudacentral.org"
    ];

    for (const bl of IP_BLACKLISTS) {
        const result = await safeResolve4(`${reversedIP}.${bl}`);
        if (result && result.length > 0) {
            // HEURISTIC: Skip aggressive lists for CDN IPs as they are frequent false positives
            if (isCDN && CDN_AGGRESSIVE_LISTS.includes(bl)) {
                console.info(`[CDN BYPASS] Ignoring ${bl} hit for Cloudflare IP ${ip}`);
                ignoredCount++;
                continue;
            }
            console.warn(`[BLACKLIST HIT] IP ${ip} listed on ${bl}`);
            ipListedCount++;
        }
    }

    // Check domain blacklists
    for (const bl of DOMAIN_BLACKLISTS) {
        const result = await safeResolve4(`${domain}.${bl}`);
        if (result && result.length > 0) {
            console.warn(`[BLACKLIST HIT] Domain ${domain} listed on ${bl}`);
            domainListedCount++;
        }
    }

    const totalListed = ipListedCount + domainListedCount;
    if (totalListed > 0) {
        return { verdict: "listed", severity: "critical", listedCount: totalListed };
    }

    if (isCDN && ignoredCount > 0) {
        return {
            verdict: "clean",
            severity: "success",
            listedCount: 0,
            note: "Infrastruktur skyddad via CDN (delad IP). Aggressiva signaler ignorerade."
        };
    }

    return { verdict: "clean", severity: "success", listedCount: 0 };
}

// --- Typosquat Check (simplified) ---
async function checkTyposquats(domain: string) {
    const parts = domain.split(".");
    const name = parts.slice(0, -1).join(".");
    const tld = parts[parts.length - 1];
    const typos: string[] = [
        name + "s." + tld,
        name.slice(0, -1) + "." + tld,
        "ww" + name + "." + tld,
        name.replace(/a/g, "4") + "." + tld,
        name.replace(/o/g, "0") + "." + tld,
        name.replace(/i/g, "1") + "." + tld,
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
        count: resolvedCount
    };
}

export async function POST(req: NextRequest) {
    try {
        // Get client IP (works on Netlify/Vercel)
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || req.headers.get("x-real-ip")
            || "unknown";

        // Rate Limit Check
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

        // Turnstile Verification (Fail-Closed)
        const secret = process.env.TURNSTILE_SECRET_KEY;
        if (!secret) {
            console.error("CRITICAL: TURNSTILE_SECRET_KEY is not configured.");
            return NextResponse.json({ error: "Säkerhetskonfiguration saknas. Kontakta administratören." }, { status: 500 });
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
        const [emailSecurity, blacklist, typosquat] = await Promise.all([
            checkEmailSecurity(domain),
            checkBlacklists(domain),
            checkTyposquats(domain),
        ]);

        // Calculate overall risk score (obfuscated)
        const totalRisk = emailSecurity.riskLevel + blacklist.listedCount + typosquat.count;
        let overallVerdict: "secure" | "attention" | "risk" = "secure";
        if (totalRisk >= 3) overallVerdict = "risk";
        else if (totalRisk >= 1) overallVerdict = "attention";

        return NextResponse.json({
            domain,
            timestamp: new Date().toISOString(),
            overallVerdict,
            emailSecurity,
            blacklist,
            typosquat,
        });
    } catch (error) {
        console.error("API Error:", error);
        return NextResponse.json({ error: "Internt serverfel" }, { status: 500 });
    }
}
