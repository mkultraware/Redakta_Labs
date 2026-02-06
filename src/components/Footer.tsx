import Link from "next/link";
import Image from "next/image";

export default function Footer() {
    return (
        <footer className="w-full py-16 px-6 border-t border-slate-100 bg-white mt-auto">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Main Grid */}
                <div className="grid md:grid-cols-2 gap-12">

                    {/* Branding & Mission */}
                    <div className="space-y-5">
                        <a href="https://sekura.se" target="_blank" className="inline-block transition-opacity hover:opacity-80">
                            <Image
                                src="/sekura.svg"
                                alt="Sekura Logo"
                                width={100}
                                height={30}
                                className="object-contain"
                            />
                        </a>
                        <p className="text-sm font-bold text-slate-900 uppercase tracking-widest font-mono">
                            Redakta Labs är en SEKURA.SE produkt.
                        </p>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                            Öppna verktyg för att stärka cyberhygienen hos svenska organisationer.
                            Vi belyser sårbarheter ur en angripares perspektiv – för defensiva syften.
                        </p>
                    </div>

                    {/* Navigation */}
                    <div className="space-y-4 md:text-right">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 font-mono">Navigering</h4>
                        <nav className="flex flex-col gap-3 text-[12px] font-medium text-slate-500">
                            <a href="https://sekura.se" target="_blank" className="hover:text-slate-900 transition-colors">Sekura.se →</a>
                            <Link href="/#varfor" className="hover:text-slate-900 transition-colors">Varför är detta viktigt?</Link>
                            <Link href="/terms" className="hover:text-slate-900 transition-colors">Användarvillkor</Link>
                        </nav>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                        Passiv OSINT-analys. Resultaten är indikativa och ersätter inte en fullständig säkerhetsrevision.
                    </p>
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest whitespace-nowrap">
                        © 2026 SEKURA.SE
                    </p>
                </div>
            </div>
        </footer>
    );
}
