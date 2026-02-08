"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DomainInput from "@/components/DomainInput";
import VerdictCard from "@/components/VerdictCard";
import SkeletonLoader from "@/components/SkeletonLoader";

interface ScanResult {
  domain: string;
  timestamp: string;
  overallVerdict: "secure" | "attention" | "risk";
  emailSecurity: { verdict: string; severity: string; riskLevel: number };
  blacklist: { verdict: string; severity: string; listedCount: number };
  typosquat: { verdict: string; severity: string; count: number };
  dnsArmor: { verdict: string; severity: string; riskLevel: number };
  shadowInfra: { verdict: string; severity: string; count: number };
  history: { verdict: string; severity: string; count: number };
}

export default function Home() {
  const [isPreLoading, setIsPreLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState(""); // eslint-disable-line @typescript-eslint/no-unused-vars
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPreLoading && terminalRef.current) {
      terminalRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isPreLoading]);

  const handleSubmit = async (domain: string, turnstileToken: string) => {
    setCurrentDomain(domain);
    setIsPreLoading(true);
    setError(null);
    setReport(null);
    setTerminalLines([]);

    // Artificial terminal sequence
    const sequence = [
      `> INITIALIZING PASSIVE_PROBE...`,
      `> TARGET: ${domain}`,
      `> MODE: STATELESS / NON-INTRUSIVE`,
      `> BYPASSING ACTIVE FIREWALL CHECKS... [SKIPPED]`,
      `> BYPASSING VULNERABILITY INJECTION... [SKIPPED]`,
      `> FETCHING PUBLIC HEADERS... DONE.`,
      `> RENDER_RESULTS(SURFACE_ONLY);`
    ];

    for (let i = 0; i < sequence.length; i++) {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
      setTerminalLines(prev => [...prev, sequence[i]]);
    }

    await new Promise(r => setTimeout(r, 800));
    setIsPreLoading(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/quickcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, turnstileToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Ett fel uppstod. Försök igen.");
        return;
      }

      const data = await response.json();
      setReport(data);
    } catch {
      setError("Kunde inte ansluta till servern. Försök igen.");
    } finally {
      setIsLoading(false);
    }
  };

  const getVerdictLabel = (verdict: string, _type: string) => {
    if (verdict === "protected" || verdict === "clean" || verdict === "safe" || verdict === "hardened" || verdict === "stable" || verdict === "minimal") return "KONTROLL OK";
    if (verdict === "partial" || verdict === "risk_detected" || verdict === "monitored" || verdict === "visible") return "OSÄKER SIGNAL";
    if (verdict === "not_protected" || verdict === "listed" || verdict === "high_exposure" || verdict === "deep_history" || verdict === "missing") return "INDIKERAD RISK";
    return "ANALYS KRÄVS";
  };

  const getVerdictType = (severity: string): "success" | "warning" | "error" | "neutral" => {
    if (severity === "success") return "success";
    if (severity === "warning") return "warning";
    if (severity === "critical") return "error";
    return "neutral";
  };

  const getObfuscatedMessage = (type: string, verdict: string, count?: number) => {
    if (type === "email") {
      if (verdict === "protected") return "Integritet bekräftad via passiv kontroll.";
      if (verdict === "partial") return "Instabilitet i autentiseringen upptäckt.";
      if (verdict === "not_protected") return "Kritiska brister i identitetslagret bekräftade.";
      return "Identitetslagret dolt eller ej aktivt.";
    }
    if (type === "blacklist") {
      if (verdict === "clean") return "Inga hotspots identifierade via publika index.";
      return "Negativa signaler hittade i ryktestabeller.";
    }
    if (type === "typosquat") {
      if (verdict === "safe") return "No public DNS matches found in surface-zones.";
      return "Phishing-vektorer bekräftade via certifikatindex.";
    }
    if (type === "dnsArmor") {
      if (verdict === "hardened") return "Modern armering (CAA) detekterad på domänen.";
      return "Domänen saknar moderna spärrar mot resurs-kapning.";
    }
    if (type === "shadowInfra") {
      if (verdict === "stable") return `Minimal exponering (${count || 0} identifierare).`;
      return `Hittade ${count || 0} noder i CT-loggar. Potentiellt oskyddade dörrar.`;
    }
    if (type === "history") {
      if (verdict === "minimal") return "Minimalt avtryck i historiska arkiv.";
      return `Hittade ${count || 0} noder i arkiven. Gamla sårbarheter kan finnas kvar.`;
    }
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-slate-200">
      <Header />

      <main className="flex-1 px-3 sm:px-6 py-12 lg:py-32 overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
          {/* Tactical Header / Console Layout */}
          <section className="animate-in fade-in duration-700 bg-grid-subtle py-8 rounded-none border-b border-slate-300">
            <div className="card-premium p-5 md:p-16 text-left relative overflow-hidden">
              {/* Mechanical Stamp/Lens Overlay */}
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <Image
                  src="/sekura.svg"
                  alt="Sekura stamp"
                  width={140}
                  height={140}
                  className="grayscale rotate-12"
                />
              </div>

              <div className="inline-flex items-center gap-2 mb-8 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <span className="h-1.5 w-1.5 bg-blue-500 block"></span>
                REDAKTA LABS // ANALYS
              </div>

              <div className="grid lg:grid-cols-[1fr,300px] gap-12 items-center">
                <div className="space-y-8">
                  <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tighter text-slate-900 uppercase leading-[0.85] font-mono break-words">
                    SÄKRA DIN <br />
                    <span className="text-blue-600">DOMÄNHÄLSA.</span>
                  </h1>
                  <p className="max-w-xl text-base sm:text-lg text-slate-500 font-medium leading-tight border-l-2 border-slate-200 pl-4 sm:pl-6">
                    Identifierar indikativa signaler och potentiella risker via publika datakällor.
                    <br />
                    <span className="text-xs uppercase font-mono text-slate-400 mt-2 block">STATUS: YTANALYS</span>
                  </p>
                  <div className="pt-4">
                    <DomainInput onSubmit={handleSubmit} isLoading={isPreLoading || isLoading} />
                  </div>
                </div>

                <div>{/* Spacing for layout balance */}</div>
              </div>
            </div>
          </section>

          {/* Terminal Loader */}
          {isPreLoading && (
            <div ref={terminalRef} className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 scroll-mt-20">
              <div className="terminal-loader">
                {terminalLines.map((line, i) => (
                  <div key={i} className="terminal-line">{line}</div>
                ))}
                <div className="terminal-cursor font-mono"></div>
              </div>
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                Ladda ner Labs Core v2.4...
              </p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="max-w-xl mx-auto py-5 px-8 rounded-full bg-rose-50 border border-rose-100 flex items-center gap-4 text-rose-600 font-bold text-sm shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-5 h-5">
                <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
              </svg>
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="max-w-3xl mx-auto">
              <SkeletonLoader />
            </div>
          )}

          {/* Results Header */}
          {report && !isLoading && !isPreLoading && (
            <section className="relative animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
              <div className="space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b-2 border-slate-900 border-double">
                  <div className="space-y-3 min-w-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white font-mono text-[10px] uppercase font-bold tracking-widest w-fit">
                      RESULT_REPORT_EXPORT
                    </div>
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase font-mono break-all leading-none">
                      {report.domain}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono truncate">
                      TIMESTAMP: {new Date(report.timestamp).toISOString()}
                    </p>
                  </div>
                  <div className={`px-5 py-3 sm:px-8 sm:py-4 border-2 font-mono text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] w-fit ${report.overallVerdict === "secure"
                    ? "bg-emerald-50 border-emerald-900 text-emerald-900"
                    : report.overallVerdict === "attention"
                      ? "bg-amber-50 border-amber-900 text-amber-900"
                      : "bg-rose-50 border-rose-900 text-rose-900"
                    }`}>
                    {report.overallVerdict === "secure" ? "LÅG INDIKATIV RISK" : report.overallVerdict === "attention" ? "EXPONERAD ATTACKYTA" : "GRANSKNING REKOMMENDERAS"}
                  </div>
                </div>

                {/* Primary Scan Results */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Depth Gauge - Fixed Right for results */}
                  <div className="hidden lg:block absolute -left-20 top-0 h-full">
                    <div className="sticky top-40 flex flex-col items-center gap-4">
                      <div className="depth-gauge-container">
                        <div className="depth-section depth-active" />
                        <div className="depth-section depth-inactive" />
                        <div className="depth-section depth-inactive" />
                      </div>
                      <span className="[writing-mode:vertical-lr] rotate-180 text-[10px] font-black uppercase tracking-widest text-slate-400 whitespace-nowrap font-mono">
                        Djuppnivå: Yta
                      </span>
                    </div>
                  </div>

                  <VerdictCard
                    title="IDENTITETSLAGER"
                    verdict={getVerdictLabel(report.emailSecurity.verdict, "email")}
                    verdictType={getVerdictType(report.emailSecurity.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    }
                    details={getObfuscatedMessage("email", report.emailSecurity.verdict)}
                  />

                  <VerdictCard
                    title="RYKTE & RYKTBARHET"
                    verdict={getVerdictLabel(report.blacklist.verdict, "blacklist")}
                    verdictType={getVerdictType(report.blacklist.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
                    }
                    details={getObfuscatedMessage("blacklist", report.blacklist.verdict)}
                  />

                  <VerdictCard
                    title="BRAND DEFLECTION"
                    verdict={getVerdictLabel(report.typosquat.verdict, "typosquat")}
                    verdictType={getVerdictType(report.typosquat.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    }
                    details={getObfuscatedMessage("typosquat", report.typosquat.verdict)}
                  />

                  <VerdictCard
                    title="DNS ARMOR"
                    verdict={getVerdictLabel(report.dnsArmor.verdict, "dnsArmor")}
                    verdictType={getVerdictType(report.dnsArmor.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m12 8 4 4-4 4" /><path d="M8 12h8" /></svg>
                    }
                    details={getObfuscatedMessage("dnsArmor", report.dnsArmor.verdict)}
                  />

                  <VerdictCard
                    title="SHADOW INFRASTRUCTURE"
                    verdict={getVerdictLabel(report.shadowInfra.verdict, "shadowInfra")}
                    verdictType={getVerdictType(report.shadowInfra.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                    }
                    details={getObfuscatedMessage("shadowInfra", report.shadowInfra.verdict, report.shadowInfra.count)}
                  />

                  <VerdictCard
                    title="GHOST FOOTPRINT"
                    verdict={getVerdictLabel(report.history.verdict, "history")}
                    verdictType={getVerdictType(report.history.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    }
                    details={getObfuscatedMessage("history", report.history.verdict, report.history.count)}
                  />
                </div>

                {/* Secondary row - Locked/Redacted Cards */}
                <div className="pt-20 space-y-10">
                  <div className="flex items-center gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300 font-mono">
                      Aktiv Sondering - Kräver Djupnivå
                    </h3>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <VerdictCard
                      title="PORTSKANNING"
                      verdict="LÅST"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                      }
                      details="Aktiv sondering efter öppna bakdörrar kräver djuppnivå. Hacker-skript gör detta 24/7. Vet du vad de ser?"
                    />

                    <VerdictCard
                      title="CVE-KORRELERING"
                      verdict="INGEN DATA"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4" /><path d="m3.34 19 8.66-8.66" /><path d="m20.66 19-8.66-8.66" /><circle cx="12" cy="10" r="2" /><circle cx="12" cy="21" r="2" /><circle cx="3" cy="21" r="2" /><circle cx="21" cy="21" r="2" /><circle cx="12" cy="2" r="2" /></svg>
                      }
                      details="Identifiering av kända sårbarheter i din mjukvarustack. Kräver versions-analys via Sekura-core."
                    />

                    <VerdictCard
                      title="SUBDOMÄNS-KARTA"
                      verdict="DOLD"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m12 8 4 4-4 4" /><path d="M8 12h8" /></svg>
                      }
                      details="Djupkartering ser ALLT hackers ser. Boka audi för full insyn."
                    />

                    <VerdictCard
                      title="CDN/WAF ANALYS"
                      verdict="OÅTKOMLIG"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                      details="Verifiering av brandväggsskydd och bypass-vektorer. Kritisk för att stoppa automatiserade attacker."
                    />

                    <VerdictCard
                      title="SÅRBARHETS-TEST"
                      verdict="INAKTIV"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.3-4.3" /><path d="M11 8 7 12l4 4" /><path d="m13 8 4 4-4 4" /></svg>
                      }
                      details="Simulerade attacker för att hitta dolda ingångar. Sekura utför dessa under kontrollerade former."
                    />

                    <VerdictCard
                      title="API-GRANSKNING"
                      verdict="LÅST"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      }
                      details="API-läckage är den vanligaste orsaken till dataförlust. Kräver auktoriserad fullskalig analys."
                    />
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="card-premium p-8 md:p-32 text-center space-y-12 mt-32 relative overflow-hidden bg-slate-50 border-2 border-slate-900 shadow-[12px_12px_0px_0px_rgba(15,23,42,0.1)] rounded-none">
                  <div className="absolute top-0 left-0 w-full h-1 bg-slate-900" />
                  <div className="space-y-6 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase font-mono leading-none">
                      DJUPARE ANALYS <br />
                      <span className="text-blue-600">REKOMMENDERAS.</span>
                    </h2>
                    <p className="max-w-xl mx-auto text-lg text-slate-500 font-mono font-bold leading-tight uppercase border-y border-slate-200 py-4">
                      Identifierade riskvektorer kräver auktoriserat djupprovning för fullständig mitigering.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
                    <a
                      href="https://sekura.se"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-apple text-lg px-12 py-4 shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                    >
                      BOKA_DIAGNOS
                    </a>
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest text-left space-y-1">
                      <div>{/* SESSION_ID */} {Math.random().toString(36).substring(7).toUpperCase()}</div>
                      <div>{/* STATUS */} READY_FOR_DEEP_SCAN</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Why is this important section */}
          <section id="varfor" className="mt-24 scroll-mt-32 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 border-t border-slate-100 pt-24">
            <div className="grid md:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight md:tracking-tighter text-slate-900 uppercase font-mono leading-[0.95]">
                  Cyberbrottslighet <br />
                  <span className="text-rose-500">Diskriminerar Inte.</span>
                </h2>
                <div className="space-y-6 text-lg text-slate-500 font-medium leading-relaxed border-l-2 border-slate-200 pl-8">
                  <p>
                    Över <span className="text-slate-900 font-bold">70%</span> av alla cyberattacker i Sverige börjar med nätfiske.
                    Din domän är ditt ansikte utåt – och hackers första angreppspunkt.
                  </p>
                  <p>
                    Automatiserade skript letar konstant efter de lättaste ingångshålen.
                    En felkonfigurerad server eller en oskyddad identitet är en öppen inbjudan till intrång.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4">
                  <div className="text-3xl font-black text-slate-900 font-mono">1/3</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    Av svenska företag har drabbats av intrångsförsök senaste året.
                  </p>
                </div>
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4">
                  <div className="text-3xl font-black text-rose-500 font-mono">91%</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    Av nätfiske-attacker riktas mot personalens identitetsbrister.
                  </p>
                </div>
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4 rounded-none">
                  <div className="text-3xl font-black text-slate-900 font-mono">24/7</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    Hotbilden är konstant. Hackers skannar nätet dygnet runt.
                  </p>
                </div>
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4 rounded-none">
                  <div className="text-3xl font-black text-slate-900 font-mono">100%</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    PRIVAT SÖKNING. VI SPARAR INGEN DATA OM DITT TARGET.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Intro Grid */}
          {!report && !isLoading && !isPreLoading && (
            <div className="grid md:grid-cols-3 gap-16 pt-20 border-t border-slate-50">
              {[
                { title: "Stateless / Alpha", desc: "Vi sparar ingen target-data. Din sökning lämnar inga spår i våra system." },
                { title: "Non-Intrusive", desc: "Ingen aktiv skanning utförs. Vi analyserar endast publika infrastruktursignaler." },
                { title: "Labs Mode", desc: "Resultaten är vägledande indikationer för vidare säkerhetsrevision." },
              ].map((feature) => (
                <div key={feature.title} className="space-y-4">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-900 border-l-3 border-slate-900 pl-6 font-mono">
                    {feature.title}
                  </h4>
                  <p className="text-[13px] text-slate-400 font-medium leading-relaxed pl-6">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          )}

          <section className="pt-20">
            <div className="card-premium p-6 sm:p-8 md:p-10 glass border-slate-100/50">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div className="space-y-3 max-w-3xl">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">
                    Ny funktion
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase font-mono">
                    Internetprognos för Sverige
                  </h3>
                  <p className="text-sm sm:text-base text-slate-500 font-medium leading-relaxed">
                    Se en snabb och enkel lägesbild av internetturbulens i Sverige, baserad på öppna BGP-data i realtid.
                    Perfekt för att förstå om läget är lugnt, blåsigt eller stormigt just nu.
                  </p>
                </div>
                <a
                  href="/internet-weather"
                  className="btn-apple px-7 py-3.5 shadow-sm whitespace-nowrap text-sm sm:text-base uppercase tracking-[0.15em]"
                >
                  Öppna Internetprognos
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

