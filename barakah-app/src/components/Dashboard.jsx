import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export default function Dashboard({ session }) {
    // --- CORE STATES ---
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [points, setPoints] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    
    // --- FEATURE STATES ---
    const [dailyTasks, setDailyTasks] = useState([]);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [recentHistory, setRecentHistory] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [broadcast, setBroadcast] = useState(null);
    const [notifications, setNotifications] = useState([]);
    
    // --- SPIRITUAL ENGINE STATES ---
    const [currentLevel, setCurrentLevel] = useState(1);
    const [progressToNext, setProgressToNext] = useState(0);
    const [totalMinutesPrays, setTotalMinutesPrays] = useState(0);
    const [quranPages, setQuranPages] = useState(0);
    const [dhikrCount, setDhikrCount] = useState(0);

    // --- TRIAL & PROTECTION STATES ---
    const [daysRemaining, setDaysRemaining] = useState(null);
    const [isLocked, setIsLocked] = useState(false);
    const [globalSettings, setGlobalSettings] = useState(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        if (session) {
            initializeSystem();
            
            // REAL-TIME PROTOCOL LISTENER
            const settingsChannel = supabase
                .channel('global_config')
                .on('postgres_changes', { 
                    event: 'UPDATE', 
                    schema: 'public', 
                    table: 'global_settings',
                    filter: `id=eq.config`
                }, (payload) => {
                    setGlobalSettings(payload.new);
                    if (profile) checkTrialProtection(profile, payload.new);
                })
                .subscribe();

            return () => supabase.removeChannel(settingsChannel);
        }
    }, [session, profile]);

    const initializeSystem = async () => {
        try {
            setLoading(true);
            const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
            const { data: settings } = await supabase.from('global_settings').select('*').eq('id', 'config').single();
            
            setProfile(profileData);
            setPoints(profileData.points || 0);
            setStreak(profileData.streak || 0);
            setGlobalSettings(settings);
            
            // Calculate Progress
            const lvl = Math.floor((profileData.points || 0) / 1000) + 1;
            setCurrentLevel(lvl);
            setProgressToNext(((profileData.points % 1000) / 1000) * 100);

            // Fetch Sub-modules
            await Promise.all([
                fetchTasks(),
                fetchLeaderboard(),
                fetchActiveMission(),
                fetchHistory(),
                fetchStats()
            ]);

            checkTrialProtection(profileData, settings);
        } catch (e) {
            console.error("System Init Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const checkTrialProtection = (user, settings) => {
        if (!user || !settings) return;
        const createdAt = new Date(user.created_at);
        const today = new Date();
        const diff = Math.floor((today - createdAt) / (1000 * 60 * 60 * 24));
        const remaining = (settings.trial_period_days || 7) - diff;
        
        const finalRemaining = remaining > 0 ? remaining : 0;
        setDaysRemaining(finalRemaining);

        if (finalRemaining <= 0 && user.subscription_tier === 'free' && settings.features_locked_after_trial) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
    };

    const fetchTasks = async () => {
        // High-density Task Logic
        const tasks = [
            { id: 1, title: 'Fajr Prayer', type: 'Salah', pts: 50, done: true, time: '05:12 AM' },
            { id: 2, title: 'Morning Adhkar', type: 'Dhikr', pts: 30, done: false, time: '06:30 AM' },
            { id: 3, title: 'Surah Al-Mulk', type: 'Quran', pts: 100, done: false, time: '10:00 PM' },
            { id: 4, title: 'Dhuhr Prayer', type: 'Salah', pts: 50, done: true, time: '12:45 PM' },
            { id: 5, title: 'Asr Prayer', type: 'Salah', pts: 50, done: false, time: '04:20 PM' },
            { id: 6, title: 'Maghrib Prayer', type: 'Salah', pts: 50, done: false, time: '06:15 PM' }
        ];
        setDailyTasks(tasks);
    };

    const fetchLeaderboard = async () => {
        const { data } = await supabase.from('profiles').select('username, points, avatar_url').order('points', { ascending: false }).limit(5);
        setLeaderboard(data || []);
    };

    const fetchActiveMission = async () => {
        const { data } = await supabase.from('challenges').select('*').gt('expires_at', new Date().toISOString()).limit(1).single();
        setActiveChallenge(data);
    };

    const fetchHistory = async () => {
        setRecentHistory([
            { id: 1, event: 'Salah Bonus', amount: '+250', date: 'Today' },
            { id: 2, event: 'Streak Maintained', amount: '+100', date: 'Yesterday' },
            { id: 3, event: 'Quran Milestone', amount: '+500', date: '2 days ago' }
        ]);
    };

    const fetchStats = async () => {
        setTotalMinutesPrays(450);
        setQuranPages(12);
        setDhikrCount(1500);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
            <div className="w-32 h-32 border-[16px] border-rose-500 border-t-transparent rounded-full animate-spin mb-10 shadow-2xl"></div>
            <p className="text-[14px] font-black uppercase tracking-[1em] text-slate-400 animate-pulse">Initializing Nisa UI...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-48 relative font-['Montserrat'] overflow-x-hidden selection:bg-rose-500 selection:text-white">
            
            {/* 1. REAL-TIME TRIAL BAR */}
            {profile?.subscription_tier === 'free' && !isLocked && (
                <div className={`fixed top-0 w-full z-[2000] p-6 text-center shadow-2xl transition-all duration-1000 ${daysRemaining <= 1 ? 'bg-rose-600 animate-pulse' : 'bg-slate-900'}`}>
                    <div className="flex justify-center items-center gap-6">
                        <span className="text-3xl animate-bounce">⏳</span>
                        <div>
                            <p className="text-[13px] font-black text-white uppercase tracking-[0.5em]">
                                {daysRemaining > 0 ? `TRIAL ACCESS: ${daysRemaining} DAYS REMAINING` : `TRIAL EXPIRED — UPGRADE REQUIRED`}
                            </p>
                            <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Unlock Pro to save your progress forever</p>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. MAIN DASHBOARD CONTENT (Restored Full Complexity) */}
            <div className={`transition-all duration-[1.5s] ease-in-out ${isLocked ? 'blur-[100px] scale-90 opacity-10 pointer-events-none' : ''} ${profile?.subscription_tier === 'free' ? 'pt-36' : 'pt-16'}`}>
                
                {/* --- HEADER SYSTEM --- */}
                <header className="px-12 flex flex-col lg:flex-row justify-between items-start lg:items-end mb-24 gap-12 animate-in slide-in-from-top-20 duration-1000">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                            <p className="text-[14px] font-black text-rose-500 uppercase tracking-[0.6em]">Assalamu Alaikum</p>
                        </div>
                        <h1 className="text-8xl font-black text-slate-900 tracking-tighter leading-[0.8]">
                            {profile?.username || 'Sister'} <span className="text-rose-500 text-6xl">✨</span>
                        </h1>
                        <div className="flex gap-4 items-center pt-4">
                            <div className="bg-slate-900 text-white px-8 py-3 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl">LEVEL {currentLevel}</div>
                            <div className="bg-white border border-slate-100 px-8 py-3 rounded-[2rem] text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">{profile?.subscription_tier} MEMBER</div>
                        </div>
                    </div>

                    <div className="bg-white p-12 rounded-[5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.12)] border border-slate-50 text-right min-w-[320px] relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 transition-all group-hover:w-4"></div>
                        <p className="text-[13px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4">Total Hasanat</p>
                        <p className="text-7xl font-black text-indigo-600 tracking-tighter group-hover:text-rose-500 transition-colors duration-500">{points.toLocaleString()}</p>
                    </div>
                </header>

                {/* --- PROGRESS ENGINE --- */}
                <div className="px-12 mb-20">
                    <div className="bg-indigo-600 p-20 rounded-[7rem] text-white shadow-[0_60px_120px_-20px_rgba(79,70,229,0.5)] relative overflow-hidden group">
                        <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-white/10 rounded-full blur-[150px] group-hover:scale-150 transition-all duration-[2s]"></div>
                        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-rose-500/20 rounded-full blur-[100px]"></div>
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-start mb-16">
                                <div>
                                    <h3 className="font-black text-5xl tracking-tighter mb-4">Spiritual Momentum</h3>
                                    <p className="text-[14px] font-bold opacity-60 uppercase tracking-[0.4em]">Path to Al-Firdaws • Day {streak} of Journey</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white/20 text-center min-w-[140px] shadow-2xl">
                                    <p className="text-[11px] font-black uppercase tracking-widest opacity-60 mb-1">Target</p>
                                    <p className="text-3xl font-black">92%</p>
                                </div>
                            </div>

                            <div className="space-y-6 mb-12">
                                <div className="flex justify-between text-[12px] font-black uppercase tracking-widest px-4">
                                    <span>Current Level Progress</span>
                                    <span>{progressToNext.toFixed(0)}%</span>
                                </div>
                                <div className="h-12 bg-black/30 rounded-full overflow-hidden shadow-inner p-2.5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-emerald-400 via-white to-rose-400 rounded-full shadow-[0_0_40px_rgba(255,255,255,0.8)] transition-all duration-[2.5s] ease-out" 
                                        style={{ width: `${progressToNext}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div className="flex flex-col xl:flex-row justify-between items-center gap-12 pt-8 border-t border-white/10">
                                <p className="text-2xl font-bold opacity-90 italic tracking-wide leading-relaxed max-w-3xl">
                                    "O you who have believed, seek help through patience and prayer. Indeed, Allah is with the patient." (2:153)
                                </p>
                                <button className="whitespace-nowrap bg-white text-indigo-600 px-16 py-8 rounded-[3rem] font-black uppercase tracking-[0.3em] text-sm hover:bg-rose-500 hover:text-white transition-all duration-500 shadow-2xl active:scale-95">
                                    Log Good Deed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MATRIX GRID (Stats) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 px-12 mb-20">
                    <div className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-50 text-center group hover:bg-rose-50 transition-all duration-700 hover:shadow-2xl">
                        <div className="text-7xl mb-10 group-hover:scale-125 transition-all duration-500 drop-shadow-xl">🔥</div>
                        <p className="text-[14px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 group-hover:text-rose-400">Streak</p>
                        <p className="text-6xl font-black text-slate-800 tracking-tighter">{streak} <span className="text-xl text-slate-300 font-bold uppercase tracking-widest">Days</span></p>
                    </div>
                    <div className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-50 text-center group hover:bg-indigo-50 transition-all duration-700 hover:shadow-2xl">
                        <div className="text-7xl mb-10 group-hover:rotate-12 transition-all duration-500">📖</div>
                        <p className="text-[14px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 group-hover:text-indigo-400">Quran</p>
                        <p className="text-6xl font-black text-slate-800 tracking-tighter">{quranPages} <span className="text-xl text-slate-300 font-bold uppercase tracking-widest">Pages</span></p>
                    </div>
                    <div className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-50 text-center group hover:bg-emerald-50 transition-all duration-700 hover:shadow-2xl">
                        <div className="text-7xl mb-10 group-hover:scale-110 transition-all duration-500">🤲</div>
                        <p className="text-[14px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 group-hover:text-emerald-400">Dhikr</p>
                        <p className="text-6xl font-black text-slate-800 tracking-tighter">{dhikrCount} <span className="text-xl text-slate-300 font-bold uppercase tracking-widest">Count</span></p>
                    </div>
                    <div className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-50 text-center group hover:bg-amber-50 transition-all duration-700 hover:shadow-2xl">
                        <div className="text-7xl mb-10 group-hover:-translate-y-4 transition-all duration-500">🎖️</div>
                        <p className="text-[14px] font-black text-slate-300 uppercase tracking-[0.4em] mb-4 group-hover:text-amber-400">Global Rank</p>
                        <p className="text-6xl font-black text-slate-800 tracking-tighter">#09 <span className="text-xl text-slate-300 font-bold uppercase tracking-widest">Top</span></p>
                    </div>
                </div>

                {/* --- DUAL SECTION: TASKS & LEADERBOARD --- */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-12 px-12 mb-20">
                    
                    {/* Tasks (Column 1 & 2) */}
                    <div className="xl:col-span-2 space-y-10">
                        <div className="flex justify-between items-center px-10">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase tracking-[0.1em]">Daily Rituals</h3>
                            <div className="flex gap-4">
                                <button className="p-4 bg-white rounded-2xl border border-slate-100 text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">Filter</button>
                                <button className="p-4 bg-white rounded-2xl border border-slate-100 text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50">Sort</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {dailyTasks.map(task => (
                                <div key={task.id} className="bg-white p-12 rounded-[4.5rem] border border-slate-50 shadow-sm flex items-center justify-between group hover:border-indigo-100 hover:shadow-2xl transition-all duration-500">
                                    <div className="flex items-center gap-10">
                                        <div className={`w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-3xl transition-all duration-500 ${task.done ? 'bg-emerald-500 text-white shadow-2xl shadow-emerald-100' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                                            {task.done ? '✓' : '✦'}
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-black tracking-tight ${task.done ? 'text-slate-300 line-through' : 'text-slate-800'}`}>{task.title}</p>
                                            <div className="flex items-center gap-4 mt-2">
                                                <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest">+{task.pts} Hasanat</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">• {task.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {!task.done && (
                                        <button className="bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl hover:bg-rose-500 transition-all duration-300 active:scale-90">Verify</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Leaderboard (Column 3) */}
                    <div className="space-y-10">
                        <div className="px-10">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase tracking-[0.1em]">Top Sisters</h3>
                        </div>
                        <div className="bg-white rounded-[5rem] shadow-sm border border-slate-50 p-10 space-y-4">
                            {leaderboard.map((user, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-8 rounded-[3.5rem] transition-all duration-500 ${idx === 0 ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                                    <div className="flex items-center gap-6">
                                        <span className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${idx === 0 ? 'bg-amber-400 text-white shadow-xl shadow-amber-100' : 'bg-slate-100 text-slate-400'}`}>
                                            {idx + 1}
                                        </span>
                                        <div className="w-14 h-14 bg-slate-200 rounded-full border-4 border-white overflow-hidden shadow-inner">
                                            {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-indigo-200"></div>}
                                        </div>
                                        <p className="font-black text-slate-800 tracking-tight">{user.username}</p>
                                    </div>
                                    <p className="font-black text-indigo-600 text-lg">{user.points.toLocaleString()}</p>
                                </div>
                            ))}
                            <button className="w-full py-8 mt-6 bg-slate-50 text-slate-400 font-black uppercase tracking-[0.4em] text-[10px] rounded-[3rem] hover:bg-slate-900 hover:text-white transition-all duration-500">View Global Rankings</button>
                        </div>
                    </div>
                </div>

                {/* --- HISTORY & ACTIVITY FEED --- */}
                <div className="px-12">
                    <div className="bg-white rounded-[6rem] shadow-sm border border-slate-50 p-16">
                        <div className="flex justify-between items-center mb-16 px-6">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase tracking-[0.1em]">Spiritual History</h3>
                            <p className="text-[12px] font-black text-slate-300 uppercase tracking-widest">Last 30 Days Activity</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {recentHistory.map(item => (
                                <div key={item.id} className="p-10 bg-slate-50 rounded-[4rem] border border-slate-100 flex items-center gap-8 group hover:bg-white hover:shadow-2xl hover:border-indigo-100 transition-all duration-500">
                                    <div className="w-16 h-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center text-2xl group-hover:bg-indigo-600 group-hover:text-white transition-all">✨</div>
                                    <div>
                                        <p className="font-black text-slate-800 text-lg tracking-tight">{item.event}</p>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-emerald-500 font-black text-sm">{item.amount}</span>
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">• {item.date}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- FOOTER DECORATION --- */}
                <div className="text-center py-40 opacity-20">
                    <p className="text-[14px] font-black uppercase tracking-[1.5em] text-slate-900">Barakah Academy Systems • 2026</p>
                    <p className="text-[11px] font-black uppercase tracking-[0.6em] mt-6">Empowering the Ummah through Discipline</p>
                </div>
            </div>

            {/* 3. REAL-TIME HARD LOCK OVERLAY */}
            {isLocked && (
                <div className="fixed inset-0 z-[10000] bg-[#f8fafc]/60 backdrop-blur-[100px] flex items-center justify-center p-12 animate-in zoom-in-95 fade-in duration-[1.5s] ease-out">
                    <div className="bg-white w-full max-w-3xl rounded-[8rem] p-24 text-center shadow-[0_100px_200px_-50px_rgba(0,0,0,0.4)] border border-white relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-6 bg-gradient-to-r from-rose-500 via-indigo-600 to-emerald-400"></div>
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-rose-500/5 rounded-full blur-[80px]"></div>
                        
                        <div className="w-56 h-56 bg-rose-50 text-rose-500 rounded-[5rem] flex items-center justify-center text-9xl mx-auto mb-16 shadow-inner shadow-rose-100 animate-bounce relative z-10">🔒</div>
                        
                        <h2 className="text-7xl font-black text-slate-900 mb-10 tracking-tighter leading-[0.8] relative z-10">Access<br/>Restricted</h2>
                        <p className="text-slate-500 text-2xl font-bold mb-20 leading-relaxed px-12 italic relative z-10">
                            Your trial journey has reached its destination. Become a <span className="text-rose-500 underline decoration-rose-200 underline-offset-8">Pro Sister</span> to preserve your legacy and continue the climb.
                        </p>
                        
                        <div className="space-y-10 relative z-10">
                            <button className="w-full py-14 bg-slate-900 text-white rounded-[4rem] font-black text-xl uppercase tracking-[0.5em] shadow-2xl hover:bg-rose-500 hover:-translate-y-2 active:scale-95 transition-all duration-500 shadow-rose-200">
                                UPGRADE TO PRO ACCESS — RS. 250
                            </button>
                            <div className="p-10 bg-slate-50 rounded-[3.5rem] border border-slate-100 flex items-center justify-center gap-6">
                                <div className="w-3 h-3 bg-rose-500 rounded-full animate-pulse"></div>
                                <p className="text-[14px] font-black text-slate-400 uppercase tracking-[0.5em]">
                                    Membership status: Trial Concluded
                                </p>
                            </div>
                        </div>
                        <p className="text-[12px] font-black text-slate-200 uppercase tracking-[2em] mt-24">NISA AL-HUDA ACADEMY</p>
                    </div>
                </div>
            )}
        </div>
    );
}