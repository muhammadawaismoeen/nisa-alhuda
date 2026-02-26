import { useState, useEffect } from 'react';

export default function HadithScreen() {
    const [selectedBook, setSelectedBook] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [hadiths, setHadiths] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fontSize, setFontSize] = useState(16);
    const [activeMenu, setActiveMenu] = useState(null);
    const [languagePreference, setLanguagePreference] = useState({});
    
    // Search States
    const [searchQuery, setSearchQuery] = useState("");
    const [searchScope, setSearchScope] = useState("all"); 
    const [isSearching, setIsSearching] = useState(false);

    const books = [
        { id: 'bukhari', name: 'Al-Bukhari', arabic: 'صحيح البخاري', count: '7563' },
        { id: 'muslim', name: 'Al-Muslim', arabic: 'صحيح مسلم', count: '3033' },
        { id: 'tirmidhi', name: 'Al-Tirmazi', arabic: 'جامع الترمذي', count: '3956' },
        { id: 'abudawud', name: 'Abu Dawood', arabic: 'سنن أبي داود', count: '5274' },
        { id: 'nasai', name: 'Al-Nasai', arabic: 'سنن النسائي', count: '5758' },
        { id: 'ibnmajah', name: 'Sunnan e Ibn e Maja', arabic: 'سنن ابن ماجه', count: '4341' }
    ];

    const fetchChapters = async (bookId) => {
        setLoading(true);
        setSelectedBook(bookId);
        setSearchQuery("");
        try {
            const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${bookId}.json`);
            const data = await res.json();
            setChapters(data.metadata.sections);
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const fetchHadithsByChapter = async (bookId, chapterId) => {
        setLoading(true);
        try {
            const [engRes, araRes] = await Promise.all([
                fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${bookId}/sections/${chapterId}.json`),
                fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-${bookId}/sections/${chapterId}.json`)
            ]);
            const engData = await engRes.json();
            const araData = await araRes.json();

            if (engData.hadiths) {
                const mergedHadiths = engData.hadiths.map((h, index) => ({
                    ...h,
                    text_ar: araData.hadiths?.[index]?.text || "Arabic text unavailable.",
                    bookId: bookId,
                    chapterId: chapterId
                }));
                setHadiths(mergedHadiths);
            }
            setLanguagePreference({});
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleGlobalSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        
        setLoading(true);
        setIsSearching(true);
        setSelectedBook("search_results");
        
        try {
            const targetBook = searchScope === "all" ? "bukhari" : searchScope;
            const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${targetBook}.json`);
            const data = await res.json();
            
            const results = data.hadiths.filter(h => 
                h.text.toLowerCase().includes(searchQuery.toLowerCase()) || 
                h.hadithnumber.toString() === searchQuery
            ).slice(0, 20);

            // Important: Store book and chapter reference for each search result
            setHadiths(results.map(h => ({
                ...h, 
                bookId: targetBook, 
                chapterId: h.reference.book 
            })));
        } catch (e) {
            alert("Search failed.");
        }
        setLoading(false);
    };

    const loadUrduTranslation = async (h, index) => {
        setLoading(true);
        const bookId = h.bookId;
        const chapterId = h.chapterId;

        try {
            // Fetch the Urdu chapter specifically
            const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/urd-${bookId}/sections/${chapterId}.json`);
            const data = await res.json();
            
            // Match the specific hadith number in that chapter
            const urduMatch = data.hadiths.find(uh => uh.hadithnumber == h.hadithnumber);
            
            if (urduMatch) {
                setHadiths(prev => prev.map((item, i) => 
                    i === index ? { ...item, text_urd: urduMatch.text } : item
                ));
                setLanguagePreference(prev => ({...prev, [h.hadithnumber]: 'urd'}));
            } else {
                alert("Urdu translation for this specific narration is missing in the database.");
            }
        } catch (e) { 
            alert("Urdu translation not available for this book/section."); 
        }
        setLoading(false);
        setActiveMenu(null);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setActiveMenu(null);
        alert("Copied!");
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full bg-[#fff1f2]">
                <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Processing...</p>
            </div>
        );
    }

    return (
        <div className="relative pb-28 h-full overflow-y-auto no-scrollbar px-6 bg-[#fff1f2]">
            <div className="pt-12 mb-6">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Hadith</h2>
            </div>

            {/* SEARCH AREA */}
            <div className="mb-8 space-y-3">
                <form onSubmit={handleGlobalSearch} className="relative group">
                    <input 
                        type="text"
                        placeholder="Search topic or Hadees #..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border-2 border-rose-100 rounded-2xl py-4 px-6 pr-12 text-sm font-bold text-gray-700 focus:outline-none focus:border-rose-300 transition-all shadow-sm"
                    />
                    <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 text-xl">🔍</button>
                </form>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                    <button 
                        onClick={() => setSearchScope("all")}
                        className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${searchScope === 'all' ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 border border-rose-50'}`}
                    >
                        Collective
                    </button>
                    {books.map(b => (
                        <button 
                            key={b.id}
                            onClick={() => setSearchScope(b.id)}
                            className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${searchScope === b.id ? 'bg-rose-500 text-white' : 'bg-white text-gray-400 border border-rose-50'}`}
                        >
                            {b.name}
                        </button>
                    ))}
                </div>
            </div>

            {!selectedBook ? (
                <div className="grid grid-cols-2 gap-4">
                    {books.map((book) => (
                        <button 
                            key={book.id} 
                            onClick={() => fetchChapters(book.id)}
                            className="bg-[#374151] p-6 rounded-2xl flex flex-col items-center justify-center relative overflow-hidden group border border-gray-600 shadow-xl active:scale-95 transition-all"
                        >
                            <div className="text-3xl font-serif text-white mb-3 opacity-90 group-hover:scale-110 transition-transform duration-500">{book.arabic}</div>
                            <h4 className="text-white font-black text-[11px] mb-1">{book.name}</h4>
                            <span className="text-green-400 text-[8px] font-black uppercase tracking-tighter">Verified</span>
                        </button>
                    ))}
                </div>
            ) : hadiths.length > 0 ? (
                <div className="space-y-6">
                    <button onClick={() => {setHadiths([]); setSelectedBook(null); setIsSearching(false);}} className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2">
                        <span>←</span> Back
                    </button>
                    
                    {hadiths.map((h, idx) => (
                        <div key={`${h.hadithnumber}-${idx}`} className="bg-[#1f2937] rounded-[2.5rem] p-8 shadow-2xl border border-gray-800 relative">
                            <div className="flex justify-between items-start mb-6">
                                <span className="bg-rose-500/20 text-rose-400 text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-widest">{h.bookId || selectedBook}</span>
                                <div className="text-rose-400 font-black text-[10px] text-right tracking-widest uppercase">Hadees # {h.hadithnumber}</div>
                            </div>
                            
                            <p className="text-white text-2xl font-serif text-right leading-[2.2] mb-10" dir="rtl">{h.text_ar}</p>
                            <div className="w-12 h-1 bg-gray-700 rounded-full mb-10 mx-auto opacity-30" />
                            <p 
                                className={`text-gray-300 leading-[1.8] mb-10 font-medium ${languagePreference[h.hadithnumber] === 'urd' ? 'text-right italic' : 'text-left'}`} 
                                dir={languagePreference[h.hadithnumber] === 'urd' ? 'rtl' : 'ltr'}
                            >
                                {languagePreference[h.hadithnumber] === 'urd' ? (h.text_urd || "Loading Urdu...") : h.text}
                            </p>

                            <div className="flex justify-between items-end border-t border-gray-800 pt-6">
                                <div className="space-y-1.5 text-left text-white text-[10px] font-black uppercase tracking-wider">
                                    <p>Status: <span className="text-green-500 ml-1">{h.grades?.[0]?.grade || "Sahih"}</span></p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="relative">
                                        <button onClick={() => setActiveMenu(activeMenu === h.hadithnumber ? null : h.hadithnumber)} className="w-11 h-11 rounded-full border-2 border-gray-700 flex items-center justify-center text-gray-400 active:bg-gray-700 transition-colors">⋮</button>
                                        {activeMenu === h.hadithnumber && (
                                            <div className="absolute bottom-16 right-0 w-44 bg-[#2d3748] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                                <button onClick={() => loadUrduTranslation(h, idx)} className="w-full text-left px-4 py-3 text-[10px] font-bold text-white hover:bg-gray-700 border-b border-gray-700 uppercase flex justify-between items-center">Urdu <span>اردو</span></button>
                                                <button onClick={() => { setLanguagePreference(p => ({...p, [h.hadithnumber]: 'eng'})); setActiveMenu(null); }} className="w-full text-left px-4 py-3 text-[10px] font-bold text-white hover:bg-gray-700 border-b border-gray-700 uppercase">English</button>
                                                <button onClick={() => copyToClipboard(languagePreference[h.hadithnumber] === 'urd' ? h.text_urd : h.text)} className="w-full text-left px-4 py-3 text-[10px] font-bold text-rose-400 hover:bg-gray-700 uppercase">Copy Hadees</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <button onClick={() => setSelectedBook(null)} className="text-[10px] font-black text-rose-500 uppercase flex items-center gap-2 mb-4"><span>←</span> Back</button>
                    {Object.entries(chapters).map(([id, title]) => (
                        <button key={id} onClick={() => fetchHadithsByChapter(selectedBook, id)} className="w-full bg-white p-6 rounded-3xl flex justify-between items-center shadow-sm border border-rose-50 hover:border-rose-200 transition-all text-left">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-black text-rose-300">#{id}</span>
                                <span className="font-black text-gray-800 text-sm line-clamp-1">{title || `Chapter ${id}`}</span>
                            </div>
                            <span className="text-rose-400 font-bold">→</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}