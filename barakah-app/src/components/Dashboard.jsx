import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 
import TrialTimer from './TrialTimer'; 

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

    // --- Challenge Hub Logic ---
    const [activeChallenges, setActiveChallenges] = useState([]);
    const [completedIds, setCompletedIds] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    useEffect(() => {
        if (user) {
            fetchChallenges();
            checkTrialStatus();
        }
    }, [user]);

    async function checkTrialStatus() {
        try {
            const { data: settings } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 'config')
                .single();

            const startTime = user?.trial_started_at || user?.created_at;
            
            if (settings && startTime && user?.subscription_tier !== 'pro') {
                const daysAllowed = settings.trial_period_days;
                const startDate = new Date(startTime);
                const endDate = new Date(startDate.getTime() + daysAllowed * 24 * 60 * 60 * 1000);
                
                if (new Date() > endDate) {
                    setIsTrialExpired(true);
                }
            }
        } catch (err) {
            console.error("Status check error:", err.message);
        }
    }

    async function fetchChallenges() {
        try {
            // 1. Fetch all challenges that haven't expired yet
            const { data: challenges, error: chError } = await supabase
                .from('challenges')
                .select('*')
                .gt('expires_at', new Date().toISOString())
                .order('created_at', { ascending: false });

            if (chError) throw chError;

            // 2. Fetch what this specific user has already completed
            const { data: completions, error: compError } = await supabase
                .from('challenge_completions')
                .select('challenge_id')
                .eq('user_id', user.id);

            if (compError) throw compError;

            setCompletedIds(completions.map(c => c.challenge_id));
            setActiveChallenges(challenges || []);
        } catch (err) {
            console.error("Error loading challenges:", err.message);
        }
    }

    async function handleCompleteChallenge(challenge) {
        if (isProcessing) return;
        if (isTrialExpired) {
            alert("Your trial has expired. Please upgrade to Pro to complete challenges.");
            return;
        }
        setIsProcessing(true);

        try {
            // 1. Record the completion
            const { error: compError } = await supabase
                .from('challenge_completions')
                .insert([{
                    challenge_id: challenge.id,
                    user_id: user.id,
                    username: user.username,
                    points_awarded: challenge.points
                }]);

            if (compError) throw compError;

            // 2. Update user's total points in the profile
            const newTotal = (totalPoints || 0) + challenge.points;
            const { error: userError } = await supabase
                .from('profiles')
                .update({ points: newTotal })
                .eq('id', user.id);

            if (userError) throw userError;

            // 3. Update local state
            setCompletedIds([...completedIds, challenge.id]);
            alert(`MashaAllah! You earned ${challenge.points} Hasanat!`);
            
            // Refresh parent state if needed
            if (setUser) {
                setUser({ ...user, points: newTotal });
            }
        } catch (err) {
            alert("Completion error: " + err.message);
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="pb-28 animate-in slide-in-from-bottom-4 h-full overflow-y-auto no-scrollbar">
            
            {/* Trial Timer Bar */}
            <TrialTimer profile={user} />

            {/* Daily Inspiration Float Card */}
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

            {/* CHALLENGE HUB (WITH LOCKING LOGIC) */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-lg font-black text-gray-800">Community Challenges</h3>
                    <span className="text-[9px] font-black text-rose-400 uppercase bg-rose-50 px-2 py-1 rounded-md">
                        {activeChallenges.length} Active
                    </span>
                </div>

                <div className="space-y-4">
                    {isTrialExpired ? (
                        /* Locked State UI */
                        <div className="bg-gray-50 rounded-[2.5rem] p-12 text-center border-2 border-dashed border-gray-200">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">🔒</span>
                            </div>
                            <h4 className="text-sm font-black text-gray-800 uppercase tracking-tight">Challenges Locked</h4>
                            <p className="text-[10px] text-gray-500 font-medium mt-2 leading-relaxed px-4">
                                Your free trial period has ended. Upgrade to Pro to continue earning Hasanat points.
                            </p>
                            <button className="mt-6 bg-gray-800 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg">
                                View Pro Plans
                            </button>
                        </div>
                    ) : (
                        /* Active Challenges List */
                        activeChallenges.length === 0 ? (
                            <div className="bg-gray-50 rounded-[2rem] p-8 text-center border border-dashed border-gray-200">
                                <p className="text-xs font-bold text-gray-400">No active challenges right now. Check back later!</p>
                            </div>
                        ) : (
                            activeChallenges.map((ch) => {
                                const isCompleted = completedIds.includes(ch.id);
                                return (
                                    <div key={ch.id} className={`p-6 rounded-[2.5rem] border transition-all ${isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-rose-100 shadow-sm'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="font-black text-gray-800">{ch.title}</h4>
                                                    {isCompleted && <span className="text-[8px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase">Completed</span>}
                                                </div>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">{ch.description}</p>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">💎</span>
                                                        <span className="text-[10px] font-black text-rose-600 uppercase">{ch.points} Hasanat</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs">⏳</span>
                                                        <span className="text-[10px] font-black text-gray-400 uppercase">
                                                            {new Date(ch.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} Left
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {!isCompleted && (
                                                <button 
                                                    onClick={() => handleCompleteChallenge(ch)}
                                                    disabled={isProcessing}
                                                    className="bg-rose-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase shadow-md active:scale-95 transition-transform"
                                                >
                                                    Done
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )
                    )}
                </div>
            </div>

            {/* Points and Rank Section */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                {isTrialExpired ? (
                    <div className="col-span-2 bg-gray-100 p-8 rounded-[2.5rem] border border-gray-200 text-center">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stats Locked</p>
                         <p className="text-xs font-bold text-gray-600 italic">"Progress is for those who persevere."</p>
                    </div>
                ) : (
                    <>
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
                    </>
                )}
            </div>
        </div>
    );
}