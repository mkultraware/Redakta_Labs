import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function TermsPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-32 px-6">
                <div className="max-w-3xl mx-auto space-y-12">
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 uppercase font-mono">
                        Användarvillkor
                    </h1>

                    <div className="prose prose-slate max-w-none space-y-8 text-slate-600 font-medium">
                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono">1. Tjänstens omfattning</h2>
                            <p>
                                Redakta Labs tillhandahåller en kostnadsfri, passiv OSINT-analys (Open Source Intelligence) av domäner.
                                Tjänsten utför ingen aktiv skanning eller intrångsförsök och påverkar inte målsystemets drift.
                                Resultaten är indikativa och baseras på offentligt tillgänglig information.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono">2. Dataintegritet</h2>
                            <p>
                                Vi värnar om din integritet. Redakta Labs sparar ingen data från dina sökningar.
                                Inga domännamn, IP-adresser eller analysresultat lagras permanent i våra system.
                                Varje kontroll är stateless och lämnar inga spår efter att sessionen avslutats.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono">3. Ansvarsbegränsning</h2>
                            <p>
                                Sekura Labs ansvarar inte för eventuella direkta eller indirekta skador som uppstår till följd av användning av denna tjänst.
                                Analysen ersätter inte en fullständig manuell säkerhetsrevision eller penetrationstest utfört av professionella säkerhetskonsulter.
                            </p>
                        </section>

                        <section className="space-y-4">
                            <h2 className="text-xl font-bold text-slate-900 uppercase tracking-widest font-mono">4. Kontakt</h2>
                            <p>
                                För frågor gällande tjänsten, djupare analyser eller samarbete, vänligen kontakta oss via:
                                <br />
                                <a href="mailto:Info@sekura.se" className="text-blue-600 hover:text-blue-800 underline">Info@sekura.se</a>
                            </p>
                        </section>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
