import { useState, useEffect } from 'react';

export default function CycleTracker() {
    // --- STATE MANAGEMENT ---
    const [status, setStatus] = useState(localStorage.getItem('barakah_cycle_status') || 'Tuhr');
    const [history, setHistory] = useState(JSON.parse(localStorage.getItem('barakah_cycle_history')) || []);
    const [lastUpdated, setLastUpdated] = useState(localStorage.getItem('barakah_cycle_last_date') || null);
    const [elapsedTime, setElapsedTime] = useState({ days: 0, hours: 0, mins: 0 });
    const [projection, setProjection] = useState("");
    const [viewMode, setViewMode] = useState('stats'); 
    const [deletingId, setDeletingId] = useState(null); 
    const [showGhuslReminder, setShowGhuslReminder] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    // --- SYMPTOMS & FLOW ---
    const [selectedFlow, setSelectedFlow] = useState('Medium');
    const [selectedColor, setSelectedColor] = useState('Red');

    // --- FIQH HABIT (AADAT) ---
    const [habitHayd, setHabitHayd] = useState(parseInt(localStorage.getItem('barakah_habit_hayd')) || 7);
    const [habitTuhr, setHabitTuhr] = useState(parseInt(localStorage.getItem('barakah_habit_tuhr')) || 21);

    // --- QADHA FAST TRACKER ---
    const [qadhaCount, setQadhaCount] = useState(parseInt(localStorage.getItem('barakah_qadha_count')) || 0);
    const [isRamadanMode, setIsRamadanMode] = useState(localStorage.getItem('barakah_ramadan_mode') === 'true');

    // --- EFFECT: FIXED CALCULATE TIME & PROJECTIONS ---
    useEffect(() => {
        if (history && history.length > 0) {
            const lastLogTimestamp = history[0].timestamp;
            
            const updateLogic = () => {
                const now = new Date().getTime();
                const diff = Math.max(0, now - lastLogTimestamp); // Ensure no negative values
                
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                
                setElapsedTime({ days, hours, mins });

                const lastDate = new Date(lastLogTimestamp);
                if (status === 'Hayd') {
                    const maxHaydDate = new Date(lastDate);
                    maxHaydDate.setDate(lastDate.getDate() + 10);
                    setProjection(`Max Hayd ends: ${maxHaydDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
                } else {
                    const nextCycleDate = new Date(lastDate);
                    nextCycleDate.setDate(lastDate.getDate() + parseInt(habitTuhr));
                    setProjection(`Next Cycle expected: ${nextCycleDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`);
                }
            };

            updateLogic();
            const interval = setInterval(updateLogic, 30000); // Update every 30 seconds for accuracy
            return () => clearInterval(interval);
        } else {
            setElapsedTime({ days: 0, hours: 0, mins: 0 });
            setProjection("No data logged yet");
        }
    }, [history, status, habitTuhr]);

    // --- CYCLE GRAPH LOGIC ---
    const getCycleData = () => {
        const cycles = [];
        for (let i = 0; i < history.length - 1; i++) {
            if (history[i].status === 'Tuhr' && history[i+1].status === 'Hayd') {
                const duration = Math.ceil((history[i].timestamp - history[i+1].timestamp) / (1000 * 60 * 60 * 24));
                cycles.push({ date: history[i+1].date, days: duration });
            }
        }
        return cycles.slice(0, 6).reverse();
    };
    const cycleData = getCycleData();

    // --- LOGIC: ISTIHADAH & TUHR VALIDATION ---
    const isIstihadah = status === 'Hayd' && elapsedTime.days >= 10;
    const isBeyondHabit = status === 'Hayd' && elapsedTime.days >= habitHayd && elapsedTime.days < 10;
    const isTuhrTooShort = status === 'Tuhr' && history.length > 0 && elapsedTime.days < 15;

    // --- IBADAH STATUS ---
    const getIbadahStatus = () => {
        if (status === 'Tuhr') return { salah: 'Obligatory', fasting: 'Obligatory', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (isIstihadah) return { salah: 'Obligatory*', fasting: 'Obligatory', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { salah: 'Prohibited', fasting: 'Prohibited', color: 'text-rose-600', bg: 'bg-rose-50' };
    };
    const ibadah = getIbadahStatus();

    // --- LOGIC: STORAGE & STATE SYNC ---
    const updateAllStorage = (newHistory, newStatus, newDate) => {
        setStatus(newStatus);
        setHistory(newHistory);
        setLastUpdated(newDate);
        localStorage.setItem('barakah_cycle_status', newStatus);
        localStorage.setItem('barakah_cycle_history', JSON.stringify(newHistory));
        localStorage.setItem('barakah_cycle_last_date', newDate || "");
        setDeletingId(null);
    };

    const saveHabits = () => {
        const hHayd = parseInt(habitHayd);
        const hTuhr = parseInt(habitTuhr);
        localStorage.setItem('barakah_habit_hayd', hHayd);
        localStorage.setItem('barakah_habit_tuhr', hTuhr);
        setHabitHayd(hHayd);
        setHabitTuhr(hTuhr);
        setShowSettings(false);
    };

    const handleQadhaChange = (val) => {
        const newVal = Math.max(0, qadhaCount + val);
        setQadhaCount(newVal);
        localStorage.setItem('barakah_qadha_count', newVal);
    };

    const toggleRamadanMode = () => {
        const nextMode = !isRamadanMode;
        setIsRamadanMode(nextMode);
        localStorage.setItem('barakah_ramadan_mode', nextMode);
    };

    // --- LOGIC: TOGGLE STATUS ---
    const toggleStatus = () => {
        if (isTuhrTooShort) return;
        const newStatus = status === 'Tuhr' ? 'Hayd' : 'Tuhr';
        
        if (status === 'Hayd') { 
            setShowGhuslReminder(true); 
            if (isRamadanMode && !isIstihadah) {
                const daysToAdd = Math.min(elapsedTime.days + 1, 10);
                handleQadhaChange(daysToAdd);
            }
        }

        const now = new Date();
        const dateString = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const entry = {
            id: Date.now(),
            date: dateString,
            time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: newStatus,
            timestamp: now.getTime(),
            flow: status === 'Tuhr' ? selectedFlow : 'N/A',
            color: status === 'Tuhr' ? selectedColor : 'N/A'
        };
        const newHistory = [entry, ...history].slice(0, 20);
        updateAllStorage(newHistory, newStatus, dateString);
    };

    const confirmDelete = () => {
        const filteredHistory = history.filter(item => item.id !== deletingId);
        let restoredStatus = 'Tuhr';
        let restoredDate = null;
        if (filteredHistory.length > 0) {
            restoredStatus = filteredHistory[0].status;
            restoredDate = filteredHistory[0].date;
        }
        updateAllStorage(filteredHistory, restoredStatus, restoredDate);
    };

    const exportReport = () => {
        if (history.length === 0) return;
        let reportText = `🌸 Nisa Al-Huda Report\n\n--- LOGS ---\n`;
        history.forEach(log => { reportText += `• ${log.date}: ${log.status} (Flow: ${log.flow})\n`; });
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Report.txt`;
        link.click();
    };

    // --- CALENDAR RENDERER ---
    const renderCalendar = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        const days = [];
        
        dayNames.forEach(name => days.push(<div key={`h-${name}`} className="text-[10px] font-black text-rose-300 text-center pb-2">{name}</div>));
        for (let i = 0; i < firstDayOfMonth; i++) days.push(<div key={`blank-${i}`}></div>);
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === now.getDate();
            const logOnThisDay = history.find(h => {
                const logDate = new Date(h.timestamp);
                return logDate.getDate() === d && logDate.getMonth() === month && logDate.getFullYear() === year;
            });
            const dayStatus = logOnThisDay ? logOnThisDay.status : (isToday ? status : null);
            days.push(
                <div key={d} className={`h-10 w-full flex items-center justify-center rounded-xl text-[11px] font-black transition-all ${dayStatus === 'Hayd' ? 'bg-rose-500 text-white shadow-sm' : 'bg-white text-gray-400 border border-rose-50'} ${isToday ? 'ring-2 ring-rose-200 ring-offset-1' : ''}`}>
                    {d}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="p-6 animate-fade-in pb-32 relative min-h-screen bg-slate-50">
            {/* Header */}
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-black text-rose-500 uppercase tracking-tight italic">Cycle Tracker</h2>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => setViewMode('stats')} className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest transition-all ${viewMode === 'stats' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-rose-400 shadow-sm'}`}>Dashboard</button>
                        <button onClick={() => setViewMode('calendar')} className={`text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-rose-400 shadow-sm'}`}>Calendar</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={exportReport} className="bg-white p-3 rounded-2xl shadow-sm border border-rose-50 hover:bg-rose-50 transition-colors">📥</button>
                    <button onClick={() => setShowSettings(true)} className="bg-white p-3 rounded-2xl shadow-sm border border-rose-50 hover:bg-rose-50 transition-colors">⚙️</button>
                </div>
            </div>

            {viewMode === 'stats' ? (
                <>
                    {/* Status Card */}
                    <div className={`rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden mb-6 transition-all duration-500 ${isIstihadah ? 'bg-amber-500 shadow-amber-100' : status === 'Hayd' ? 'bg-rose-500 shadow-rose-100' : 'bg-emerald-500 shadow-emerald-100'}`}>
                        <div className="relative z-10 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Current State</p>
                            <h3 className="text-5xl font-black mt-1 mb-2 drop-shadow-md">{isIstihadah ? 'Purity*' : status}</h3>
                            <p className="text-xs font-bold opacity-90 mb-6 bg-black/10 w-fit mx-auto px-4 py-1 rounded-full">
                                {elapsedTime.days}d {elapsedTime.hours}h {elapsedTime.days === 0 && elapsedTime.hours === 0 ? `${elapsedTime.mins}m` : ''} elapsed
                            </p>
                            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-left min-h-[60px] flex items-center">
                                <p className="text-[11px] font-bold italic leading-tight">
                                    {status === 'Hayd' ? (isIstihadah ? "⚠️ ISTIHADAH: Prayer/Fasting required. Wudu for every Salah." : `🌸 Day ${elapsedTime.days + 1} of Hayd. Ibadah suspended.`) : "✨ State: Tuhr. All Ibadah is obligatory."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {status === 'Tuhr' && !isTuhrTooShort && (
                        <div className="bg-white p-6 rounded-[2.5rem] border border-rose-50 shadow-sm mb-6">
                            <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-4">Observation Log</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <select value={selectedFlow} onChange={(e) => setSelectedFlow(e.target.value)} className="bg-rose-50/50 rounded-xl text-[10px] font-bold p-3 text-rose-600 outline-none border-none">
                                    <option>Spotting</option><option>Light</option><option>Medium</option><option>Heavy</option>
                                </select>
                                <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="bg-rose-50/50 rounded-xl text-[10px] font-bold p-3 text-rose-600 outline-none border-none">
                                    <option>Red</option><option>Black</option><option>Brown</option><option>Yellow</option><option>Dusky</option>
                                </select>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={toggleStatus} 
                        disabled={isTuhrTooShort}
                        className={`mb-6 w-full font-black py-5 rounded-[2rem] shadow-lg active:scale-95 transition-all uppercase text-xs tracking-widest border-2 ${isTuhrTooShort ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed' : status === 'Hayd' ? 'bg-white text-rose-500 border-rose-100' : 'bg-rose-500 text-white border-rose-500'}`}
                    >
                        {isTuhrTooShort ? `Minimum Purity (15d) Active` : `Log ${status === 'Tuhr' ? 'Hayd' : 'Tuhr'} Start`}
                    </button>

                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className={`${ibadah.bg} p-4 rounded-3xl border border-white shadow-sm text-center`}>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Salah</p>
                            <p className={`text-xs font-black uppercase ${ibadah.color}`}>{ibadah.salah}</p>
                        </div>
                        <div className={`${ibadah.bg} p-4 rounded-3xl border border-white shadow-sm text-center`}>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Sawm</p>
                            <p className={`text-xs font-black uppercase ${ibadah.color}`}>{ibadah.fasting}</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-rose-50 shadow-sm mb-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Cycle Duration</h4>
                        <div className="flex items-end justify-between h-24 gap-2 px-2">
                            {cycleData.length > 0 ? cycleData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center flex-1">
                                    <div className={`w-full rounded-t-lg relative ${d.days > 10 ? 'bg-amber-400' : 'bg-rose-400'}`} style={{ height: `${Math.min(d.days * 10, 100)}%` }}>
                                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[8px] font-black text-gray-500">{d.days}d</span>
                                    </div>
                                    <p className="text-[6px] font-bold text-gray-300 uppercase mt-1 text-center truncate w-full">{d.date}</p>
                                </div>
                            )) : <p className="text-[10px] text-gray-300 font-bold uppercase w-full text-center pb-8">Awaiting logs...</p>}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] border border-rose-50 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">Qadha Fasts</h4>
                                <p className="text-2xl font-black text-gray-800">{qadhaCount} <span className="text-[10px] text-gray-400 uppercase tracking-widest">Days</span></p>
                            </div>
                            <button onClick={toggleRamadanMode} className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest ${isRamadanMode ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                {isRamadanMode ? '🌙 Ramadan ON' : 'Ramadan OFF'}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleQadhaChange(-1)} className="flex-1 bg-emerald-50 text-emerald-600 font-black py-3 rounded-2xl text-[9px] uppercase border border-emerald-100 active:scale-95 transition-all">Mark Done</button>
                            <button onClick={() => handleQadhaChange(1)} className="flex-1 bg-rose-50 text-rose-600 font-black py-3 rounded-2xl text-[9px] uppercase border border-rose-100 active:scale-95 transition-all">Add Manual</button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-rose-50 shadow-sm mb-8 flex items-center gap-3">
                        <span className="text-2xl">🔮</span>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Fiqh Projection</p>
                            <p className="text-xs font-bold text-gray-700">{projection}</p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white p-6 rounded-[2.5rem] border border-rose-50 shadow-xl mb-8 animate-fade-in min-h-[400px]">
                    <div className="grid grid-cols-7 gap-2">
                        {renderCalendar()}
                    </div>
                </div>
            )}

            {/* History List */}
            <div className="bg-white rounded-[2.5rem] p-6 border border-rose-50 shadow-sm">
                <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-6">Recent History</p>
                <div className="space-y-6 max-h-80 overflow-y-auto px-2 custom-scrollbar">
                    {history.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-rose-50 pb-4 last:border-0">
                            <div>
                                <p className="text-xs font-black text-gray-700">{item.date}</p>
                                <div className="flex gap-2 mt-1">
                                    {item.flow !== 'N/A' && <span className="text-[8px] font-bold bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">{item.flow}</span>}
                                    {item.color !== 'N/A' && <span className="text-[8px] font-bold bg-rose-50 text-rose-400 px-2 py-0.5 rounded-full uppercase tracking-tighter">{item.color}</span>}
                                </div>
                                <button onClick={() => setDeletingId(item.id)} className="text-[9px] font-black text-rose-300 uppercase mt-2 hover:text-rose-500 transition-colors">Remove</button>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-tighter border ${item.status === 'Hayd' ? 'bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {item.status}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {showSettings && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 border border-rose-100 relative">
                        <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 text-gray-400 font-bold">✕</button>
                        <h4 className="text-2xl font-black text-gray-800 mb-6 italic uppercase text-center">Fiqh Habit</h4>
                        <div className="space-y-4 mb-8">
                            <div><label className="text-[10px] font-black text-rose-500 uppercase mb-2 block">Hayd Days</label><input type="number" value={habitHayd} onChange={(e) => setHabitHayd(e.target.value)} className="w-full bg-rose-50 rounded-2xl p-4 font-black text-rose-600 outline-none" /></div>
                            <div><label className="text-[10px] font-black text-rose-500 uppercase mb-2 block">Tuhr Days</label><input type="number" value={habitTuhr} onChange={(e) => setHabitTuhr(e.target.value)} className="w-full bg-rose-50 rounded-2xl p-4 font-black text-rose-600 outline-none" /></div>
                        </div>
                        <button onClick={saveHabits} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl uppercase text-[10px] tracking-widest shadow-lg shadow-rose-200">Save Changes</button>
                    </div>
                </div>
            )}

            {deletingId && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-center">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl relative border border-gray-100">
                        <h4 className="text-xl font-black text-gray-800 mb-6 uppercase italic">Remove Entry?</h4>
                        <button onClick={confirmDelete} className="w-full bg-rose-500 text-white font-black py-4 rounded-2xl shadow-lg uppercase text-[10px] mb-3">Confirm</button>
                        <button onClick={() => setDeletingId(null)} className="w-full bg-gray-50 text-gray-400 font-black py-4 rounded-2xl uppercase text-[10px]">Cancel</button>
                    </div>
                </div>
            )}

            {showGhuslReminder && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6 text-center">
                    <div className="bg-white w-full max-w-sm rounded-[3rem] p-8 shadow-2xl border border-rose-100">
                        <div className="text-5xl mb-4">🚿</div>
                        <h4 className="text-2xl font-black text-gray-800 mb-6 italic uppercase tracking-tighter">Ghusl Required</h4>
                        <button onClick={() => setShowGhuslReminder(false)} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg uppercase text-[10px] tracking-widest">Completed</button>
                    </div>
                </div>
            )}
        </div>
    );
}