export default function LightModePreviewCard() {
    return (
        <div className="card-premium border-slate-200 bg-white px-4 py-3 space-y-3 shadow-[3px_3px_0px_0px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">
                    Förhandsvy
                </p>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 border border-slate-200 px-2 py-1 bg-slate-50 font-mono">
                    Ljusläge
                </span>
            </div>

            <div className="rounded-lg border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-3 space-y-3">
                <div className="space-y-1.5">
                    <div className="h-2 w-20 bg-slate-200 rounded"></div>
                    <div className="h-2 w-32 bg-slate-100 rounded"></div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded border border-emerald-200 bg-emerald-50 h-9"></div>
                    <div className="rounded border border-amber-200 bg-amber-50 h-9"></div>
                    <div className="rounded border border-rose-200 bg-rose-50 h-9"></div>
                </div>

                <div className="rounded border border-slate-200 bg-white px-2.5 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 font-mono">
                        Riskradar
                    </p>
                    <p className="text-[11px] text-slate-700 font-medium mt-1">
                        Ren, högkontrast vy för ledning och beslutsstöd.
                    </p>
                </div>
            </div>
        </div>
    );
}
