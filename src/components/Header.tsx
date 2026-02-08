import Link from "next/link";
import Image from "next/image";

export default function Header() {
  return (
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

        <div className="flex items-center gap-2 sm:gap-4 md:gap-8 shrink-0">
          <Link
            href="/#varfor"
            className="hidden min-[390px]:block text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-widest text-slate-500 hover:text-slate-900 transition-colors font-mono"
          >
            Varför?
          </Link>
          <Link
            href="/internet-weather"
            className="hidden sm:block text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-[0.15em] md:tracking-widest text-slate-500 hover:text-slate-900 transition-colors font-mono whitespace-nowrap"
          >
            Internetprognos
          </Link>
          <Link
            href="/terms"
            className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors font-mono"
          >
            Villkor
          </Link>
          <Link
            href="https://sekura.se"
            target="_blank"
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-slate-900 text-white rounded-full text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-[0.12em] md:tracking-widest hover:bg-slate-800 transition-all shadow-sm font-mono whitespace-nowrap"
          >
            Sekura<span className="hidden sm:inline">.se</span>
          </Link>
        </div>
      </nav>
    </header>
  );
}
