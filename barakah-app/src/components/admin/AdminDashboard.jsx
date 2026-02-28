import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminDashboard({ onClose, onChallengeUpdate }) {
    // --- AUTH & CORE SYSTEM STATES ---
    const [stats, setStats] = useState({ 
        totalUsers: 0, 
        totalPoints: 0, 
        activeToday: 0, 
        premiumUsers: 0, 
        pendingSubs: 0,
        totalLogins: 0,
        averagePoints: 0
    });
    const [users, setUsers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]); 
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('overview'); 
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTier, setFilterTier] = useState('all');
    
    // --- CHALLENGE ENGINE STATES ---
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [points, setPoints] = useState(100);
    const [validityHours, setValidityHours] = useState(24); 
    const [challengeCategory, setChallengeCategory] = useState('spiritual');
    const [isGlobal, setIsGlobal] = useState(true);

    // --- BROADCAST & NOTIFICATION STATES ---
    const [broadcast, setBroadcast] = useState('');
    const [broadcastType, setBroadcastType] = useState('info');
    const [activeBroadcasts, setActiveBroadcasts] = useState([]);
    const [challengeHistory, setChallengeHistory] = useState([]); 
    const [systemLogs, setSystemLogs] = useState([]);

    // --- NEW TRIAL & GLOBAL CONFIG STATES ---
    const [trialDays, setTrialDays] = useState(7);
    const [lockAfterTrial, setLockAfterTrial] = useState(true); 
    const [settingsLoading, setSettingsLoading] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);

    useEffect(() => {
        fetchAllAdminData();
        const interval = setInterval(fetchStats, 30000); // Live update stats every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchAllAdminData = async () => {
        setLoading(true);
        await Promise.all([
            fetchStats(),
            fetchUsers(),
            fetchCurrentBroadcasts(),
            fetchChallengeHistory(),
            fetchPendingRequests(),
            fetchGlobalSettings(),
            fetchSystemLogs()
        ]);
        setLoading(false);
    };

    const fetchStats = async () => {
        try {
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { data: profileData } = await supabase.from('profiles').select('points, subscription_tier, last_login');
            const { count: pendingCount } = await supabase.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            
            const totalPts = profileData?.reduce((acc, curr) => acc + (curr.points || 0), 0) || 0;
            const premiumCount = profileData?.filter(u => u.subscription_tier !== 'free').length || 0;
            const avgPoints = userCount > 0 ? (totalPts / userCount).toFixed(0) : 0;
            
            // Calculate active today (last 24h)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const activeToday = profileData?.filter(u => u.last_login > twentyFourHoursAgo).length || 0;

            setStats({
                totalUsers: userCount || 0,
                totalPoints: totalPts,
                activeToday: activeToday,
                premiumUsers: premiumCount,
                pendingSubs: pendingCount || 0,
                averagePoints: avgPoints
            });
        } catch (e) { console.error("Admin Stats Sync Error:", e); }
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('points', { ascending: false });
        if (data) setUsers(data);
    };

    const fetchPendingRequests = async () => {
        const { data } = await supabase
            .from('payment_requests')
            .select('*, profiles(username, email)')
            .eq('status', 'pending')
            .order('created_at', { ascending: false });
        if (data) setPendingRequests(data);
    };

    const fetchCurrentBroadcasts = async () => {
        const { data } = await supabase
            .from('broadcasts')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });
        if (data) setActiveBroadcasts(data);
    };

    const fetchChallengeHistory = async () => {
        const { data } = await supabase
            .from('challenges')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);
        if (data) setChallengeHistory(data);
    };

    const fetchGlobalSettings = async () => {
        const { data } = await supabase
            .from('global_settings')
            .select('*')
            .eq('id', 'config')
            .single();
        if (data) {
            setTrialDays(data.trial_period_days || 7);
            setLockAfterTrial(data.features_locked_after_trial ?? true);
            setMaintenanceMode(data.maintenance_mode || false);
        }
    };

    const fetchSystemLogs = async () => {
        // Placeholder for logging system if you have one
        setSystemLogs([
            { id: 1, event: 'New User Signup', time: '2 mins ago', user: 'Fatima_99' },
            { id: 2, event: 'Points Reset', time: '15 mins ago', user: 'Admin' },
            { id: 3, event: 'System Config Updated', time: '1 hour ago', user: 'Admin' }
        ]);
    };

    const handleUpdateSettings = async () => {
        setSettingsLoading(true);
        const { error } = await supabase
            .from('global_settings')
            .update({ 
                trial_period_days: trialDays,
                features_locked_after_trial: lockAfterTrial,
                maintenance_mode: maintenanceMode
            })
            .eq('id', 'config');
        
        if (error) {
            alert("Database write failed: " + error.message);
        } else {
            alert("System Protocols Updated Successfully! Real-time Sync Initiated. ✅");
            fetchGlobalSettings();
        }
        setSettingsLoading(false);
    };

    const resetUserTrial = async (userId, username) => {
        const confirmReset = window.confirm(`DANGER: You are resetting the trial for ${username}. This restarts their countdown from Day 1. Proceed?`);
        if (!confirmReset) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ created_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            alert("Reset failed: " + error.message);
        } else {
            alert(`Trial timer reset for ${username}. Access restored. ⏳`);
            fetchUsers();
        }
        setLoading(false);
    };

    const handleCreateChallenge = async (e) => {
        e.preventDefault();
        if (!title || !desc) return;
        setLoading(true);
        
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + parseInt(validityHours));

        const { error } = await supabase
            .from('challenges')
            .insert([{ 
                title, 
                description: desc, 
                points: parseInt(points), 
                category: challengeCategory,
                expires_at: expiresAt.toISOString() 
            }]);

        if (error) {
            alert("Deployment failed: " + error.message);
        } else {
            alert("GLOBAL MISSION DEPLOYED! 🚀");
            setTitle(''); setDesc('');
            fetchChallengeHistory();
            onChallengeUpdate();
        }
        setLoading(false);
    };

    const handleSendBroadcast = async () => {
        if (!broadcast) return;
        setLoading(true);
        // Deactivate old broadcasts
        await supabase.from('broadcasts').update({ is_active: false }).eq('is_active', true);
        
        const { error } = await supabase
            .from('broadcasts')
            .insert([{ 
                message: broadcast, 
                type: broadcastType,
                is_active: true 
            }]);

        if (error) alert(error.message);
        else {
            alert("BROADCAST IS LIVE. All sisters notified. 📢");
            setBroadcast('');
            fetchCurrentBroadcasts();
            onChallengeUpdate(); 
        }
        setLoading(false);
    };

    const approveSubscription = async (requestId, userId, tier) => {
        setLoading(true);
        const { error: profileError } = await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
        const { error: requestError } = await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', requestId);

        if (!profileError && !requestError) {
            alert(`SISTER UPGRADED TO ${tier.toUpperCase()}. 💎 Account synchronized.`);
            fetchPendingRequests();
            fetchStats();
            fetchUsers();
        } else {
            alert("Verification synchronization error.");
        }
        setLoading(false);
    };

    const getRemainingDays = (createdAt) => {
        const created = new Date(createdAt);
        const today = new Date();
        const diff = Math.floor((today - created) / (1000 * 60 * 60 * 24));
        const remaining = trialDays - diff;
        return remaining > 0 ? remaining : 0;
    };

    const filteredUsers = users.filter(u => 
        (u.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
         u.email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterTier === 'all' || u.subscription_tier === filterTier)
    );

    return (
        <div className="fixed inset-0 z-[9999] bg-[#f8fafc] overflow-y-auto pb-48 font-['Montserrat'] animate-in fade-in duration-500">
            {/* Header: Command Center Core */}
            <div className="bg-slate-900 text-white p-12 rounded-b-[5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-rose-500/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px]"></div>
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-16">
                        <div>
                            <p className="text-[12px] font-black uppercase tracking-[0.6em] text-rose-500 mb-3 animate-pulse">System Root Authority</p>
                            <h1 className="text-6xl font-black tracking-tighter text-white">COMMAND CENTER</h1>
                        </div>
                        <button 
                            onClick={onClose}
                            className="bg-white/10 hover:bg-rose-500 p-8 rounded-[3rem] backdrop-blur-3xl border border-white/10 transition-all active:scale-95 group shadow-2xl"
                        >
                            <span className="text-xs font-black uppercase tracking-widest px-6 group-hover:text-white">Exit Authority</span>
                        </button>
                    </div>

                    {/* Stats Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
                        <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-md hover:bg-white/10 transition-all group">
                            <p className="text-[11px] font-black uppercase opacity-40 mb-3 tracking-widest text-white group-hover:opacity-100 transition-opacity">Total Population</p>
                            <p className="text-5xl font-black text-white">{stats.totalUsers}</p>
                        </div>
                        <div className="bg-emerald-500/10 p-10 rounded-[3.5rem] border border-emerald-500/20 backdrop-blur-md">
                            <p className="text-[11px] font-black uppercase text-emerald-400 mb-3 tracking-widest">Pro Members</p>
                            <p className="text-5xl font-black text-emerald-400">{stats.premiumUsers}</p>
                        </div>
                        <div className="bg-rose-500/10 p-10 rounded-[3.5rem] border border-rose-500/20 backdrop-blur-md">
                            <p className="text-[11px] font-black uppercase text-rose-300 mb-3 tracking-widest">Pending Verification</p>
                            <p className="text-5xl font-black text-white">{stats.pendingSubs}</p>
                        </div>
                        <div className="bg-indigo-500/10 p-10 rounded-[3.5rem] border border-indigo-500/20 backdrop-blur-md">
                            <p className="text-[11px] font-black uppercase text-indigo-300 mb-3 tracking-widest">Avg Hasanat</p>
                            <p className="text-5xl font-black text-white">{stats.averagePoints}</p>
                        </div>
                        <div className="bg-white/5 p-10 rounded-[3.5rem] border border-white/10 backdrop-blur-md">
                            <p className="text-[11px] font-black uppercase opacity-40 mb-3 tracking-widest text-white">Active Today</p>
                            <p className="text-5xl font-black text-white">{stats.activeToday}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation System */}
            <div className="flex px-12 gap-5 -mt-12 overflow-x-auto no-scrollbar relative z-30">
                {['overview', 'users', 'challenges', 'broadcast', 'subs', 'settings'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-12 py-8 rounded-[3.5rem] text-[13px] font-black uppercase tracking-[0.25em] shadow-2xl transition-all whitespace-nowrap ${
                            tab === t ? 'bg-rose-500 text-white scale-110 z-40 shadow-rose-200' : 'bg-white text-slate-400 hover:bg-slate-50'
                        }`}
                    >
                        {t === 'subs' ? `💎 Verify Requests (${stats.pendingSubs})` : t}
                    </button>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="p-12 space-y-12 max-w-6xl mx-auto">
                
                {/* OVERVIEW TAB */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
                        <div className="bg-white p-12 rounded-[5rem] shadow-sm border border-slate-100">
                            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter">Live Broadcast</h3>
                            <div className="space-y-6">
                                {activeBroadcasts.length > 0 ? activeBroadcasts.map(b => (
                                    <div key={b.id} className="bg-indigo-50 p-8 rounded-[3rem] border border-indigo-100 flex justify-between items-center">
                                        <p className="font-bold text-indigo-900 text-lg">"{b.message}"</p>
                                        <button onClick={() => deleteBroadcast(b.id)} className="text-rose-500 font-black text-xs uppercase tracking-widest">Revoke</button>
                                    </div>
                                )) : <p className="text-slate-400 font-bold italic p-8 text-center">No active broadcasts for sisters...</p>}
                            </div>
                        </div>

                        <div className="bg-white p-12 rounded-[5rem] shadow-sm border border-slate-100">
                            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter">Recent System Activity</h3>
                            <div className="space-y-6">
                                {systemLogs.map(log => (
                                    <div key={log.id} className="flex items-center gap-6 p-6 hover:bg-slate-50 rounded-[2.5rem] transition-all">
                                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl">⚡</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">{log.event}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.user} • {log.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS: TRIAL & LOCK CONTROL */}
                {tab === 'settings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-12 duration-700">
                        <div className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-16 text-9xl opacity-[0.03] grayscale">⚙️</div>
                            <div className="flex items-center gap-6 mb-16">
                                <div className="w-20 h-20 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-3xl shadow-2xl">⚙️</div>
                                <div>
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">Protocol Configuration</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Global Access Management</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <label className="text-[13px] font-black uppercase tracking-[0.5em] text-slate-400 ml-10 block">Trial Window (Days)</label>
                                        <input 
                                            type="number" 
                                            value={trialDays} 
                                            onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                                            className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-none focus:ring-8 focus:ring-rose-500/5 font-black text-indigo-600 text-4xl transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="p-8 bg-indigo-50 rounded-[3rem] border border-indigo-100">
                                        <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">"Changing this will immediately update the 'Days Remaining' counter for all free-tier sisters."</p>
                                    </div>
                                </div>

                                <div className="space-y-10">
                                    <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 flex items-center justify-between group hover:border-rose-200 transition-all">
                                        <div className="px-6">
                                            <p className="text-lg font-black text-slate-800 uppercase tracking-tight">Hard Lock UI</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Block access after trial</p>
                                        </div>
                                        <button 
                                            onClick={() => setLockAfterTrial(!lockAfterTrial)}
                                            className={`w-24 h-12 rounded-full transition-all duration-500 relative shadow-inner ${lockAfterTrial ? 'bg-rose-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-2 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-500 ${lockAfterTrial ? 'translate-x-14' : 'translate-x-2'}`} />
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 p-10 rounded-[3.5rem] border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-all">
                                        <div className="px-6">
                                            <p className="text-lg font-black text-slate-800 uppercase tracking-tight">Maintenance Mode</p>
                                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Suspend all app activity</p>
                                        </div>
                                        <button 
                                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                                            className={`w-24 h-12 rounded-full transition-all duration-500 relative shadow-inner ${maintenanceMode ? 'bg-amber-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-2 w-8 h-8 bg-white rounded-full shadow-lg transition-all duration-500 ${maintenanceMode ? 'translate-x-14' : 'translate-x-2'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleUpdateSettings}
                                disabled={settingsLoading}
                                className="w-full mt-16 py-10 bg-slate-900 text-white rounded-[3.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {settingsLoading ? "COMMITTING TO DATABASE..." : "SYNC GLOBAL PROTOCOLS"}
                            </button>
                        </div>
                    </div>
                )}

                {/* USERS TAB: DIRECTORY & INDIVIDUAL OVERRIDE */}
                {tab === 'users' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-10">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 px-8">
                            <h3 className="font-black text-slate-800 uppercase tracking-[0.4em] text-sm">Sister Database</h3>
                            <div className="flex gap-4 w-full md:w-auto">
                                <input 
                                    type="text" 
                                    placeholder="Search username or email..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-white px-8 py-5 rounded-[2rem] border border-slate-100 shadow-sm w-full md:w-80 font-bold text-sm focus:ring-4 focus:ring-rose-500/5 outline-none"
                                />
                                <select 
                                    value={filterTier}
                                    onChange={(e) => setFilterTier(e.target.value)}
                                    className="bg-white px-8 py-5 rounded-[2rem] border border-slate-100 shadow-sm font-black text-[10px] uppercase tracking-widest outline-none"
                                >
                                    <option value="all">All Tiers</option>
                                    <option value="free">Free</option>
                                    <option value="pro">Pro</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {filteredUsers.map(u => {
                                const remaining = getRemainingDays(u.created_at);
                                return (
                                    <div key={u.id} className="bg-white p-10 rounded-[4.5rem] shadow-sm border border-slate-50 flex justify-between items-center transition-all hover:shadow-2xl hover:border-rose-100 group">
                                        <div className="flex items-center gap-8">
                                            <div className="w-20 h-20 bg-slate-100 rounded-[2rem] flex items-center justify-center text-3xl font-black text-slate-400 group-hover:bg-rose-500 group-hover:text-white transition-all shadow-inner">
                                                {u.username?.charAt(0).toUpperCase() || 'S'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-2xl tracking-tighter">{u.username || 'Sister'}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-3">{u.email}</p>
                                                <div className="flex gap-4 items-center">
                                                    <span className={`text-[10px] font-black uppercase px-5 py-2 rounded-full ${u.subscription_tier === 'pro' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {u.subscription_tier || 'free'}
                                                    </span>
                                                    {u.subscription_tier === 'free' && (
                                                        <span className={`text-[11px] font-black uppercase tracking-[0.2em] ${remaining <= 1 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`}>
                                                            {remaining} Days Left
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button 
                                                onClick={() => resetUserTrial(u.id, u.username)}
                                                className="bg-indigo-50 p-5 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm"
                                                title="Reset Trial to Day 0"
                                            >
                                                <span className="text-2xl">⏳</span>
                                            </button>
                                            <button 
                                                onClick={() => updateUserPoints(u.id, (u.points || 0) + 500)}
                                                className="bg-slate-50 p-5 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-90 shadow-sm"
                                            >
                                                <span className="text-2xl">🎁</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* CHALLENGE TAB: MISSION DEPLOYMENT */}
                {tab === 'challenges' && (
                    <div className="animate-in fade-in slide-in-from-bottom-12 space-y-16">
                        <form onSubmit={handleCreateChallenge} className="bg-white p-16 rounded-[6rem] shadow-sm border border-slate-100 relative">
                             <div className="flex items-center gap-6 mb-16">
                                <div className="w-20 h-20 bg-rose-500 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl shadow-rose-200 animate-bounce">🚀</div>
                                <div>
                                    <h3 className="font-black text-3xl text-slate-900 tracking-tighter">Deploy Spiritual Mission</h3>
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Global Event Injection</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 ml-10 block">Mission Title</label>
                                    <input 
                                        type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Tahajjud Prayer Challenge"
                                        className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-none font-bold text-xl focus:ring-8 focus:ring-rose-500/5 transition-all shadow-inner"
                                    />
                                </div>
                                
                                <div className="space-y-4">
                                    <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 ml-10 block">Mission Intel (Detailed Description)</label>
                                    <textarea 
                                        value={desc} onChange={(e) => setDesc(e.target.value)}
                                        placeholder="Explain the requirements and spiritual benefits..."
                                        className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-none font-bold text-xl h-60 focus:ring-8 focus:ring-rose-500/5 transition-all shadow-inner"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 ml-10 block">Reward (Hasanat Points)</label>
                                        <input 
                                            type="number" value={points} onChange={(e) => setPoints(e.target.value)}
                                            className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-none font-black text-indigo-600 text-2xl shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-400 ml-10 block">Deployment Window (Hours)</label>
                                        <input 
                                            type="number" value={validityHours} onChange={(e) => setValidityHours(e.target.value)}
                                            className="w-full p-10 bg-slate-50 rounded-[3.5rem] border-none font-black text-slate-700 text-2xl shadow-inner"
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-10 bg-slate-900 text-white rounded-[3.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-2xl mt-10 active:scale-95 transition-all hover:bg-slate-800">
                                    INITIALIZE GLOBAL MISSION BROADCAST
                                </button>
                            </div>
                        </form>

                        {/* History section */}
                        <div className="bg-white p-12 rounded-[5rem] shadow-sm border border-slate-100">
                            <h3 className="text-2xl font-black text-slate-900 mb-10 tracking-tighter">Mission History (Last 20)</h3>
                            <div className="space-y-4">
                                {challengeHistory.map(c => (
                                    <div key={c.id} className="flex justify-between items-center p-8 bg-slate-50 rounded-[3rem] border border-slate-100 hover:bg-slate-100 transition-all">
                                        <div>
                                            <p className="font-black text-slate-800 text-lg tracking-tight">{c.title}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(c.created_at).toLocaleDateString()} • {c.points} Pts</p>
                                        </div>
                                        <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase ${new Date(c.expires_at) > new Date() ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                                            {new Date(c.expires_at) > new Date() ? 'Active' : 'Expired'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Footer */}
            <div className="text-center py-40 opacity-20">
                <p className="text-[12px] font-black uppercase tracking-[1.2em] text-slate-900">Barakah Intelligence Systems • v2.8.5</p>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] mt-4">Nisa Al-Huda Academy Internal Control</p>
            </div>
        </div>
    );
}