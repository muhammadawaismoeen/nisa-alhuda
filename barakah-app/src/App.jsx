import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './components/Dashboard';
import QuranScreen from './components/QuranScreen';
import HadithScreen from './components/HadithScreen';
import DeedTracker from './components/DeedTracker';
import CycleTracker from './components/CycleTracker'; 
import HasanatEngine from './components/HasanatEngine'; 
import Leaderboard from './components/Leaderboard'; 
import AdminDashboard from './components/admin/AdminDashboard'; 
import { TasbihCounter, CharityPot } from './components/Tools';
import { RewardsView, MoreView, BadgePopup, NavButton } from './components/UIElements';
import Auth from './components/Auth';

// --- QURANLY STYLE CONSTANTS ---
const CATEGORIES = ['Worship', 'Dhikr', 'Charity', 'Sunnah'];
const INITIAL_DEEDS = [
    { id: 1, text: 'Prayed 5 Daily Salah', points: 50, category: 'Worship' },
    { id: 2, text: 'Read 1 Page of Quran', points: 20, category: 'Worship' },
    { id: 3, text: 'Morning/Evening Dhikr', points: 15, category: 'Dhikr' },
    { id: 4, text: 'Gave Sadaqah (Charity)', points: 30, category: 'Charity' },
    { id: 5, text: 'Helped a Family Member', points: 25, category: 'Charity' },
    { id: 6, text: 'Sunnah Fasting', points: 100, category: 'Sunnah' },
];

