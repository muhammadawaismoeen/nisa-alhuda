import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

export default function AdminDashboard({ onClose, onChallengeUpdate }) {
    // --- EXISTING STATES ---
    const [stats, setStats] = useState({ totalUsers: 0, totalPoints: 0, activeToday: 0, premiumUsers: 0, pendingSubs: 0 });
    const [users, setUsers] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]); 
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [points, setPoints] = useState(100);
    const [validityHours, setValidityHours] = useState(24); 
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState('overview'); 
    
    // --- BROADCAST & HISTORY STATES ---
    const [broadcast, setBroadcast] = useState('');
    const [activeBroadcasts, setActiveBroadcasts] = useState([]);
    const [challengeHistory, setChallengeHistory] = useState([]); 

    // --- SUBSCRIPTION & GLOBAL SETTINGS STATE ---
    const [trialDays, setTrialDays] = useState(7);
    const [lockAfterTrial, setLockAfterTrial] = useState(true); 
    const [settingsLoading, setSettingsLoading] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchUsers();
        fetchCurrentBroadcasts();
        fetchChallengeHistory();
        fetchPendingRequests(); 
        fetchGlobalSettings(); 
    }, []);

    const fetchStats = async () => {
        try {
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { data: pointsData } = await supabase.from('profiles').select('points, subscription_tier');
            const { count: pendingCount } = await supabase.from('payment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            
            const totalPts = pointsData?.reduce((acc, curr) => acc + (curr.points || 0), 0);
            const premiumCount = pointsData?.filter(u => u.subscription_tier !== 'free').length;
            
            setStats({
                totalUsers: userCount || 0,
                totalPoints: totalPts || 0,
                activeToday: Math.floor((userCount || 0) * 0.6),
                premiumUsers: premiumCount || 0,
                pendingSubs: pendingCount || 0
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

    const fetchPendingRequests = async () => {
        const { data } = await supabase
            .from('payment_requests')
            .select('*, profiles(username)')
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
            .limit(10);
        if (data) setChallengeHistory(data);
    };

    const fetchGlobalSettings = async () => {
        const { data } = await supabase
            .from('global_settings')
            .select('*')
            .eq('id', 'config')
            .single();
        if (data) {
            setTrialDays(data.trial_period_days);
            setLockAfterTrial(data.features_locked_after_trial);
        }
    };

    const handleUpdateSettings = async () => {
        setSettingsLoading(true);
        const { error } = await supabase
            .from('global_settings')
            .update({ 
                trial_period_days: trialDays,
                features_locked_after_trial: lockAfterTrial 
            })
            .eq('id', 'config');
        
        if (error) alert(error.message);
        else alert("System Configuration Updated Successfully! ✅");
        setSettingsLoading(false);
    };

    // --- NEW: TRIAL RESET LOGIC ---
    const resetUserTrial = async (userId, username) => {
        const confirmReset = window.confirm(`Reset trial for ${username}? This will restart their ${trialDays}-day countdown from today.`);
        if (!confirmReset) return;

        setLoading(true);
        const { error } = await supabase
            .from('profiles')
            .update({ created_at: new Date().toISOString() })
            .eq('id', userId);

        if (error) {
            alert("Error resetting trial: " + error.message);
        } else {
            alert(`Trial reset successfully for ${username}! ⏳`);
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
                expires_at: expiresAt.toISOString() 
            }]);

        if (error) alert(error.message);
        else {
            alert("Global Challenge Launched!");
            setTitle(''); setDesc('');
            fetchChallengeHistory();
            onChallengeUpdate();
        }
        setLoading(false);
    };

    const handleSendBroadcast = async () => {
        if (!broadcast) return;
        setLoading(true);
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

    const approveSubscription = async (requestId, userId, tier) => {
        setLoading(true);
        const { error: profileError } = await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', userId);
        const { error: requestError } = await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', requestId);

        if (!profileError && !requestError) {
            alert(`Sister successfully upgraded to ${tier.toUpperCase()}! 💎`);
            fetchPendingRequests();
            fetchStats();
            fetchUsers();
        } else {
            alert("Verification failed. Check Database.");
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
                        <p className="text-[8px] font-bold uppercase opacity-50 mb-1">Premium Souls</p>
                        <p className="text-xl font-black text-emerald-400">{stats.premiumUsers}</p>
                    </div>
                    <div className="bg-rose-500/20 p-4 rounded-2xl border border-rose-500/30">
                        <p className="text-[8px] font-bold uppercase text-rose-300 mb-1">Pending Subs</p>
                        <p className="text-xl font-black text-white">{stats.pendingSubs}</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                        <p className="text-[8px] font-bold uppercase opacity-50 mb-1">Active Now</p>
                        <p className="text-xl font-black">{stats.activeToday}</p>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex px-6 gap-2 -mt-4 overflow-x-auto no-scrollbar">
                {['overview', 'users', 'challenges', 'broadcast', 'subs', 'settings'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg transition-all whitespace-nowrap ${
                            tab === t ? 'bg-rose-500 text-white scale-105 z-10' : 'bg-white text-slate-400'
                        }`}
                    >
                        {t === 'subs' ? `💎 Verification (${stats.pendingSubs})` : t === 'settings' ? '⚙️ Settings' : t}
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
                                    <span className="text-xs font-bold text-slate-500">Subscription Engine</span>
                                    <span className={`text-[10px] font-black uppercase ${stats.pendingSubs > 0 ? 'text-rose-500 animate-pulse' : 'text-green-500'}`}>
                                        {stats.pendingSubs > 0 ? `${stats.pendingSubs} Pending Approval` : 'All Clear'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                    <span className="text-xs font-bold text-slate-500">Premium Revenue</span>
                                    <span className="text-[10px] font-black text-indigo-500 uppercase">Rs. {stats.premiumUsers * 250}+ (Projected)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-80">Admin Tip</p>
                            <p className="text-lg font-bold leading-tight">Verify payment screenshots carefully in the 'Verification' tab before granting Pro access.</p>
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
                                    <div className="flex gap-2 items-center">
                                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${u.subscription_tier === 'pro' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                            {u.subscription_tier || 'free'}
                                        </span>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{u.city || 'Unknown'}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right mr-2">
                                        <p className="text-xs font-black text-rose-500">{u.points || 0} HP</p>
                                    </div>
                                    
                                    {/* Action: Trial Reset */}
                                    {u.subscription_tier === 'free' && (
                                        <button 
                                            onClick={() => resetUserTrial(u.id, u.username)}
                                            title="Reset Free Trial"
                                            className="bg-indigo-50 p-3 rounded-xl hover:bg-indigo-100 transition-colors"
                                        >
                                            ⏳
                                        </button>
                                    )}

                                    {/* Action: Gift Points */}
                                    <button 
                                        onClick={() => updateUserPoints(u.id, (u.points || 0) + 100)}
                                        title="Gift 100 Points"
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
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-8">
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

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Hasanat Points</label>
                                        <input 
                                            type="number" value={points} onChange={(e) => setPoints(e.target.value)}
                                            className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-black text-indigo-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Validity (Hours)</label>
                                        <input 
                                            type="number" value={validityHours} onChange={(e) => setValidityHours(e.target.value)}
                                            className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-black text-slate-700"
                                        />
                                    </div>
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

                        <div className="space-y-4">
                            <h4 className="px-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Global History</h4>
                            {challengeHistory.map(ch => (
                                <div key={ch.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex justify-between items-center group hover:bg-slate-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-lg shadow-sm">✨</div>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm">{ch.title}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Expires: {new Date(ch.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">+{ch.points} HP</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 4. BROADCAST TAB */}
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

                {/* 5. SUBSCRIPTION VERIFICATION TAB */}
                {tab === 'subs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                        <h3 className="px-2 font-black text-slate-800">Pending Payments</h3>
                        {pendingRequests.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                                <p className="text-slate-300 font-bold italic">No pending verifications today.</p>
                            </div>
                        )}
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="font-black text-slate-900">{req.profiles?.username || 'Sister Anonymous'}</p>
                                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Plan Selected: {req.tier}</p>
                                    </div>
                                    <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase">Pending Approval</span>
                                </div>
                                
                                <div className="bg-slate-50 rounded-2xl p-4 mb-4 border border-slate-100 flex items-center justify-center italic text-[10px] text-slate-400">
                                    [Proof Reference: {req.screenshot_url.substring(0, 12)}...]
                                </div>

                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => approveSubscription(req.id, req.user_id, req.tier)}
                                        disabled={loading}
                                        className="flex-1 bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                    >
                                        Verify & Upgrade
                                    </button>
                                    <button className="bg-rose-50 text-rose-500 px-6 py-4 rounded-xl text-[10px] font-black uppercase">Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 6. SETTINGS TAB */}
                {tab === 'settings' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <span className="text-2xl">⚙️</span>
                                <h3 className="font-black text-slate-900">System Configuration</h3>
                            </div>

                            <div className="space-y-8">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4 mb-2 block">Free Trial Duration (Days)</label>
                                    <input 
                                        type="number" 
                                        value={trialDays} 
                                        onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                                        className="w-full p-5 bg-slate-50 rounded-[1.5rem] border-none focus:ring-2 focus:ring-rose-500 font-black text-indigo-600 text-lg"
                                    />
                                </div>

                                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Hard-Lock Features</p>
                                        <p className="text-[10px] text-slate-500 font-medium mt-1 leading-tight">
                                            Block dashboard access after trial expires
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setLockAfterTrial(!lockAfterTrial)}
                                        className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${lockAfterTrial ? 'bg-rose-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${lockAfterTrial ? 'translate-x-8' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <button 
                                    onClick={handleUpdateSettings}
                                    disabled={settingsLoading}
                                    className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {settingsLoading ? "SAVING CONFIGURATION..." : "APPLY GLOBAL CHANGES"}
                                </button>
                            </div>
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