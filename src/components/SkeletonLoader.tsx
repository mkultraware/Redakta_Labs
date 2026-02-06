export default function SkeletonLoader() {
    return (
        <div className="grid gap-8 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-premium h-[240px] p-7">
                    <div className="flex items-start gap-5">
                        <div className="shimmer w-14 h-14 rounded-2xl shrink-0"></div>
                        <div className="flex-1 space-y-4 pt-2">
                            <div className="flex justify-between items-center">
                                <div className="shimmer h-3 w-24 rounded"></div>
                                <div className="shimmer h-5 w-16 rounded-full"></div>
                            </div>
                            <div className="shimmer h-4 w-full rounded"></div>
                            <div className="shimmer h-4 w-3/4 rounded"></div>
                            <div className="pt-6">
                                <div className="shimmer h-3 w-32 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
