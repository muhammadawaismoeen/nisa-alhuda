import { useState, useEffect, useRef } from 'react';

export default function QuranScreen({ 
    surahs, selectedSurah, setSelectedSurah, ayahs, loadingQuran, 
    lang, setLang, searchQuery, setSearchQuery, searchMode, 
    setSearchMode, searchSurahNum, setSearchSurahNum, 
    searchAyahNum, setSearchAyahNum, ayahSearchResults, 
    setAyahSearchResults, handleAyahSearch, loadSurah 
}) {
    const [readingStyle, setReadingStyle] = useState('modern');
    const [listType, setListType] = useState('surah');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [lastRead, setLastRead] = useState(null);
    const [bookmarks, setBookmarks] = useState(JSON.parse(localStorage.getItem('quran_bookmarks')) || []);
    const [reciter, setReciter] = useState('ar.alafasy'); 
    const [playingAyah, setPlayingAyah] = useState(null);
    const [isLooping, setIsLooping] = useState(false);
    const [continuousPlay, setContinuousPlay] = useState(true);
    
    const ayahRefs = useRef({});
    const audioRef = useRef(new Audio());
    const scrollTimeout = useRef(null);

    const recitersList = [
        { id: 'ar.alafasy', name: 'Mishary Rashid Alafasy' },
        { id: 'ar.yasseraldossari', name: 'Yasser Al-Dosari' },
        { id: 'ar.mahermuaiqly', name: 'Maher Al-Muaiqly' },
        { id: 'ar.abdulsamad', name: 'Abdul Basit (Murattal)' },
        { id: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais' },
        { id: 'ar.shaatree', name: 'Abu Bakr Al-Shatri' },
        { id: 'ar.minshawi', name: 'Mohamed Siddiq Al-Minshawi' },
        { id: 'ar.hanirifai', name: 'Hani Ar-Rifai' },
    ];

    useEffect(() => {
        const saved = localStorage.getItem('quran_last_read_v2');
        if (saved) setLastRead(JSON.parse(saved));
        return () => {
            audioRef.current.pause();
            audioRef.current.src = "";
        };
    }, []);

    // Fix: Ensure Language Change triggers a reload of the current Surah
    const handleLanguageChange = (newLang) => {
        setLang(newLang);
        if (selectedSurah) {
            loadSurah(selectedSurah.number, newLang, selectedSurah.isJuz);
        }
    };

    useEffect(() => {
        if (!loadingQuran && selectedSurah && lastRead && selectedSurah.number === lastRead.number) {
            const timer = setTimeout(() => {
                const element = ayahRefs.current[lastRead.ayah];
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [loadingQuran, selectedSurah]);

    useEffect(() => {
        if (!selectedSurah || loadingQuran || listType === 'bookmarks') return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const ayahNum = parseInt(entry.target.getAttribute('data-ayah'));
                        clearTimeout(scrollTimeout.current);
                        scrollTimeout.current = setTimeout(() => {
                            const progress = {
                                number: selectedSurah.number,
                                name: selectedSurah.englishName,
                                arabicName: selectedSurah.name,
                                ayah: ayahNum
                            };
                            localStorage.setItem('quran_last_read_v2', JSON.stringify(progress));
                            setLastRead(progress);
                        }, 500);
                    }
                });
            },
            { threshold: 0.6, rootMargin: "-10% 0px -40% 0px" }
        );

        const currentAyahElements = Object.values(ayahRefs.current);
        currentAyahElements.forEach(el => el && observer.observe(el));

        return () => {
            currentAyahElements.forEach(el => el && observer.unobserve(el));
            clearTimeout(scrollTimeout.current);
        };
    }, [ayahs, selectedSurah, loadingQuran, listType]);

    useEffect(() => {
        const audio = audioRef.current;
        const handleEnded = () => {
            if (isLooping) {
                audio.play();
            } else if (continuousPlay && playingAyah) {
                const currentIndex = ayahs.findIndex(a => a.number === playingAyah);
                if (currentIndex !== -1 && currentIndex < ayahs.length - 1) {
                    const nextAyah = ayahs[currentIndex + 1];
                    playAudio(nextAyah.number);
                    ayahRefs.current[nextAyah.numberInSurah]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                } else {
                    setPlayingAyah(null);
                }
            } else {
                setPlayingAyah(null);
            }
        };
        audio.addEventListener('ended', handleEnded);
        return () => audio.removeEventListener('ended', handleEnded);
    }, [isLooping, continuousPlay, playingAyah, ayahs]);

    const playAudio = (ayahNumberInQuran) => {
        if (playingAyah === ayahNumberInQuran && !audioRef.current.paused) {
            audioRef.current.pause();
            setPlayingAyah(null);
        } else {
            const audioUrl = `https://cdn.islamic.network/quran/audio/128/${reciter}/${ayahNumberInQuran}.mp3`;
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
            setPlayingAyah(ayahNumberInQuran);
        }
    };

    const toggleBookmark = (ayah) => {
        const isBookmarked = bookmarks.some(b => b.id === ayah.number);
        const newBookmarks = isBookmarked 
            ? bookmarks.filter(b => b.id !== ayah.number)
            : [...bookmarks, { id: ayah.number, surahName: selectedSurah.englishName, surahNumber: selectedSurah.number, ayahNumber: ayah.numberInSurah, text: ayah.text, translation: ayah.translation }];
        setBookmarks(newBookmarks);
        localStorage.setItem('quran_bookmarks', JSON.stringify(newBookmarks));
    };

    const showBismillahHeader = selectedSurah && !selectedSurah.isJuz && selectedSurah.number !== 1 && selectedSurah.number !== 9;

    const renderAyahs = (ayahList) => {
        return ayahList.map((ayah, index) => {
            let cleanArabic = ayah.text;
            if (index === 0 && showBismillahHeader) {
                const words = cleanArabic.split(/\s+/);
                if (words.length > 4 && (words[0].includes('بِسْمِ') || words[0].includes('بِسۡمِ'))) {
                    cleanArabic = words.slice(4).join(' ').trim();
                }
            }

            const isBookmarked = bookmarks.some(b => b.id === ayah.number);
            const isThisPlaying = playingAyah === ayah.number;

            return (
                <div 
                    key={ayah.number} 
                    ref={el => ayahRefs.current[ayah.numberInSurah] = el}
                    data-ayah={ayah.numberInSurah}
                    className={`${readingStyle === 'modern' ? 'bg-white rounded-[2rem] p-6 mb-4 shadow-sm border border-rose-50' : 'py-6 border-b border-rose-100'} transition-all ${isThisPlaying ? 'ring-2 ring-rose-400 bg-rose-50/30' : ''}`}
                >
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex gap-2 items-center">
                            <span className="bg-rose-100 text-rose-600 text-[10px] font-bold px-3 py-1 rounded-full">
                                {selectedSurah?.isJuz ? `${ayah.surah?.englishName || ''} : ${ayah.numberInSurah}` : `Ayah ${ayah.numberInSurah}`}
                            </span>
                            <button onClick={() => playAudio(ayah.number)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${isThisPlaying ? 'bg-rose-500 text-white shadow-lg scale-110' : 'bg-rose-50 text-rose-400'}`}>
                                {isThisPlaying ? '⏸' : '▶'}
                            </button>
                            <button onClick={() => setIsLooping(!isLooping)} className={`text-[9px] font-black px-2 py-1 rounded-lg transition-all uppercase ${isLooping ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                {isLooping ? 'Looping' : 'Loop'}
                            </button>
                        </div>
                        <button onClick={() => toggleBookmark(ayah)} className="text-xl">
                            {isBookmarked ? '❤️' : '🤍'}
                        </button>
                    </div>
                    <p className="text-3xl font-serif text-right mb-4 leading-[1.8] text-gray-800" dir="rtl">{cleanArabic}</p>
                    <p className={`text-lg font-medium text-gray-600 leading-relaxed ${lang === 'ur.jalandhry' ? 'text-right font-serif' : 'text-left'}`} dir={lang === 'ur.jalandhry' ? 'rtl' : 'ltr'}>{ayah.translation}</p>
                </div>
            );
        });
    };

    return (
        <div className="relative pb-28 h-full overflow-y-auto no-scrollbar px-6">
            {isSidebarOpen && (
                <div className="fixed inset-0 z-[60] flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
                    <div className="relative w-64 bg-white h-full shadow-2xl p-6 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-sm font-black text-gray-800">Reading Settings</h3>
                            <button onClick={() => setIsSidebarOpen(false)} className="text-gray-400">✕</button>
                        </div>
                        <div className="space-y-6 overflow-y-auto no-scrollbar pb-10">
                            <div>
                                <p className="text-[10px] font-black text-rose-400 uppercase mb-3">Translation</p>
                                <div className="flex bg-rose-50 p-1 rounded-xl">
                                    <button onClick={() => handleLanguageChange('en.sahih')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${lang === 'en.sahih' ? 'bg-white text-rose-500 shadow-sm' : 'text-rose-300'}`}>English</button>
                                    <button onClick={() => handleLanguageChange('ur.jalandhry')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold ${lang === 'ur.jalandhry' ? 'bg-white text-rose-500 shadow-sm' : 'text-rose-300'}`}>Urdu</button>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-rose-400 uppercase mb-3">Audio Mode</p>
                                <button onClick={() => setContinuousPlay(!continuousPlay)} className={`w-full py-3 rounded-xl text-[10px] font-bold transition-all ${continuousPlay ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-50 text-rose-400'}`}>
                                    {continuousPlay ? '✓ Continuous Play On' : 'Continuous Play Off'}
                                </button>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-rose-400 uppercase mb-3">Reciter</p>
                                <div className="space-y-2">
                                    {recitersList.map(r => (
                                        <button key={r.id} onClick={() => setReciter(r.id)} className={`w-full text-left px-3 py-3 rounded-xl text-[10px] font-bold transition-all ${reciter === r.id ? 'bg-rose-500 text-white shadow-md' : 'bg-rose-50 text-rose-400'}`}>
                                            {r.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="pt-12 mb-8 flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-800">Al-Quran</h2>
                <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-white rounded-2xl shadow-sm border border-rose-50 text-rose-500">⚙️</button>
            </div>

            {!selectedSurah && lastRead && listType === 'surah' && searchMode === 'surah' && (
                <button 
                    onClick={() => loadSurah(lastRead.number)}
                    className="w-full mb-6 bg-gradient-to-br from-rose-400 to-rose-500 p-6 rounded-[2rem] text-white flex justify-between items-center shadow-lg active:scale-95 transition-all"
                >
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Resume {lastRead.name}</p>
                        <h4 className="text-xl font-black">Ayah {lastRead.ayah}</h4>
                    </div>
                    <div className="text-right"><p className="text-2xl font-serif" dir="rtl">{lastRead.arabicName}</p></div>
                </button>
            )}

            <div className="mb-8">
                <div className="flex gap-1 mb-4 bg-white p-1 rounded-2xl border border-rose-50">
                    <button onClick={() => { setSearchMode('surah'); setListType('surah'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${searchMode === 'surah' && listType === 'surah' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}>Surah</button>
                    <button onClick={() => { setSearchMode('surah'); setListType('juz'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${listType === 'juz' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}>Juz</button>
                    <button onClick={() => { setSearchMode('surah'); setListType('bookmarks'); }} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${listType === 'bookmarks' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}>❤️ Saved</button>
                    <button onClick={() => setSearchMode('ayah')} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${searchMode === 'ayah' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}>Search</button>
                </div>
                {searchMode === 'surah' && listType !== 'bookmarks' && (
                    <input type="text" placeholder={`Search ${listType}...`} className="w-full bg-white border-none rounded-2xl p-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-rose-200" onChange={(e) => setSearchQuery(e.target.value)} />
                )}
            </div>

            {loadingQuran ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Opening Heavens...</p>
                </div>
            ) : selectedSurah ? (
                <div>
                    <button onClick={() => { setSelectedSurah(null); ayahRefs.current = {}; }} className="mb-6 text-[10px] font-black text-rose-500 uppercase flex items-center gap-2">← Back to List</button>
                    <div className="bg-rose-500 rounded-[2.5rem] p-8 text-white text-center mb-8 shadow-lg">
                        <h3 className="text-3xl font-black mb-1">{selectedSurah.englishName}</h3>
                        <p className="text-2xl font-serif" dir="rtl">{selectedSurah.name}</p>
                    </div>
                    {showBismillahHeader && (
                        <div className="text-center mb-10 py-4"><p className="text-4xl font-serif text-gray-800" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</p></div>
                    )}
                    <div className="space-y-2">{renderAyahs(ayahs)}</div>
                </div>
            ) : listType === 'bookmarks' ? (
                <div className="space-y-4">
                    {bookmarks.length === 0 ? <p className="text-center py-20 text-rose-300 font-bold">No saved ayahs</p> : 
                        bookmarks.map(b => (
                            <div key={b.id} className="bg-white rounded-[2rem] p-6 border border-rose-50 shadow-sm">
                                <div className="flex justify-between mb-4"><span className="text-[10px] font-black text-rose-500 uppercase">{b.surahName} : {b.ayahNumber}</span></div>
                                <p className="text-2xl font-serif text-right mb-4 text-gray-800" dir="rtl">{b.text}</p>
                                <button onClick={() => loadSurah(b.surahNumber)} className="w-full py-2 bg-rose-50 text-rose-500 rounded-xl text-[10px] font-black">Go to Surah</button>
                            </div>
                        ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3">
                    {listType === 'juz' ? 
                        Array.from({ length: 30 }, (_, i) => i + 1).filter(j => j.toString().includes(searchQuery)).map(j => (
                            <button key={j} onClick={() => loadSurah(j, lang, true)} className="bg-white p-6 rounded-3xl flex flex-col items-center border border-rose-50 shadow-sm"><span className="text-rose-500 font-black mb-1">{j}</span><p className="font-black text-sm">Juz {j}</p></button>
                        )) :
                        surahs.filter(s => s.englishName.toLowerCase().includes(searchQuery.toLowerCase())).map(s => (
                            <button key={s.number} onClick={() => loadSurah(s.number)} className="bg-white p-5 rounded-3xl flex justify-between border border-rose-50 shadow-sm hover:border-rose-200 transition-all">
                                <div className="flex items-center gap-4"><span className="text-rose-500 font-black">{s.number}</span><div className="text-left"><p className="font-black text-sm">{s.englishName}</p></div></div>
                                <p className="text-lg font-serif text-rose-400" dir="rtl">{s.name}</p>
                            </button>
                        ))
                    }
                </div>
            )}
        </div>
    );
}