import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminDashboard({ onClose, onChallengeUpdate }) {
    // --- EXISTING STATES ---
    const [stats, setStats] = useState({ totalUsers: 0, totalPoints: 0, activeToday: 0 });
    const [users, setUsers] = useState([]);
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [points, setPoints] = useState(100);
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('overview'); // overview, users, challenges, broadcast
    
    // --- NEW BROADCAST STATE ---
    const [broadcast, setBroadcast] = useState('');
    const [activeBroadcasts, setActiveBroadcasts] = useState([]);

    useEffect(() => {
        fetchStats();
        fetchUsers();
        fetchCurrentBroadcasts();
    }, []);

    const fetchStats = async () => {
        try {
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { data: pointsData } = await supabase.from('profiles').select('points');
            const totalPts = pointsData?.reduce((acc, curr) => acc + (curr.points || 0), 0);
            
            setStats({
                totalUsers: userCount || 0,
                totalPoints: totalPts || 0,
                activeToday: Math.floor((userCount || 0) * 0.6) // Mock activity logic
            });
        } catch (e) { console.error(e); }
    };

    const fetchUsers = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .order('points', { ascending: false });
        if (data) setUsers(data);
    };

    const fetchCurrentBroadcasts = async () => {
        const { data } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (data) setActiveBroadcasts(data);
    };

    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        if (!title || !desc) return;
        setLoading(true);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { error } = await supabase
            .from('challenges')
            .insert([{ 
                title, 
                description: desc, 
                points: parseInt(points), 
                expires_at: expiresAt.toISOString() 
            }]);

        if (error) alert(error.message);
        else {
            alert("Global Challenge Launched!");
            setTitle(''); setDesc('');
            onChallengeUpdate();
        }
        setLoading(false);
    };

    const handleSendBroadcast = async () => {
        if (!broadcast) return;
        setLoading(true);
        
        // Disable previous active broadcasts to keep feed clean
        await supabase.from('broadcasts').update({ is_active: false }).eq('is_active', true);
        
        const { error } = await supabase
            .from('broadcasts')
            .insert([{ message: broadcast, is_active: true }]);

        if (error) alert(error.message);
        else {
            alert("Broadcast is now LIVE for all users!");
            setBroadcast('');
            fetchCurrentBroadcasts();
            onChallengeUpdate(); 
        }
        setLoading(false);
    };

    const deleteBroadcast = async (id) => {
        await supabase.from('broadcasts').update({ is_active: false }).eq('id', id);
        fetchCurrentBroadcasts();
        onChallengeUpdate();
    };

    const updateUserPoints = async (userId, newPoints) => {
        const { error } = await supabase
            .from('profiles')
            .update({ points: newPoints })
            .eq('id', userId);
        if (!error) fetchUsers();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white p-8 rounded-b-[3rem] shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-rose-400">System Administrator</p>
                        <h1 className="text-3xl font-black tracking-tighter">COMMAND CENTER</h1>
                    </div>
                    <button 
                        onClick={onClose}
                        className="bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md transition-all active:scale-90"
                    >
                        <span className="text-xs font-black uppercase tracking-widest">Exit</span>
                    </button>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-bold uppercase opacity-50 mb-1">Total Souls</p>
                        <p className="text-xl font-black">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-bold uppercase opacity-50 mb-1">Total Hasanat</p>
                        <p className="text-xl font-black">{(stats.totalPoints / 1000).toFixed(1)}k</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-bold uppercase opacity-50 mb-1">Active</p>
                        <p className="text-xl font-black">{stats.activeToday}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-6 gap-2 -mt-4 overflow-x-auto no-scrollbar">
                {['overview', 'users', 'challenges', 'broadcast'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all whitespace-nowrap ${
                            tab === t ? 'bg-rose-500 text-white scale-105 z-10' : 'bg-white text-slate-400'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            <div className="p-6 space-y-6">
                {/* 1. OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 mb-6">
                            <h3 className="font-black text-slate-800 mb-4">System Health</h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="text-xs font-bold text-slate-500">Database Sync</span>
                                    <span className="text-[10px] font-black text-green-500 uppercase">Operational</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="text-xs font-bold text-slate-500">Auth Service</span>
                                    <span className="text-[10px] font-black text-green-500 uppercase">Operational</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Admin Tip</p>
                            <p className="text-lg font-bold leading-tight">Use the Broadcast feature for urgent maintenance or community-wide reminders.</p>
                        </div>
                    </div>
                )}

                {/* 2. USER MANAGEMENT TAB */}
                {tab === 'users' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <h3 className="px-2 font-black text-slate-800">Community Directory</h3>
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="font-black text-slate-900">{u.username || 'Anonymous'}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.city || 'Unknown City'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-xs font-black text-rose-500">{u.points || 0} HP</p>
                                        <p className="text-[8px] font-bold text-slate-300 uppercase">{u.role || 'User'}</p>
                                    </div>
                                    <button 
                                        onClick={() => updateUserPoints(u.id, (u.points || 0) + 100)}
                                        className="bg-slate-100 p-3 rounded-xl hover:bg-rose-50 transition-colors"
                                    >
                                        🎁
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. CHALLENGES TAB */}
                {tab === 'challenges' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4">
                        <form onSubmit={handleCreateChallenge} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">🚀</span>
                                <h3 className="font-black text-slate-900">Deploy Global Challenge</h3>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Challenge Title</label>
                                    <input 
                                        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Read Surah Kahf"
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-bold text-sm"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Instructions</label>
                                    <textarea 
                                        value={desc} onChange={(e) => setDesc(e.target.value)}
                                        placeholder="Explain what the sisters need to do..."
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-bold text-sm h-32"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Reward Points</label>
                                    <input 
                                        type="number" value={points} onChange={(e) => setPoints(e.target.value)}
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-bold text-sm"
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-200 active:scale-95 transition-all mt-4 disabled:opacity-50"
                                >
                                    {loading ? "INITIALIZING..." : "LAUNCH TO ALL USERS"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 4. BROADCAST TAB (NEW FEATURE) */}
                {tab === 'broadcast' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">📢</span>
                                <h3 className="font-black text-slate-900">Send Global Message</h3>
                            </div>
                            
                            <textarea 
                                value={broadcast}
                                onChange={(e) => setBroadcast(e.target.value)}
                                placeholder="This message will scroll at the top of every user's screen..."
                                className="w-full p-6 bg-indigo-50/50 rounded-[2rem] border-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm h-32 mb-4"
                            />
                            
                            <button 
                                onClick={handleSendBroadcast}
                                disabled={loading || !broadcast}
                                className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {loading ? "TRANSMITTING..." : "PUSH LIVE ANNOUNCEMENT"}
                            </button>
                        </div>

                        {/* Current Active Broadcasts */}
                        <div className="space-y-3">
                            <h4 className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Live Transmissions</h4>
                            {activeBroadcasts.length === 0 && (
                                <p className="text-center py-10 text-slate-300 font-bold italic text-sm">No active broadcasts</p>
                            )}
                            {activeBroadcasts.map(b => (
                                <div key={b.id} className="bg-slate-900 text-white p-6 rounded-[2rem] flex justify-between items-center group">
                                    <div className="flex-1 pr-4">
                                        <p className="text-xs font-medium leading-relaxed italic">"{b.message}"</p>
                                        <p className="text-[8px] font-black uppercase text-indigo-400 mt-2 tracking-widest">Status: Scrolling Live</p>
                                    </div>
                                    <button 
                                        onClick={() => deleteBroadcast(b.id)}
                                        className="bg-white/10 hover:bg-rose-500 p-3 rounded-xl transition-all"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Branding */}
            <div className="text-center py-10 opacity-20">
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Nisa Al-Huda Admin Core</p>
            </div>
        </div>
    );
}