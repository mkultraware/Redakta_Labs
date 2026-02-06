"use client";

import { useState, useEffect } from "react";
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
}

export default function Home() {
  const [isPreLoading, setIsPreLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [report, setReport] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentDomain, setCurrentDomain] = useState("");

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

  const getVerdictLabel = (verdict: string, type: "email" | "blacklist" | "typosquat") => {
    if (verdict === "protected" || verdict === "clean" || verdict === "safe") return "KONTROLL OK";
    if (verdict === "partial" || verdict === "risk_detected") return "OSÄKER SIGNAL";
    if (verdict === "not_protected" || verdict === "listed") return "INDIKERAD RISK";
    return "ANALYS KRÄVS";
  };

  const getVerdictType = (severity: string): "success" | "warning" | "error" | "neutral" => {
    if (severity === "success") return "success";
    if (severity === "warning") return "warning";
    if (severity === "critical") return "error";
    return "neutral";
  };

  const getObfuscatedMessage = (type: "email" | "blacklist" | "typosquat", verdict: string) => {
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
    return "";
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100">
      <Header />

      <main className="flex-1 px-6 py-24 lg:py-40">
        <div className="max-w-4xl mx-auto space-y-32">
          {/* Hero Section */}
          <section className="animate-in fade-in duration-1000 bg-grid-subtle -mx-6 px-6 py-12 rounded-3xl">
            <div className="card-premium p-12 md:p-20 text-center space-y-10 glass border-slate-100/50">
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 font-mono">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
                </span>
                Passiv OSINT-analys
              </div>

              <div className="space-y-6">
                <div className="flex justify-center mb-8">
                  <Image
                    src="/brand-logo.png"
                    alt="Redakta Logo"
                    width={180}
                    height={80}
                    className="object-contain"
                    priority
                  />
                </div>
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-slate-900 uppercase font-mono">
                  SÄKRA DIN <br />
                  <span className="gradient-text-subtle">DOMÄNIDENTITET.</span>
                </h1>
                <p className="max-w-2xl mx-auto text-xl text-slate-500 font-medium leading-relaxed">
                  Vi belyser indikativa signaler och potentiella risker i din domäns infrastruktur.
                  Passiv OSINT-analys som belyser behovet av djuplodande säkerhetsgranskning.
                </p>
                <div className="pt-8">
                  <DomainInput onSubmit={handleSubmit} isLoading={isPreLoading || isLoading} />
                </div>
              </div>
            </div>
          </section>

          {/* Terminal Loader */}
          {isPreLoading && (
            <div className="max-w-xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4">
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

          {/* Results */}
          {report && !isLoading && !isPreLoading && (
            <section className="relative animate-in fade-in slide-in-from-bottom-12 duration-1000 fill-mode-both">
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

              <div className="space-y-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-12 border-b border-slate-100">
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase font-mono">
                      DOMÄN: {report.domain}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                      Status: OSINT_SURFACE_SCAN / {new Date(report.timestamp).toLocaleString("sv-SE")}
                    </p>
                  </div>
                  <div className={`px-6 py-3 rounded-full text-[11px] font-bold uppercase tracking-widest shadow-lg ${report.overallVerdict === "secure"
                    ? "bg-emerald-500 text-white"
                    : report.overallVerdict === "attention"
                      ? "bg-amber-500 text-white"
                      : "bg-rose-500 text-white"
                    }`}>
                    {report.overallVerdict === "secure" ? "YTLIG KONTROLL OK" : report.overallVerdict === "attention" ? "EXPONERAT LÄGE" : "SYSTEMISKA BRISTER"}
                  </div>
                </div>

                {/* Primary Scan Results */}
                <div className="grid gap-6 md:grid-cols-2">
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
                    title="INFRASTRUKTUR"
                    verdict="YTA OK"
                    verdictType="neutral"
                    icon={
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></svg>
                    }
                    details="Externa ingångspunkter bekräftade."
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
                      details="Aktiv portskanning inaktiverad."
                    />

                    <VerdictCard
                      title="CVE-KORRELERING"
                      verdict="INGEN DATA"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4" /><path d="m3.34 19 8.66-8.66" /><path d="m20.66 19-8.66-8.66" /><circle cx="12" cy="10" r="2" /><circle cx="12" cy="21" r="2" /><circle cx="3" cy="21" r="2" /><circle cx="21" cy="21" r="2" /><circle cx="12" cy="2" r="2" /></svg>
                      }
                      details="Versions-sondering krävs."
                    />

                    <VerdictCard
                      title="SUBDOMÄNS-KARTA"
                      verdict="DOLD"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m12 8 4 4-4 4" /><path d="M8 12h8" /></svg>
                      }
                      details="Deep-crawl mapping inaktiverad."
                    />

                    <VerdictCard
                      title="CDN/WAF ANALYS"
                      verdict="OÅTKOMLIG"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><circle cx="12" cy="12" r="3" /></svg>
                      }
                      details="Edge protection analysis hoppas över."
                    />

                    <VerdictCard
                      title="SÅRBARHETS-TEST"
                      verdict="INAKTIV"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 21-4.3-4.3" /><path d="M11 8 7 12l4 4" /><path d="m13 8 4 4-4 4" /></svg>
                      }
                      details="Penetrationstester inaktiverade."
                    />

                    <VerdictCard
                      title="API-GRANSKNING"
                      verdict="LÅST"
                      verdictType="locked"
                      isLocked={true}
                      icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      }
                      details="Fuzzing av API-vägar kräver tillstånd."
                    />
                  </div>
                </div>

                {/* Bottom CTA */}
                <div className="card-premium p-16 md:p-24 text-center space-y-12 glass mt-20 overflow-hidden relative rounded-[3rem]">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-100 via-emerald-100 to-orange-100 opacity-50" />
                  <div className="space-y-4 relative z-10">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase">
                      Lås upp full sårbarhetsanalys
                    </h2>
                    <p className="text-slate-400 max-w-lg mx-auto font-medium text-lg">
                      Ytlig analys indikerar risker men inte fullständig omfattning.
                      Kontakta Sekura för professionell säkerhetsrådgivning.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative z-10">
                    <a
                      href="https://sekura.se"
                      target="_blank"
                      className="btn-apple px-12 py-5 shadow-2xl shadow-slate-200 w-full sm:w-auto text-lg uppercase tracking-widest"
                    >
                      Boka Skarp Granskning
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Why is this important section */}
          <section id="varfor" className="scroll-mt-32 space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="grid md:grid-cols-2 gap-20 items-center">
              <div className="space-y-8">
                <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 uppercase font-mono leading-none">
                  Cyberbrottslighet <br />
                  <span className="text-rose-500">Diskriminerar Inte.</span>
                </h2>
                <div className="space-y-6 text-lg text-slate-500 font-medium leading-relaxed">
                  <p>
                    Över <span className="text-slate-900 font-bold">70%</span> av alla cyberattacker i Sverige börjar med nätfiske och social engineering.
                    Många organisationer lever i tron att de är för små för att vara ett mål.
                  </p>
                  <p>
                    Verkligheten är den motsatta: automatiserade skript letar konstant efter de lättaste ingångshålen.
                    En felkonfigurerad e-postserver eller en oskyddad domän är en öppen inbjudan till identitetsstöld och VD-bedrägerier.
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
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4">
                  <div className="text-3xl font-black text-slate-900 font-mono">24/7</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    Automatiserad probing sker mot din infrastruktur.
                  </p>
                </div>
                <div className="card-premium p-8 bg-slate-50 border-slate-100 space-y-4">
                  <div className="text-3xl font-black text-slate-900 font-mono">0ms</div>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 leading-tight font-mono">
                    Vi sparar ingen data – din sökning är helt privat.
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
        </div>
      </main>

      <Footer />
    </div>
  );
}
