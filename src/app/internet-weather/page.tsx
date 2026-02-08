import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InternetWeatherPanel from "@/components/InternetWeatherPanel";

export const metadata: Metadata = {
  title: "Internetprognos för Sverige | Redakta Labs",
  description:
    "Lägesbild av BGP-turbulens i Sverige med RIPE RIS Live och valfri CAIDA IODA-signal. Endast fria och offentliga datakällor.",
  alternates: {
    canonical: "/internet-weather",
  },
};

export default function InternetWeatherPage() {
  return (
    <div className="min-h-screen flex flex-col selection:bg-blue-100">
      <Header />
      <main className="flex-1 px-4 sm:px-6 pt-28 pb-20">
        <div className="max-w-6xl mx-auto">
          <InternetWeatherPanel />
        </div>
      </main>
      <Footer />
    </div>
  );
}
