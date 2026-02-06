"use client";

import { useState, useRef, useEffect } from "react";

interface DomainInputProps {
    onSubmit: (domain: string, turnstileToken: string) => void;
    isLoading: boolean;
}

declare global {
    interface Window {
        turnstile?: {
            render: (container: HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
                "error-callback": () => void;
                "expired-callback": () => void;
                theme?: "light" | "dark" | "auto";
            }) => string;
            reset: (widgetId: string) => void;
            remove: (widgetId: string) => void;
        };
    }
}

export default function DomainInput({ onSubmit, isLoading }: DomainInputProps) {
    const [domain, setDomain] = useState("");
    const [error, setError] = useState("");
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const widgetIdRef = useRef<string | null>(null);

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

    useEffect(() => {
        if (!siteKey || !turnstileRef.current) return;

        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;

        script.onload = () => {
            if (window.turnstile && turnstileRef.current) {
                widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => setTurnstileToken(token),
                    "error-callback": () => setTurnstileToken(null),
                    "expired-callback": () => setTurnstileToken(null),
                    theme: "light",
                });
            }
        };
        document.head.appendChild(script);

        return () => {
            if (widgetIdRef.current && window.turnstile) {
                window.turnstile.remove(widgetIdRef.current);
            }
            script.remove();
        };
    }, [siteKey]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = domain.trim().toLowerCase();

        if (!trimmed) {
            setError("Ange en domän");
            return;
        }

        if (siteKey && !turnstileToken) {
            setError("Verifiera captcha");
            return;
        }

        setError("");
        onSubmit(trimmed, turnstileToken || "");
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-6 text-center">
            <div className="card-premium p-2 shadow-premium flex flex-col md:flex-row gap-2 rounded-full!">
                <input
                    type="text"
                    value={domain}
                    onChange={(e) => {
                        setDomain(e.target.value);
                        setError("");
                    }}
                    placeholder="exempel.se"
                    className="flex-1 px-8 py-4 text-lg font-medium border-none focus:ring-0 rounded-full bg-transparent placeholder:text-zinc-300"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading || (!!siteKey && !turnstileToken)}
                    className="btn-apple px-8 py-3.5 shadow-sm whitespace-nowrap"
                >
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : (
                        <>
                            Skanna domän
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 ml-1 opacity-70">
                                <path d="m22 2-7 20-4-9-9-4Z" />
                                <path d="M22 2 11 13" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            {siteKey && (
                <div className="flex justify-center opacity-70 scale-90 transition-opacity hover:opacity-100">
                    <div ref={turnstileRef}></div>
                </div>
            )}

            {error && (
                <p className="text-rose-500 text-sm font-medium text-center animate-in fade-in slide-in-from-top-2">
                    {error}
                </p>
            )}
        </form>
    );
}
