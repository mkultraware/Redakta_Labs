"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import DomainInput from "@/components/DomainInput";
import VerdictCard from "@/components/VerdictCard";
import SkeletonLoader from "@/components/SkeletonLoader";
import LightModePreviewCard from "@/components/LightModePreviewCard";

interface ScanResult {
  domain: string;
  timestamp: string;
  overallVerdict: "secure" | "attention" | "risk";
  pressureBand: "low" | "medium" | "high";
  reportClassified: boolean;
  emailSecurity: PublicSignal;
  blacklist: PublicSignal;
  typosquat: PublicSignal;
  dnsArmor: PublicSignal;
  shadowInfra: PublicSignal;
  history: PublicSignal;
  liveThreat: PublicSignal;
  exposedServices: PublicSignal;
  exploitedRisk: PublicSignal;
}

interface PublicSignal {
  verdict: "green" | "amber" | "red" | "gray";
  severity: "success" | "warning" | "error" | "neutral";
  teaser: string;
  confidence: "high" | "medium" | "low";
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

    // Loading sequence for perceived progress while backend checks run
    const sequence = [
      `> Startar passiv ytanalys`,
      `> Måldomän registrerad: ${domain}`,
      `> Verifierar förfrågan och sessionsskydd`,
      `> Hämtar DNS- och ryktessignaler`,
      `> Korrelerar öppna hotflöden`,
      `> Klassificerar förhandsrapport`,
      `> Resultat klart för visning`
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

  const getVerdictLabel = (verdict: PublicSignal["verdict"]) => {
    if (verdict === "green") return "KONTROLL OK";
    if (verdict === "amber") return "OSÄKER SIGNAL";
    if (verdict === "red") return "INDIKERAD RISK";
    return "ANALYS KRÄVS";
  };

  const getVerdictType = (severity: PublicSignal["severity"]): "success" | "warning" | "error" | "neutral" => severity;

  return (
    <div className="min-h-screen flex flex-col selection:bg-slate-200">
      <Header />

      <main className="flex-1 px-3 sm:px-6 py-12 lg:py-32 overflow-x-hidden">
        <div className="max-w-5xl mx-auto">
          {/* Tactical Header / Console Layout */}
          <section className="animate-in fade-in duration-700 py-8 rounded-none border-b border-slate-300">
            <div className="card-premium p-5 sm:p-8 md:p-12 text-left relative overflow-hidden">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                <div className="space-y-6">
                  <h1 className="font-tech text-3xl sm:text-4xl md:text-5xl font-black tracking-[-0.03em] text-slate-900 leading-[1.02] break-words">
                    Passiv domänanalys för svenska verksamheter.
                    <br />
                    <span className="text-blue-600">Förhandsrapport på under 30 sekunder.</span>
                  </h1>
                  <p className="font-tech max-w-2xl text-base sm:text-lg text-slate-600 font-medium leading-snug border-l-2 border-slate-200 pl-4 sm:pl-6">
                    Du får en operativ riskradar baserad på öppna signaler i realtid.
                    Förhandsvyn är byggd för snabba beslut, medan tekniska verifieringar säkras i nästa analyssteg.
                  </p>

                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest font-mono">
                    <span className="px-3 py-1 border border-slate-200 text-slate-600 bg-white">Status: Ytanalys</span>
                    <span className="px-3 py-1 border border-slate-200 text-slate-600 bg-white">Publika datakällor</span>
                    <span className="px-3 py-1 border border-slate-200 text-slate-600 bg-white">Ingen aktiv scanning</span>
                  </div>

                  <div className="pt-2">
                    <DomainInput onSubmit={handleSubmit} isLoading={isPreLoading || isLoading} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                  <div className="border border-slate-200 bg-white px-4 py-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Analystyp</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase font-mono">Passiv yta</p>
                  </div>
                  <div className="border border-slate-200 bg-white px-4 py-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Databredd</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase font-mono">DNS + OSINT</p>
                  </div>
                  <div className="border border-slate-200 bg-white px-4 py-3 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">Leverans</p>
                    <p className="text-xs sm:text-sm font-bold text-slate-800 uppercase font-mono">Klassificerad förhandsvy</p>
                  </div>

                  <a
                    href="https://www.sekura.se"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-slate-900 bg-white px-4 py-3 space-y-2 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.18)] transition-colors hover:bg-slate-50"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">Powered by</p>
                    <div className="flex items-center justify-between gap-3">
                      <Image
                        src="/sekura.svg"
                        alt="SEKURA.SE"
                        width={92}
                        height={28}
                        className="h-7 w-auto opacity-90"
                      />
                      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-800 font-mono">SEKURA.SE</span>
                    </div>
                  </a>

