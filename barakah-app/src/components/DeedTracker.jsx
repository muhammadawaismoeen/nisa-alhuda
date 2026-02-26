export default function DeedTracker({ deeds, completedDeeds, toggleDeed, activeCategory, setActiveCategory, newDeedText, setNewDeedText, addCustomDeed, CATEGORIES }) {
    const filtered = activeCategory === 'All' ? deeds : deeds.filter(d => d.category === activeCategory);
    return (
        <div className="p-8 pb-32 animate-in fade-in h-full overflow-y-auto no-scrollbar">
            <h2 className="text-3xl font-black text-gray-900 mb-6">Deeds</h2>
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                {['All', ...CATEGORIES].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-6 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-rose-500 text-white shadow-md' : 'bg-white text-gray-400 border border-rose-50'}`}>{cat}</button>
                ))}
            </div>
            <div className="space-y-4 mt-4">
                {filtered.map(deed => {
                    const isDone = completedDeeds.includes(deed.id);
                    return (
                        <button key={deed.id} onClick={() => toggleDeed(deed)} className={`w-full p-5 rounded-[2rem] flex items-center border-2 transition-all ${isDone ? 'bg-rose-50 border-rose-100 shadow-inner' : 'bg-white border-transparent shadow-sm'}`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mr-4 transition-all ${isDone ? 'bg-rose-500 text-white rotate-[360deg]' : 'bg-rose-50 text-rose-300'}`}>{isDone ? '✓' : '○'}</div>
                            <div className="text-left flex-1"><p className={`text-sm font-black ${isDone ? 'line-through text-gray-300' : 'text-gray-800'}`}>{deed.text}</p><p className="text-[9px] font-black text-rose-300 uppercase tracking-widest">{deed.category}</p></div>
                            <div className="text-right ml-2"><span className={`text-xs font-black ${isDone ? 'text-rose-300' : 'text-rose-500'}`}>+{deed.points}</span></div>
                        </button>
                    );
                })}
            </div>
            <div className="mt-8 bg-white p-6 rounded-[2.5rem] border border-rose-100 shadow-sm">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-4">Add Personal Deed</p>
                <div className="flex gap-2">
                    <input type="text" value={newDeedText} onChange={(e) => setNewDeedText(e.target.value)} placeholder="e.g. Fed a stray cat" className="flex-1 bg-rose-50/50 rounded-2xl px-4 py-3 text-sm outline-none font-medium" />
                    <button onClick={addCustomDeed} className="w-12 h-12 bg-rose-500 text-white rounded-2xl font-black text-xl shadow-lg active:scale-90 transition-all">+</button>
                </div>
            </div>
        </div>
    );
}