const DAILY_DUAS = [
    { arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا", translation: "O Allah, I ask You for beneficial knowledge, goodly provision and acceptable deeds.", source: "Ibn Majah" },
    { arabic: "رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ", translation: "My Lord, forgive me and accept my repentance, You are the Ever-Relenting, the All-Merciful.", source: "Abu Dawud" }
];

const QUOTES = [
    "The best of deeds are those done consistently.", 
    "Verily, with hardship comes ease.",
    "Be kind, for whenever kindness becomes part of something, it beautifies it."
];

const BrandLogo = () => (
    <div className="flex flex-col items-center">
        <img 
            src="/logo.png" 
            alt="Nisa Al-Huda Logo" 
            className="w-32 h-auto drop-shadow-md" 
        />
        <p className="text-[8px] font-black tracking-[0.3em] uppercase mt-2 opacity-90"></p>
    </div>
);

export default function App() {
    // --- STATE MANAGEMENT ---
    const [session, setSession] = useState(null);
    const [user, setUser] = useState({ name: 'Sister', city: 'Lahore', role: 'user' }); 
    const [view, setView] = useState('home');
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBadgePopup, setShowBadgePopup] = useState(null);
    const [activeChallenge, setActiveChallenge] = useState(null); 
    const [isCompletingChallenge, setIsCompletingChallenge] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    // --- QURANLY GAMIFICATION ENGINE STATE ---
    const [completedDeeds, setCompletedDeeds] = useState(JSON.parse(localStorage.getItem('barakah_deeds')) || []);
    const [totalPoints, setTotalPoints] = useState(Number(localStorage.getItem('barakah_points')) || 0);
    const [activeCategory, setActiveCategory] = useState('All');
    const [reflection, setReflection] = useState(localStorage.getItem('barakah_reflection') || "");
    const [unlockedBadges, setUnlockedBadges] = useState(JSON.parse(localStorage.getItem('barakah_badges')) || []);
    const [tasbihCount, setTasbihCount] = useState(Number(localStorage.getItem('barakah_tasbih')) || 0);
    const [charityGoal, setCharityGoal] = useState(Number(localStorage.getItem('barakah_charity_goal')) || 100);
    const [charitySaved, setCharitySaved] = useState(Number(localStorage.getItem('barakah_charity')) || 0);

    // --- QURAN DATA STATE ---
    const [surahs, setSurahs] = useState([]);
    const [selectedSurah, setSelectedSurah] = useState(null);
    const [ayahs, setAyahs] = useState([]);
    const [loadingQuran, setLoadingQuran] = useState(false);
    const [lang, setLang] = useState('en.sahih');
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMode, setSearchMode] = useState("surah");
    const [searchSurahNum, setSearchSurahNum] = useState("");
    const [searchAyahNum, setSearchAyahNum] = useState("");
    const [ayahSearchResults, setAyahSearchResults] = useState(null);

    const [prayerTimes, setPrayerTimes] = useState(null);
    const [islamicDate, setIslamicDate] = useState(null);

    // --- DYNAMIC SYNC ENGINE ---
    const syncHasanat = async (newPoints) => {
        setTotalPoints(newPoints);
        localStorage.setItem('barakah_points', newPoints.toString());
        localStorage.setItem('barakah_hasanat_extra', newPoints.toString());
        window.dispatchEvent(new Event('storage'));

        // Push to Database for Leaderboard
        if (session?.user?.id) {
            await supabase
                .from('profiles')
                .update({ points: newPoints }) 
                .eq('id', session.user.id);
        }
    };

    const fetchChallenge = async () => {
        try {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                .gt('expires_at', now) // ONLY FETCH IF NOT EXPIRED
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            
            if (error) throw error;
            if (data) setActiveChallenge(data);
        } catch (err) {
            setActiveChallenge(null);
        }
    };

    // New: Countdown Logic
    useEffect(() => {
        if (!activeChallenge) return;
        const interval = setInterval(() => {
            const target = new Date(activeChallenge.expires_at).getTime();
            const now = new Date().getTime();
            const diff = target - now;

            if (diff <= 0) {
                setActiveChallenge(null);
                clearInterval(interval);
            } else {
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${hours}h ${mins}m left`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [activeChallenge]);

    const completeChallenge = async () => {
        if (!activeChallenge || isCompletingChallenge) return;
        setIsCompletingChallenge(true);
        const newTotal = totalPoints + (activeChallenge.points || 50);
        await syncHasanat(newTotal);
        alert(`MashaAllah! You earned ${activeChallenge.points} Hasanat!`);
        setActiveChallenge(null); 
        setIsCompletingChallenge(false);
    };

    // --- AUTH & RECOGNITION ENGINE ---
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) getProfile(session.user.id, 'INITIAL');
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setSession(session);
            if (session) {
                getProfile(session.user.id, event);
            } else {
                setUser({ name: 'Sister', city: 'Lahore', role: 'user' });
                setIsAdminMode(false);
            }
        });

        fetchChallenge(); 
        return () => subscription.unsubscribe();
    }, []);

    async function getProfile(userId, authEvent = null) {
        if (!userId) return;
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, city, role, points')
                .eq('id', userId)
                .single();
            
            if (error) return;

            if (data) {
                setUser({ 
                    name: data.username || 'Sister', 
                    city: data.city || 'Lahore', 
                    role: data.role || 'user' 
                });
                if (data.points !== undefined) {
                    setTotalPoints(data.points);
                    localStorage.setItem('barakah_points', data.points);
                }
                fetchPrayerData(data.city || 'Lahore');

                if (data.role === 'admin' && authEvent === 'SIGNED_IN') {
                    setIsAdminMode(true);
                }
            }
        } catch (error) { 
            console.error('System Recognition Error:', error); 
        }
    }

    useEffect(() => {
        if (isAdminMode && user.role !== 'admin') {
            setIsAdminMode(false);
        }
    }, [user.role, isAdminMode]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchSurahList();
        return () => clearInterval(timer);
    }, []);

    const format12Hour = (timeStr) => {
        if (!timeStr) return "--:--";
        let [hours, minutes] = timeStr.split(':');
        hours = parseInt(hours);
        const ampm = hours >= 12 ? 'pm' : 'am';
        hours = hours % 12 || 12;
        return `${hours}:${minutes} ${ampm}`;
    };

    const fetchPrayerData = async (city) => {
        try {
            const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=Pakistan&method=2`);
            const json = await res.json();
            if (json.data) { 
                setPrayerTimes(json.data.timings); 
                setIslamicDate(json.data.date.hijri); 
            }
        } catch (e) { console.error("Prayer Error"); }
    };

    const fetchSurahList = async () => {
        try {
            const res = await fetch('https://api.alquran.cloud/v1/surah');
            const data = await res.json();
            setSurahs(data.data);
        } catch (e) { console.error("Quran Error"); }
    };

    const loadSurah = async (num, currentLang = lang, isJuz = false) => {
        setLoadingQuran(true);
        try {
            const endpoint = isJuz ? `juz/${num}` : `surah/${num}`;
            const [arRes, transRes] = await Promise.all([
                fetch(`https://api.alquran.cloud/v1/${endpoint}`),
                fetch(`https://api.alquran.cloud/v1/${endpoint}/${currentLang}`)
            ]);
            const ar = await arRes.json();
            const trans = await transRes.json();
            const bismillahPrefix = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";
            const processedAyahs = ar.data.ayahs.map((a, i) => {
                let cleanText = a.text;
                if (a.numberInSurah === 1 && num !== 1) {
                    if (cleanText.includes(bismillahPrefix)) cleanText = cleanText.replace(bismillahPrefix, "").trim();
                }
                return { ...a, text: cleanText, translation: trans.data.ayahs[i].text };
            });
            setAyahs(processedAyahs);
            if (isJuz) {
                setSelectedSurah({ number: num, englishName: `Juz ${num}`, name: `الجزء ${num}`, isJuz: true });
            } else {
                setSelectedSurah(surahs.find(s => s.number === num));
            }
            syncHasanat(totalPoints + 5); 
        } catch (e) { console.error("Load Error"); }
        setLoadingQuran(false);
    };

    const handleAyahSearch = async () => {
        if (!searchSurahNum || !searchAyahNum) return;
        setLoadingQuran(true);
        try {
            const [arRes, transRes] = await Promise.all([
                fetch(`https://api.alquran.cloud/v1/ayah/${searchSurahNum}:${searchAyahNum}`),
                fetch(`https://api.alquran.cloud/v1/ayah/${searchSurahNum}:${searchAyahNum}/${lang}`)
            ]);
            const arData = await arRes.json();
            const transData = await transRes.json();
            if (arData.status === "OK") setAyahSearchResults({ text: arData.data.text, translation: transData.data.text, surah: arData.data.surah.englishName, number: arData.data.numberInSurah });
        } catch (e) { console.error("Search Error"); }
        setLoadingQuran(false);
    };

    const toggleDeed = (deed) => {
        const isCompleting = !completedDeeds.includes(deed.id);
        const newCompleted = isCompleting 
            ? [...completedDeeds, deed.id] 
            : completedDeeds.filter(id => id !== deed.id);
        
        const change = isCompleting ? deed.points : -deed.points;
        const newTotal = totalPoints + change;
        
        syncHasanat(newTotal);
        setCompletedDeeds(newCompleted);
        localStorage.setItem('barakah_deeds', JSON.stringify(newCompleted)); 
    };

    const getLevel = (pts) => {
        if (pts < 500) return "Seeker";
        if (pts < 2000) return "Sower of Good";
        if (pts < 5000) return "Muhsin";
        return "Guardian of Light";
    };

    const getSunnahAdvice = () => ({ text: "Dhikr", icon: "📿" });

    const WeeklyGraph = () => (
        <div className="mt-8 px-8">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-50">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4 text-center">Consistency Tracker</p>
                <div className="flex items-end justify-between h-20 gap-2">
                    {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                            <div className="w-full bg-rose-100 rounded-t-lg relative" style={{ height: `${h}%` }}>
                                <div className="absolute inset-0 bg-rose-500 rounded-t-lg opacity-0 hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-[8px] font-bold text-gray-400 mt-2">{"MTWTFSS"[i]}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fff1f2] max-w-md mx-auto relative overflow-hidden font-sans">
            {!session ? (
                <Auth />
            ) : (
                <>
                    {showBadgePopup && <BadgePopup badge={showBadgePopup} onClose={() => setShowBadgePopup(null)} />}
                    {isAdminMode && user.role === 'admin' && (
                        <AdminDashboard 
                            onClose={() => setIsAdminMode(false)} 
                            onChallengeUpdate={fetchChallenge}
                        />
                    )}
                    <main className="h-full pb-32">
                        {view === 'home' && (
                            <div className="bg-rose-500 min-h-screen">
                                <div className="p-8 text-white text-center flex flex-col items-center">
                                    <HasanatEngine />
                                    <div className="w-full flex justify-between items-start mb-4">
                                        <div className="text-left"> 
                                            <p className="text-3xl font-black">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                                                {user.city} {user.role === 'admin' && "🛡️"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Assalamu Alaikum,</p>
                                            <p className="text-xl font-black">{user.name} 🌸</p>
                                        </div>
                                    </div>
                                    <BrandLogo />
                                    <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                        <div className="bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                                            <p className="text-[8px] font-bold uppercase opacity-60">Islamic Date</p>
                                            <p className="text-sm font-bold">{islamicDate?.day} {islamicDate?.month.en}</p>
                                        </div>
                                        <div className="bg-white/10 p-4 rounded-3xl border border-white/10 backdrop-blur-sm">
                                            <p className="text-[8px] font-bold uppercase opacity-60">Today</p>
                                            <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-t-[3.5rem] p-8 -mt-6 min-h-[50vh] shadow-2xl relative z-10">
                                    
                                    {/* LIVE CHALLENGE COMPONENT - WITH TIME LEFT */}
                                    {activeChallenge && (
                                        <div className="mb-8 p-6 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 animate-in fade-in zoom-in duration-500">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-white/20 p-1.5 rounded-lg text-xs">🚀</span>
                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Global Challenge</p>
                                                </div>
                                                <span className="text-[10px] font-black bg-black/20 px-3 py-1 rounded-full">{timeLeft}</span>
                                            </div>
                                            <p className="text-lg font-black leading-tight mb-1">{activeChallenge.title}</p>
                                            <p className="text-[11px] opacity-70 mb-4 font-medium">{activeChallenge.description}</p>
                                            
                                            <button 
                                                onClick={completeChallenge}
                                                disabled={isCompletingChallenge}
                                                className="w-full flex justify-between items-center bg-white/10 hover:bg-white/20 active:scale-95 transition-all p-4 rounded-2xl border border-white/10"
                                            >
                                                <span className="text-[10px] font-black uppercase tracking-widest">
                                                    {isCompletingChallenge ? "SYNCING..." : "Mark Completed"}
                                                </span>
                                                <span className="bg-white text-indigo-600 px-3 py-1 rounded-full text-[10px] font-black">
                                                    +{activeChallenge.points} ❤️
                                                </span>
                                            </button>
                                        </div>
                                    )}

                                    <Dashboard 
                                        user={user} prayerTimes={prayerTimes} islamicDate={islamicDate} currentTime={currentTime} 
                                        totalPoints={totalPoints} getLevel={getLevel} format12Hour={format12Hour} 
                                        fetchPrayerData={fetchPrayerData} setUser={setUser} QUOTES={QUOTES} 
                                        DAILY_DUAS={DAILY_DUAS} getSunnahAdvice={getSunnahAdvice} WeeklyGraph={WeeklyGraph} 
                                    />
                                    
                                    {user.role === 'admin' && (
                                        <div className="mt-8">
                                            <button 
                                                onClick={() => setIsAdminMode(true)}
                                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                                            >
                                                🔐 Enter Command Center
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {view === 'leaderboard' && <Leaderboard />}
                        {view === 'cycle' && <CycleTracker />}
                        {view === 'quran' && (
                            <QuranScreen 
                                surahs={surahs} selectedSurah={selectedSurah} setSelectedSurah={setSelectedSurah}
                                ayahs={ayahs} loadingQuran={loadingQuran} lang={lang} setLang={setLang}
                                searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchMode={searchMode}
                                setSearchMode={setSearchMode} searchSurahNum={searchSurahNum} setSearchSurahNum={setSearchSurahNum}
                                searchAyahNum={searchAyahNum} setSearchAyahNum={setSearchAyahNum} ayahSearchResults={ayahSearchResults}
                                setAyahSearchResults={setAyahSearchResults} handleAyahSearch={handleAyahSearch} loadSurah={loadSurah}
                            />
                        )}
                        {view === 'hadith' && <HadithScreen />}
                        {view === 'tracker' && (
                            <DeedTracker 
                                deeds={INITIAL_DEEDS} completedDeeds={completedDeeds} toggleDeed={toggleDeed} 
                                activeCategory={activeCategory} setActiveCategory={setActiveCategory} CATEGORIES={CATEGORIES} 
                            />
                        )}
                        {view === 'tasbih' && <TasbihCounter tasbihCount={tasbihCount} setTasbihCount={setTasbihCount} />}
                        {view === 'charity' && <CharityPot charitySaved={charitySaved} setCharitySaved={setCharitySaved} charityGoal={charityGoal} setCharityGoal={setCharityGoal} />}
                        {view === 'rewards' && <RewardsView unlockedBadges={unlockedBadges} />}
                        {view === 'more' && (
                            <MoreView 
                                setView={setView} reflection={reflection} setReflection={setReflection} 
                                onSignOut={() => supabase.auth.signOut()} 
                            />
                        )}
                    </main>
                    <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/90 backdrop-blur-xl shadow-lg border border-white/20 rounded-[2.5rem] flex items-center justify-around px-1 z-50">
                        <NavButton icon="🏠" label="Home" active={view === 'home'} onClick={() => setView('home')} />
                        <NavButton icon="🏆" label="Rank" active={view === 'leaderboard'} onClick={() => setView('leaderboard')} />
                        <NavButton icon="📖" label="Quran" active={view === 'quran'} onClick={() => setView('quran')} />
                        <NavButton icon="🩸" label="Cycle" active={view === 'cycle'} onClick={() => setView('cycle')} />
                        <NavButton icon="📝" label="Deeds" active={view === 'tracker'} onClick={() => setView('tracker')} />
                        <NavButton icon="✨" label="More" active={['more', 'tasbih', 'charity', 'rewards', 'hadith'].includes(view)} onClick={() => setView('more')} />
                    </nav>
                </>
            )}
        </div>
    );
}