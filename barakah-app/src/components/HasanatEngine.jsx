import { useState, useEffect, useCallback } from 'react';

export default function HasanatEngine() {
    const [points, setPoints] = useState(0);
    const [streak, setStreak] = useState(0);

    // Optimized calculation function to sync with DeedTracker and CycleTracker
    const calculatePoints = useCallback(() => {
        // 1. Get points from manual deeds (DeedTracker)
        const deedPoints = parseInt(localStorage.getItem('barakah_points')) || 0;
        
        // 2. Get points from Extra Sunnah tasks
        const extraPoints = parseInt(localStorage.getItem('barakah_hasanat_extra')) || 0;
        
        // 3. Get points from Cycle History (10 pts per log)
        const history = JSON.parse(localStorage.getItem('barakah_cycle_history')) || [];
        const logPoints = history.length * 10;
        
        // 4. Get points from Qadha completions (50 pts per fast/prayer)
        const qadhaCompleted = parseInt(localStorage.getItem('barakah_qadha_completed')) || 0;
        const qadhaPoints = qadhaCompleted * 50;

        // Total sum mirroring the Quranly "Global Points" logic
        const total = deedPoints + extraPoints + logPoints + qadhaPoints;
        
        // Streak Logic: Check if last activity was today
        let currentStreak = parseInt(localStorage.getItem('barakah_streak_count')) || 0;
        const lastDate = localStorage.getItem('barakah_last_active_date');
        const today = new Date().toLocaleDateString();

        if (lastDate === today) {
            // Streak maintained
        } else {
            // Check if it was yesterday to increment, or reset if longer
            // For now, we keep it simple to ensure the UI shows the '0' or '1' correctly
        }

        setPoints(total);
        setStreak(currentStreak);
    }, []);

    // Effect to handle initial load and real-time storage updates
    useEffect(() => {
        calculatePoints();

        // Listen for the custom 'storage' event dispatched from App.jsx
        const handleSync = () => {
            calculatePoints();
        };

        window.addEventListener('storage', handleSync);
        // Also listen for local changes in the same window
        window.addEventListener('hashchange', handleSync); 
        
        const interval = setInterval(calculatePoints, 2000); // Polling backup every 2s

        return () => {
            window.removeEventListener('storage', handleSync);
            window.removeEventListener('hashchange', handleSync);
            clearInterval(interval);
        };
    }, [calculatePoints]);

    return (
        <div className="w-full bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] p-6 shadow-lg shadow-orange-100 mb-6 flex items-center justify-between text-white overflow-hidden relative border border-white/20 transition-all duration-500">
            {/* Background decorative elements to match Quranly aesthetics */}
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute left-1/2 top-0 w-20 h-20 bg-orange-300/20 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Spiritual Momentum</p>
                <div className="flex items-baseline gap-1">
                    {/* The points now bounce/animate when updated */}
                    <h4 key={points} className="text-4xl font-black italic tracking-tighter animate-in fade-in zoom-in duration-300">
                        {points}
                    </h4>
                    <span className="text-[11px] font-black uppercase tracking-widest">Hasanat</span>
                </div>
            </div>
            
            {/* Streak display mirroring the provided UI screenshot */}
            <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-[1.5rem] text-center relative z-10 border border-white/10">
                <p className="text-[9px] font-black uppercase tracking-tighter opacity-90">Streak</p>
                <p className="text-sm font-black italic">{streak} Days 🔥</p>
            </div>
        </div>
    );
}