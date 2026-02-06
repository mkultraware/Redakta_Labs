"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem("cookie-consent");
        if (!consent) {
            // Show with a slight delay for better UX
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const acceptCookies = () => {
        localStorage.setItem("cookie-consent", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-6 right-6 md:left-auto md:max-w-md z-100 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="card-premium glass p-6 md:p-8 border-slate-200/50 shadow-2xl backdrop-blur-2xl">
                <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-900 font-mono flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-slate-900 animate-pulse"></span>
                            Integritet & Cookies
                        </h4>
                        <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                            Vi använder cookies för att analysera trafik och stärka säkerheten på plattformen.
                            Genom att fortsätta godkänner du vår användning av data.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                        <button
                            onClick={acceptCookies}
                            className="flex-1 px-6 py-2.5 bg-slate-900 text-white rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm font-mono active:scale-95"
                        >
                            Acceptera
                        </button>
                        <Link
                            href="/terms"
                            className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors font-mono"
                        >
                            Läs mer
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
