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
        success: "badge-success",
        warning: "badge-warning",
        error: "badge-error",
        neutral: "badge-info",
        locked: "bg-slate-100 text-slate-400",
    }[verdictType];

    const iconBg = {
        success: "bg-emerald-50 border-emerald-100 text-emerald-600",
        warning: "bg-amber-50 border-amber-100 text-amber-600",
        error: "bg-rose-50 border-rose-100 text-rose-600",
        neutral: "bg-blue-50 border-blue-100 text-blue-600",
        locked: "bg-slate-50 border-slate-100 text-slate-300",
    }[verdictType];

    return (
        <div className={`card-premium group/card ${isLocked ? "card-locked" : ""}`}>
            <div className="p-7">
                <div className="flex items-start gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm transition-transform ${!isLocked ? "group-hover/card:scale-110" : ""} ${iconBg}`}>
                        <div className="w-7 h-7">
                            {icon}
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-1 font-mono">
                                {title}
                            </h3>
                            <div className={`badge-premium font-mono ${badgeClass} ${isLocked ? "glitch-text" : ""}`}>
                                {verdict}
                            </div>
                        </div>

                        {details && (
                            <p className="text-slate-600 leading-relaxed font-semibold text-sm mb-4 truncate whitespace-nowrap overflow-hidden">
                                {details}
                            </p>
                        )}

                        {children && (
                            <div className="pt-4 border-t border-slate-50 flex items-center gap-4">
                                {children}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isLocked && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/5 backdrop-blur-[1px] opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-xl">
                        Kräver Aktiv Analys
                    </span>
                </div>
            )}
        </div>
    );
}
