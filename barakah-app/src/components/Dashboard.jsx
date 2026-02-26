export default function Dashboard({ 
    user, 
    prayerTimes, 
    islamicDate, 
    currentTime, 
    totalPoints, 
    getLevel, 
    format12Hour, 
    fetchPrayerData, 
    setUser, 
    QUOTES, 
    DAILY_DUAS, 
    getSunnahAdvice, 
    WeeklyGraph 
}) {
    // Logic for dynamic content
    const currentQuote = QUOTES[Math.floor(Date.now() / 86400000) % QUOTES.length];
    const dailyDua = DAILY_DUAS[Math.floor(Date.now() / 86400000) % DAILY_DUAS.length];
    
    // Safety check for sunnah advice
    const sunnah = getSunnahAdvice ? getSunnahAdvice() : { icon: "✨", text: "Keep a smile, it's Sunnah" };

    return (
        <div className="pb-28 animate-in slide-in-from-bottom-4 h-full overflow-y-auto no-scrollbar">
            
            {/* Daily Inspiration Float Card - Positioned at the top of the white area */}
            <div className="bg-rose-50 p-6 rounded-[2.5rem] border border-rose-100 mb-8">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Daily Inspiration</p>
                <p className="text-gray-700 text-sm italic font-semibold leading-relaxed">
                    "{currentQuote}"
                </p>
            </div>

            {/* Sunnah Badge */}
            <div className="mb-8 bg-rose-500/5 rounded-2xl p-4 flex items-center gap-3 border border-rose-100">
                <span className="text-xl">{sunnah.icon}</span>
                <p className="text-xs font-black text-rose-600 uppercase tracking-wider">{sunnah.text}</p>
            </div>

            {/* Prayer Times Section */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-lg font-black text-gray-800">Prayer Times</h3>
                    <button 
                        onClick={() => {
                            const newCity = prompt("Enter your city:", user?.city);
                            if (newCity) {
                                setUser({...user, city: newCity});
                                fetchPrayerData(newCity);
                            }
                        }} 
                        className="text-[10px] font-black text-rose-500 uppercase underline"
                    >
                        Change City
                    </button>
                </div>
                
                <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-rose-50 grid grid-cols-5 gap-2">
                    {prayerTimes ? ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((p) => (
                        <div key={p} className="flex flex-col items-center">
                            <p className="text-[9px] font-black text-rose-400 uppercase mb-1">{p}</p>
                            <p className="text-[10px] font-bold text-gray-800">
                                {format12Hour ? format12Hour(prayerTimes[p]) : prayerTimes[p]}
                            </p>
                        </div>
                    )) : (
                        <div className="col-span-5 text-center text-[10px] text-gray-400 font-bold py-2">
                            Fetching times...
                        </div>
                    )}
                </div>
            </div>

            {/* Weekly Progress Graph */}
            {WeeklyGraph && <WeeklyGraph />}

            {/* Dua Section */}
            <div className="mb-8">
                <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-[2.5rem] p-8 text-white shadow-lg">
                    <p className="text-[10px] font-black opacity-80 uppercase tracking-widest mb-3">Dua of the Day</p>
                    <p className="text-2xl font-serif text-right mb-4 leading-relaxed" dir="rtl">
                        {dailyDua.arabic}
                    </p>
                    <p className="text-xs font-medium italic opacity-90 mb-2">
                        "{dailyDua.translation}"
                    </p>
                    <p className="text-[9px] font-black opacity-60 uppercase">
                        — {dailyDua.source}
                    </p>
                </div>
            </div>

            {/* Points and Rank Section */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-6 rounded-[2rem] border border-rose-100 text-center shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Points</p>
                    <p className="text-4xl font-black text-rose-600 mt-1">{totalPoints}</p>
                </div>
                <div className="bg-rose-600 p-6 rounded-[2rem] text-center text-white shadow-lg">
                    <p className="text-[10px] font-black opacity-80 uppercase">Rank</p>
                    <p className="text-xl font-black mt-1">
                        {getLevel ? getLevel(totalPoints) : "Sister"}
                    </p>
                </div>
            </div>
        </div>
    );
}