                  <div className="sm:col-span-2 lg:col-span-1">
                    <LightModePreviewCard />
                  </div>
                </div>
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
                Sammanställer förhandsrapport...
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
                    verdict={getVerdictLabel(report.emailSecurity.verdict)}
                    verdictType={getVerdictType(report.emailSecurity.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                    }
                    details={report.emailSecurity.teaser}
                  />

                  <VerdictCard
                    title="RYKTE & RYKTBARHET"
                    verdict={getVerdictLabel(report.blacklist.verdict)}
                    verdictType={getVerdictType(report.blacklist.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
                    }
                    details={report.blacklist.teaser}
                  />

                  <VerdictCard
                    title="VARUMÄRKESSKYDD"
                    verdict={getVerdictLabel(report.typosquat.verdict)}
                    verdictType={getVerdictType(report.typosquat.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                    }
                    details={report.typosquat.teaser}
                  />

                  <VerdictCard
                    title="DNS-SKYDD"
                    verdict={getVerdictLabel(report.dnsArmor.verdict)}
                    verdictType={getVerdictType(report.dnsArmor.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m12 8 4 4-4 4" /><path d="M8 12h8" /></svg>
                    }
                    details={report.dnsArmor.teaser}
                  />

                  <VerdictCard
                    title="SKUGGINFRASTRUKTUR"
                    verdict={getVerdictLabel(report.shadowInfra.verdict)}
                    verdictType={getVerdictType(report.shadowInfra.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                    }
                    details={report.shadowInfra.teaser}
                  />

                  <VerdictCard
                    title="HISTORISKT AVTRYCK"
                    verdict={getVerdictLabel(report.history.verdict)}
                    verdictType={getVerdictType(report.history.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                    }
                    details={report.history.teaser}
                  />

                  <VerdictCard
                    title="LIVE HOTINTEL"
                    verdict={getVerdictLabel(report.liveThreat.verdict)}
                    verdictType={getVerdictType(report.liveThreat.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="m2 12 20 0" /><path d="m5 5 14 14" /><path d="m19 5-14 14" /></svg>
                    }
                    details={report.liveThreat.teaser}
                  />

                  <VerdictCard
                    title="EXPONERADE TJÄNSTER"
                    verdict={getVerdictLabel(report.exposedServices.verdict)}
                    verdictType={getVerdictType(report.exposedServices.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="8" x="2" y="3" rx="2" /><rect width="20" height="8" x="2" y="13" rx="2" /><path d="M6 7h.01" /><path d="M6 17h.01" /></svg>
                    }
                    details={report.exposedServices.teaser}
                  />

                  <VerdictCard
                    title="EXPLOATERINGSRISK"
                    verdict={getVerdictLabel(report.exploitedRisk.verdict)}
                    verdictType={getVerdictType(report.exploitedRisk.severity)}
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6" /><path d="m15 9-6 6" /></svg>
                    }
                    details={report.exploitedRisk.teaser}
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
                      details="Ej körd i gratisläge. Aktiv sondering startas först i auktoriserad djupprovning."
                    />

                    <VerdictCard
                      title="CVE-KORRELERING"
                      verdict="INGEN DATA"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4" /><path d="m3.34 19 8.66-8.66" /><path d="m20.66 19-8.66-8.66" /><circle cx="12" cy="10" r="2" /><circle cx="12" cy="21" r="2" /><circle cx="3" cy="21" r="2" /><circle cx="21" cy="21" r="2" /><circle cx="12" cy="2" r="2" /></svg>
                      }
                      details="Ej körd i gratisläge. Full CVE-korrelation kräver versionsfingerprinting och verifierad scope."
                    />

                    <VerdictCard
                      title="SUBDOMÄNS-KARTA"
                      verdict="DOLD"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m12 8 4 4-4 4" /><path d="M8 12h8" /></svg>
                      }
                      details="Ej körd i gratisläge. Djupkartering av subdomäner aktiveras först i betald analys."
                    />

                    <VerdictCard
                      title="CDN/WAF ANALYS"
                      verdict="OÅTKOMLIG"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                      details="Ej körd i gratisläge. Bypass- och edge-analys kräver aktiv verifiering mot skyddslagret."
                    />

                    <VerdictCard
                      title="SÅRBARHETS-TEST"
                      verdict="INAKTIV"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.3-4.3" /><path d="M11 8 7 12l4 4" /><path d="m13 8 4 4-4 4" /></svg>
                      }
                      details="Ej körd i gratisläge. Simulerade attacker startas aldrig utan avtalad auktorisering."
                    />

                    <VerdictCard
                      title="API-GRANSKNING"
                      verdict="LÅST"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      }
                      details="Ej körd i gratisläge. API-granskning kräver autentiserad testprofil och manuell validering."
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
                      Du ser en klassificerad förhandsvy. Fulla indikatorer och åtgärdsplan lämnas endast i auktoriserad diagnos.
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
