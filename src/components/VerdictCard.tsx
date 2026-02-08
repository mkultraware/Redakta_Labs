interface VerdictCardProps {
    title: string;
    verdict: string;
    verdictType: "success" | "warning" | "error" | "neutral" | "locked";
    icon: React.ReactNode;
    details?: string;
    children?: React.ReactNode;
    isLocked?: boolean;
}

export default function VerdictCard({
    title,
    verdict,
    verdictType,
    icon,
    details,
    children,
    isLocked = false,
}: VerdictCardProps) {
    const badgeClass = {
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border-amber-200",
        error: "bg-rose-100 text-rose-800 border-rose-200",
        neutral: "bg-blue-100 text-blue-800 border-blue-200",
        locked: "bg-slate-100 text-slate-400 border-slate-200",
    }[verdictType];

    return (
        <div className={`card-premium group/card ${isLocked ? "card-locked" : ""} flex flex-col`}>
            {/* Technical Header Strip */}
            <div className="flex items-center justify-between px-4 py-1 border-b border-slate-100 bg-slate-50/50">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">
                    PROVAD // {title}
                </span>
                <span className="text-[9px] font-bold text-slate-400 font-mono">
                    GENOMFÖRD
                </span>
            </div>

            <div className="p-6 flex-1">
                <div className="flex items-start gap-6">
                    <div className={`w-12 h-12 flex items-center justify-center border border-slate-200 transition-all ${!isLocked ? "group-hover/card:border-slate-800" : "opacity-30"}`}>
                        <div className="w-6 h-6 text-slate-600">
                            {icon}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-black text-slate-900 uppercase font-mono tracking-tight">
                                {title}
                            </h3>
                            <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 border rounded-none font-mono ${badgeClass} ${isLocked ? "glitch-text" : ""}`}>
                                {verdict}
                            </div>
                        </div>

                        {details && (
                            <p className="text-slate-500 leading-snug font-medium text-[13px] font-mono border-l border-slate-200 pl-3">
                                {details}
                            </p>
                        )}

                        {children && (
                            <div className="pt-4 mt-4 border-t border-dashed border-slate-200 flex items-center gap-4">
                                {children}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isLocked && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/40 backdrop-blur-[2px] opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 bg-white px-5 py-2 border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        Kräver Auktoriserad Analys
                    </span>
                </div>
            )}
        </div>
    );
}
