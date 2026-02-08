"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { href: "/#varfor", label: "Varför?" },
    { href: "/internet-weather", label: "Internetprognos" },
    { href: "/terms", label: "Villkor" },
  ];

  return (
    <>
      <header className="fixed top-3 sm:top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl">
        <nav className="card-premium glass px-3 sm:px-5 md:px-6 py-2.5 md:py-3 flex items-center justify-between border-slate-200/50 shadow-2xl backdrop-blur-xl gap-3">
          <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02]">
            <div className="logo-container scale-75 md:scale-100">
              <Image
                src="/brand-logo.png"
                alt="Redakta Logo"
                width={48}
                height={24}
                className="object-contain"
                priority
              />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-xs sm:text-sm md:text-base font-black tracking-tight text-slate-900 font-mono truncate">REDAKTA</span>
              <span className="hidden md:block text-[8px] uppercase tracking-widest font-bold text-slate-400 font-mono">powered by Sekura</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8 shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors font-mono"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="https://sekura.se"
              target="_blank"
              className="px-4 py-2 bg-slate-900 text-white rounded-full text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm font-mono whitespace-nowrap"
            >
              Sekura.se
            </Link>
          </div>

          {/* Mobile: CTA + Hamburger */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="https://sekura.se"
              target="_blank"
              className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-[9px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all shadow-sm font-mono"
            >
              Sekura
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-slate-600 hover:text-slate-900 transition-colors"
              aria-label="Öppna meny"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Menu Panel */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] max-w-md z-50 md:hidden transition-all duration-300 ${isMenuOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"
          }`}
      >
        <nav className="card-premium glass border-slate-200/50 shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="p-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-sm font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors font-mono rounded-lg"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="border-t border-slate-100 p-4">
            <Link
              href="https://sekura.se"
              target="_blank"
              onClick={() => setIsMenuOpen(false)}
              className="block w-full text-center px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all font-mono"
            >
              Besök Sekura.se →
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
