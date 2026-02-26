export const TasbihCounter = ({ tasbihCount, setTasbihCount }) => (
    <div className="p-8 pb-28 animate-in fade-in flex flex-col items-center justify-center h-full">
        <h2 className="text-2xl font-black text-gray-900 mb-8">Digital Tasbih</h2>
        <div onClick={() => { const n = tasbihCount + 1; setTasbihCount(n); localStorage.setItem('barakah_tasbih', n.toString()); }} className="w-64 h-64 bg-white rounded-full border-8 border-rose-100 flex flex-col items-center justify-center shadow-2xl active:scale-95 transition-all cursor-pointer select-none">
            <p className="text-6xl font-black text-rose-600">{tasbihCount}</p>
        </div>
        <button onClick={() => { setTasbihCount(0); localStorage.setItem('barakah_tasbih', '0'); }} className="mt-12 text-rose-400 text-[10px] font-black uppercase tracking-widest border-b border-rose-100 pb-1">Reset</button>
    </div>
);

export const CharityPot = ({ charitySaved, setCharitySaved, charityGoal, setCharityGoal }) => {
    const charityProgress = Math.min((charitySaved / charityGoal) * 100, 100);
    const addMoney = (amt) => { const next = charitySaved + amt; setCharitySaved(next); localStorage.setItem('barakah_charity', next.toString()); };
    return (
        <div className="p-8 pb-28 animate-in fade-in h-full">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Charity Pot</h2>
            <div className="bg-white rounded-[3rem] p-8 border border-rose-100 shadow-sm relative overflow-hidden mb-6">
                <div className="relative z-10 flex flex-col items-center">
                    <div className="text-6xl mb-4">🍯</div>
                    <p className="text-4xl font-black text-rose-600 mb-1">${charitySaved}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Goal: ${charityGoal}</p>
                    <div className="w-full bg-rose-50 h-4 rounded-full mt-6 relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-rose-500 transition-all duration-1000" style={{ width: `${charityProgress}%` }} />
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 5, 10].map(amt => (
                    <button key={amt} onClick={() => addMoney(amt)} className="bg-white border-2 border-rose-50 p-4 rounded-2xl font-black text-rose-500 active:scale-95">+${amt}</button>
                ))}
            </div>
            <button onClick={() => { const newGoal = prompt("Set goal:", charityGoal); if (newGoal) { setCharityGoal(Number(newGoal)); localStorage.setItem('barakah_charity_goal', newGoal); } }} className="w-full p-4 bg-rose-50 text-rose-500 text-[10px] font-black uppercase rounded-2xl">Edit Goal</button>
        </div>
    );
};