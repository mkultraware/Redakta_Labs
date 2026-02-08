import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InternetWeatherPanel from "@/components/InternetWeatherPanel";

export const metadata: Metadata = {
  title: "Sweden Internet Weather | Redakta Labs",
  description:
    "Live BGP turbulence monitor for Sweden based on RIPE RIS Live, with optional CAIDA IODA context. Built with public/free data only.",
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
