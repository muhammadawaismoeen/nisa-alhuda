import React from 'react';

export function NavButton({ icon, label, active, onClick }) {
    const activeColors = {
        'Home': 'text-amber-500 bg-amber-50',
        'Deeds': 'text-blue-500 bg-blue-50',
        'Quran': 'text-emerald-500 bg-emerald-50',
        'Ummah': 'text-purple-500 bg-purple-50',
        'More': 'text-rose-500 bg-rose-50'
    };

    return (
        <button 
            onClick={onClick}
            className={`relative flex flex-1 flex-col items-center justify-center h-full transition-all duration-200
                ${active ? `z-10` : 'text-gray-300 grayscale opacity-70'}`}
        >
            <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 ${active ? activeColors[label] : ''}`}>
                <span className={`text-2xl transition-all duration-200 ${active ? 'filter-none' : 'grayscale'}`}>
                    {icon}
                </span>
                
                <span className={`text-[9px] font-black uppercase tracking-tight mt-0.5 transition-all duration-200 
                    ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {label}
                </span>
            </div>
        </button>
    );
}

export function BadgePopup({ badge, onClose }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-rose-900/40 backdrop-blur-md" onClick={onClose} />
            <div className="relative bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 shadow-inner">
                    {badge.icon}
                </div>
                <h3 className="text-2xl font-black text-gray-800 mb-2">Mabrouk!</h3>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-8">Unlocked: {badge.title}</p>
                <button 
                    onClick={onClose}
                    className="w-full bg-rose-500 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-rose-200 active:scale-95 transition-transform"
                >
                    Continue Journey
                </button>
            </div>
        </div>
    );
}

export function MoreView({ setView, reflection, setReflection, onSignOut }) {
    return (
        <div className="pb-32 animate-in fade-in duration-500 h-full overflow-y-auto no-scrollbar px-6">
            <div className="pt-12 mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-2">More</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Settings & Reflection</p>
            </div>
            <div className="space-y-4">
                <button onClick={() => setView('tasbih')} className="w-full bg-white p-6 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-sm border border-rose-50">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">📿</span>
                        <p className="font-black text-gray-800 text-sm">Tasbih Counter</p>
                    </div>
                    <span className="text-rose-300 group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <button onClick={() => setView('charity')} className="w-full bg-white p-6 rounded-[2rem] flex items-center justify-between group active:scale-95 transition-all shadow-sm border border-rose-50">
                    <div className="flex items-center gap-4">
                        <span className="text-2xl">💰</span>
                        <p className="font-black text-gray-800 text-sm">Charity Pot</p>
                    </div>
                    <span className="text-rose-300 group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-rose-50">
                    <p className="text-[10px] font-black text-rose-400 uppercase mb-4 tracking-widest">Daily Reflection</p>
                    <textarea 
                        value={reflection}
                        onChange={(e) => { setReflection(e.target.value); localStorage.setItem('barakah_reflection', e.target.value); }}
                        placeholder="What are you grateful for today?"
                        className="w-full h-32 bg-rose-50/30 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-rose-100 resize-none"
                    />
                </div>
                
                {/* Sign Out Button - No data will be lost */}
                <button 
                    onClick={onSignOut} 
                    className="w-full bg-rose-500 text-white py-6 rounded-[2.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-100 active:scale-95 transition-all mt-8"
                >
                    Sign Out
                </button>
            </div>
        </div>
    );
}

export function RewardsView() { return null; }