import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Dashboard from './components/Dashboard';
import QuranScreen from './components/QuranScreen';
import HadithScreen from './components/HadithScreen';
import DeedTracker from './components/DeedTracker';
import { TasbihCounter, CharityPot } from './components/Tools';
import { RewardsView, MoreView, BadgePopup, NavButton } from './components/UIElements';
import Auth from './components/Auth';

// --- CONSTANTS ---
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

// --- BRANDING COMPONENT ---
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
    // --- AUTH & PROFILE STATE ---
    const [session, setSession] = useState(null);
    const [user, setUser] = useState({ name: 'Sister', city: 'Lahore' });
    
    // --- NAVIGATION & UI STATE ---
    const [view, setView] = useState('home');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showBadgePopup, setShowBadgePopup] = useState(null);

    // --- TRACKER & PROGRESS STATE ---
    const [completedDeeds, setCompletedDeeds] = useState(JSON.parse(localStorage.getItem('barakah_deeds')) || []);
    const [totalPoints, setTotalPoints] = useState(Number(localStorage.getItem('barakah_points')) || 0);
    const [activeCategory, setActiveCategory] = useState('All');
    const [reflection, setReflection] = useState(localStorage.getItem('barakah_reflection') || "");
    const [unlockedBadges, setUnlockedBadges] = useState(JSON.parse(localStorage.getItem('barakah_badges')) || []);
    const [tasbihCount, setTasbihCount] = useState(Number(localStorage.getItem('barakah_tasbih')) || 0);
    const [charityGoal, setCharityGoal] = useState(Number(localStorage.getItem('barakah_charity_goal')) || 100);
    const [charitySaved, setCharitySaved] = useState(Number(localStorage.getItem('barakah_charity')) || 0);

    // --- QURAN STATE ---
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

    // --- PRAYER & DATE STATE ---
    const [prayerTimes, setPrayerTimes] = useState(null);
    const [islamicDate, setIslamicDate] = useState(null);

    // 1. Auth Listener - Updated to redirect to home on login
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session) setView('home'); // Redirect to dashboard on initial load if session exists
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session) setView('home'); // Redirect to dashboard when user signs in
        });

        return () => subscription.unsubscribe();
    }, []);

    // 2. Fetch Profile
    useEffect(() => {
        if (session) getProfile();
    }, [session]);

    async function getProfile() {
        try {
            const { data, error } = await supabase.from('profiles').select('username, city').eq('id', session.user.id).single();
            if (data) {
                setUser({ name: data.username, city: data.city || 'Lahore' });
                fetchPrayerData(data.city || 'Lahore');
            }
        } catch (error) { console.error('Error fetching profile:', error); }
    }

    // 3. Clock and Quran List Initialization
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        fetchSurahList();
        return () => clearInterval(timer);
    }, []);

    // --- LOGIC FUNCTIONS ---
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
                    if (cleanText.includes(bismillahPrefix)) {
                        cleanText = cleanText.replace(bismillahPrefix, "").trim();
                    }
                }
                return { ...a, text: cleanText, translation: trans.data.ayahs[i].text };
            });

            setAyahs(processedAyahs);
            if (isJuz) {
                setSelectedSurah({ number: num, englishName: `Juz ${num}`, name: `الجزء ${num}`, isJuz: true });
            } else {
                setSelectedSurah(surahs.find(s => s.number === num));
            }
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
        let newCompleted = completedDeeds.includes(deed.id) ? completedDeeds.filter(id => id !== deed.id) : [...completedDeeds, deed.id];
        let change = completedDeeds.includes(deed.id) ? -deed.points : deed.points;
        let newPoints = totalPoints + change;
        setCompletedDeeds(newCompleted); setTotalPoints(newPoints);
        localStorage.setItem('barakah_deeds', JSON.stringify(newCompleted)); 
        localStorage.setItem('barakah_points', newPoints.toString());
    };

    const getLevel = (pts) => {
        if (pts < 100) return "Beginner";
        if (pts < 500) return "Explorer";
        return "Devoted";
    };

    const getSunnahAdvice = () => ({ text: "Dhikr", icon: "📿" });

    const WeeklyGraph = () => (
        <div className="mt-8 px-8">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-rose-50">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Weekly Progress</p>
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

    // --- AUTH GUARD ---
    if (!session) return <Auth />;

    // --- RENDER ---
    return (
        <div className="min-h-screen bg-[#fff1f2] max-w-md mx-auto relative overflow-hidden font-sans">
            {showBadgePopup && <BadgePopup badge={showBadgePopup} onClose={() => setShowBadgePopup(null)} />}
            
            <main className="h-full pb-32">
                {view === 'home' && (
                    <div className="bg-rose-500 min-h-screen">
                        {/* Header with official logo */}
                        <div className="p-8 text-white text-center flex flex-col items-center">
                            <div className="w-full flex justify-between items-start mb-4">
                                <div className="text-left">
                                    <p className="text-3xl font-black">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{user.city}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Assalamu Alaikum,</p>
                                    <p className="text-xl font-black">{user.name} 🌸</p>
                                </div>
                            </div>
                            
                            <BrandLogo />

                            <div className="grid grid-cols-2 gap-4 w-full mt-8">
                                <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                                    <p className="text-[8px] font-bold uppercase opacity-60">Islamic Date</p>
                                    <p className="text-sm font-bold">{islamicDate?.day} {islamicDate?.month.en}</p>
                                </div>
                                <div className="bg-white/10 p-4 rounded-3xl border border-white/10">
                                    <p className="text-[8px] font-bold uppercase opacity-60">Today</p>
                                    <p className="text-sm font-bold">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                                </div>
                            </div>
                        </div>

                        {/* White content card */}
                        <div className="bg-white rounded-t-[3.5rem] p-8 -mt-6 min-h-[50vh] shadow-2xl">
                             <Dashboard 
                                user={user} 
                                prayerTimes={prayerTimes} 
                                islamicDate={islamicDate} 
                                currentTime={currentTime} 
                                totalPoints={totalPoints} 
                                getLevel={getLevel} 
                                format12Hour={format12Hour} 
                                fetchPrayerData={fetchPrayerData} 
                                setUser={setUser} 
                                QUOTES={QUOTES} 
                                DAILY_DUAS={DAILY_DUAS} 
                                getSunnahAdvice={getSunnahAdvice} 
                                WeeklyGraph={WeeklyGraph} 
                            />
                        </div>
                    </div>
                )}
                
                {view === 'quran' && (
                    <QuranScreen 
                        surahs={surahs} 
                        selectedSurah={selectedSurah}
                        setSelectedSurah={setSelectedSurah}
                        ayahs={ayahs}
                        loadingQuran={loadingQuran}
                        lang={lang}
                        setLang={setLang}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        searchMode={searchMode}
                        setSearchMode={setSearchMode}
                        searchSurahNum={searchSurahNum}
                        setSearchSurahNum={setSearchSurahNum}
                        searchAyahNum={searchAyahNum}
                        setSearchAyahNum={setSearchAyahNum}
                        ayahSearchResults={ayahSearchResults}
                        setAyahSearchResults={setAyahSearchResults}
                        handleAyahSearch={handleAyahSearch}
                        loadSurah={loadSurah}
                    />
                )}

                {view === 'hadith' && <HadithScreen />}
                
                {view === 'tracker' && (
                    <DeedTracker 
                        deeds={INITIAL_DEEDS} 
                        completedDeeds={completedDeeds} 
                        toggleDeed={toggleDeed} 
                        activeCategory={activeCategory} 
                        setActiveCategory={setActiveCategory} 
                        CATEGORIES={CATEGORIES} 
                    />
                )}

                {view === 'tasbih' && <TasbihCounter tasbihCount={tasbihCount} setTasbihCount={setTasbihCount} />}
                
                {view === 'charity' && (
                    <CharityPot 
                        charitySaved={charitySaved} 
                        setCharitySaved={setCharitySaved} 
                        charityGoal={charityGoal} 
                        setCharityGoal={setCharityGoal} 
                    />
                )}

                {view === 'rewards' && <RewardsView unlockedBadges={unlockedBadges} />}

                {view === 'more' && (
                    <MoreView 
                        setView={setView} 
                        reflection={reflection} 
                        setReflection={setReflection} 
                        onSignOut={() => supabase.auth.signOut()} 
                    />
                )}
            </main>
            
            <nav className="fixed bottom-6 left-6 right-6 h-20 bg-white/90 backdrop-blur-xl shadow-lg border border-white/20 rounded-[2.5rem] flex items-center justify-around px-2 z-50">
                <NavButton icon="🏠" label="Home" active={view === 'home'} onClick={() => setView('home')} />
                <NavButton icon="📜" label="Hadith" active={view === 'hadith'} onClick={() => setView('hadith')} />
                <NavButton icon="📖" label="Quran" active={view === 'quran'} onClick={() => setView('quran')} />
                <NavButton icon="📝" label="Deeds" active={view === 'tracker'} onClick={() => setView('tracker')} />
                <NavButton icon="✨" label="More" active={['more', 'tasbih', 'charity', 'rewards'].includes(view)} onClick={() => setView('more')} />
            </nav>
        </div>
    );
}