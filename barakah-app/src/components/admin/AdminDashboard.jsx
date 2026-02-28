import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

export default function AdminDashboard({ onClose }) {
    const [stats, setStats] = useState({ users: 0, activeToday: 0, totalHasanat: '0', avgStreak: 0 });
    const [cityData, setCityData] = useState([]);
    const [allSisters, setAllSisters] = useState([]);
    const [logs, setLogs] = useState([
        { id: 1, user: 'System', event: 'Command Center Initialized', time: new Date().toLocaleTimeString(), type: 'system', status: 'success' }
    ]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('Overview');

    // Challenge Hub History & Form States
    const [newChallenge, setNewChallenge] = useState({ title: '', description: '', points: 50, durationHours: 24 });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [challengeHistory, setChallengeHistory] = useState([]);

    useEffect(() => {
        fetchAdminData();
        fetchChallengeHistory();
    }, []);

    async function fetchAdminData() {
        setLoading(true);
        try {
            const { data: profileData, count: userCount, error } = await supabase
                .from('profiles')
                .select('id, username, city, role, points', { count: 'exact' });

            if (error) throw error;
            setAllSisters(profileData || []);

            const totalPointsSum = profileData.reduce((acc, curr) => acc + (curr.points || 0), 0);
            const formattedPoints = totalPointsSum > 1000 ? (totalPointsSum / 1000).toFixed(1) + 'k' : totalPointsSum;

            const cityMap = profileData.reduce((acc, curr) => {
                const city = curr.city || 'Unknown';
                acc[city] = (acc[city] || 0) + 1;
                return acc;
            }, {});

            const formattedCityData = Object.entries(cityMap).map(([city, count]) => ({
                city,
                count,
                color: city === 'Lahore' ? 'bg-rose-500' : 'bg-indigo-500'
            })).sort((a, b) => b.count - a.count);

            setStats({
                users: userCount || 0,
                activeToday: Math.floor((userCount || 0) * 0.4),
                totalHasanat: formattedPoints,
                avgStreak: 7
            });
            setCityData(formattedCityData);

        } catch (error) {
            addLog('Error', error.message, 'system', 'error');
        } finally {
            setLoading(false);
        }
    }

    async function fetchChallengeHistory() {
        try {
            // Requirement: Fetch all challenges AND the list of sisters who completed them
            const { data, error } = await supabase
                .from('challenges')
                .select(`
                    *,
                    challenge_completions ( username, completed_at )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Fetch Error:", error.message);
                // Fail-safe: if the join fails, at least show the challenges themselves
                const { data: simpleData } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
                if (simpleData) setChallengeHistory(simpleData);
                return;
            }
            
            setChallengeHistory(data || []);
        } catch (err) {
            console.error("Critical History Error:", err);
        }
    }

    const addLog = (user, event, type, status) => {
        setLogs(prev => [{
            id: Date.now(),
            user,
            event,
            time: new Date().toLocaleTimeString(),
            type,
            status
        }, ...prev]);
    };

    const handleAddChallenge = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const expiryDate = new Date();
            expiryDate.setHours(expiryDate.getHours() + parseInt(newChallenge.durationHours));

            const { error } = await supabase
                .from('challenges')
                .insert([{ 
                    title: newChallenge.title, 
                    description: newChallenge.description, 
                    points: parseInt(newChallenge.points),
                    expires_at: expiryDate.toISOString()
                }]);

            if (error) throw error;

            addLog('Admin', `NEW CHALLENGE: ${newChallenge.title}`, 'content', 'success');
            setNewChallenge({ title: '', description: '', points: 50, durationHours: 24 });
            await fetchChallengeHistory();
            alert("MashaAllah! Challenge live for all sisters.");
        } catch (err) {
            alert("Database Error: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteChallenge = async (id) => {
        if(!confirm("Are you sure? This will remove history too.")) return;
        const { error } = await supabase.from('challenges').delete().eq('id', id);
        if(!error) fetchChallengeHistory();
    };

    const toggleRole = async (id, currentRole) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', id);
        if (!error) {
            addLog('Admin', `Updated Role to ${newRole}`, 'security', 'success');
            fetchAdminData();
        }
    };

    const StatCard = ({ label, value, icon, color }) => (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 transition-transform hover:scale-[1.02]">
            <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-xl mb-4 shadow-inner`}>{icon}</div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{label}</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{loading ? "..." : value}</h3>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col font-sans overflow-hidden text-slate-900">
            {/* Nav Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-lg">A</div>
                    <div>
                        <h2 className="text-slate-800 font-bold leading-none tracking-tight">Command Center</h2>
                        <p className="text-[10px] text-emerald-500 font-black uppercase mt-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Live System Active
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={() => { fetchAdminData(); fetchChallengeHistory(); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-slate-600 font-black text-[10px] uppercase">
                        <span className={loading ? "animate-spin" : ""}>🔄</span> Force Sync
                    </button>
                    <button onClick={onClose} className="bg-slate-900 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95">
                        EXIT ADMIN ×
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <nav className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2 flex-shrink-0">
                    {['Overview', 'User Analytics', 'Content Manager', 'System Logs'].map((item) => (
                        <button
                            key={item}
                            onClick={() => setActiveTab(item)}
                            className={`w-full text-left px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${
                                activeTab === item 
                                ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg' 
                                : 'text-slate-400 hover:bg-slate-50'
                            }`}
                        >
                            {item}
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
                    {activeTab === 'Overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <header className="mb-10">
                                <h1 className="text-4xl font-black text-slate-800 tracking-tight">System Snapshot</h1>
                                <p className="text-slate-500 font-medium">Real-time engagement tracking.</p>
                            </header>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                                <StatCard label="Total Sisters" value={stats.users} icon="👥" color="bg-blue-50" />
                                <StatCard label="Live Estim." value={stats.activeToday} icon="⚡" color="bg-amber-50" />
                                <StatCard label="Global Hasanat" value={stats.totalHasanat} icon="💎" color="bg-emerald-50" />
                                <StatCard label="Avg. Streak" value={`${stats.avgStreak} Days`} icon="🔥" color="bg-rose-50" />
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                                <h3 className="text-lg font-black text-slate-800 mb-6">Regional Distribution</h3>
                                <div className="space-y-6">
                                    {cityData.map((item, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between text-xs font-black uppercase mb-2">
                                                <span className="text-slate-600">{item.city}</span>
                                                <span className="text-indigo-600">{item.count} Sisters</span>
                                            </div>
                                            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                                                    style={{ width: stats.users > 0 ? `${(item.count/stats.users)*100}%` : '0%' }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'Content Manager' && (
                        <div className="animate-in fade-in slide-in-from-left-4 duration-500">
                             <header className="mb-8">
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Challenge Hub</h1>
                                <p className="text-slate-500">Create and track community goals.</p>
                            </header>

                            <div className="flex flex-row gap-8 items-start">
                                {/* LEFT: Creation Form */}
                                <div className="w-[400px] flex-shrink-0 bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-200">
                                    <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                        <span className="bg-white/20 p-2 rounded-xl text-lg">🚀</span>
                                        Create New
                                    </h3>
                                    <form onSubmit={handleAddChallenge} className="space-y-5">
                                        <div>
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Challenge Title</label>
                                            <input required type="text" placeholder="e.g., Read Surah Mulk" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-bold placeholder:text-white/30 focus:bg-white/20" value={newChallenge.title} onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Description</label>
                                            <textarea required placeholder="Recite before sleeping..." rows="2" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-sm placeholder:text-white/30 focus:bg-white/20" value={newChallenge.description} onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Points</label>
                                                <input required type="number" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-black text-white" value={newChallenge.points} onChange={(e) => setNewChallenge({...newChallenge, points: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Hours</label>
                                                <input required type="number" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-black text-white" value={newChallenge.durationHours} onChange={(e) => setNewChallenge({...newChallenge, durationHours: e.target.value})} />
                                            </div>
                                        </div>
                                        <button disabled={isSubmitting} type="submit" className="w-full bg-white text-indigo-600 p-5 rounded-[1.5rem] font-black text-sm hover:bg-emerald-400 hover:text-white transition-all shadow-xl active:scale-95 mt-4">
                                            {isSubmitting ? "SYNCING..." : "ACTIVATE CHALLENGE NOW"}
                                        </button>
                                    </form>
                                </div>

                                {/* RIGHT: Requirement: History & Who Participated */}
                                <div className="flex-1 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-[650px]">
                                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
                                        <h3 className="text-xl font-black text-slate-800">📜 Challenge History</h3>
                                        <div className="flex gap-2">
                                            <span className="bg-emerald-100 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                                {challengeHistory.filter(c => new Date(c.expires_at) > new Date()).length} Active
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto pr-4 space-y-6 custom-scrollbar">
                                        {challengeHistory.length === 0 ? (
                                            <div className="text-center py-20 opacity-20 font-black text-slate-400">NO HISTORY FOUND</div>
                                        ) : (
                                            challengeHistory.map((ch) => (
                                                <div key={ch.id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group relative transition-all hover:bg-white hover:shadow-md">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-black text-slate-800 text-lg leading-tight">{ch.title}</h4>
                                                            <p className="text-xs text-slate-500 mt-1 font-medium">{ch.description}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${new Date(ch.expires_at) > new Date() ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                {new Date(ch.expires_at) > new Date() ? 'LIVE' : 'EXPIRED'}
                                                            </span>
                                                            <button onClick={() => deleteChallenge(ch.id)} className="opacity-0 group-hover:opacity-100 text-rose-500 text-[10px] font-black uppercase transition-opacity">Delete Challenge ×</button>
                                                        </div>
                                                    </div>

                                                    {/* Requirement: List of participants */}
                                                    <div className="bg-white rounded-2xl p-4 border border-slate-100">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                                                            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                                            Participants ({ch.challenge_completions?.length || 0})
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {ch.challenge_completions && ch.challenge_completions.length > 0 ? (
                                                                ch.challenge_completions.map((comp, idx) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                                                                        <span className="text-xs">👤</span>
                                                                        <span className="text-[10px] font-black text-slate-700 uppercase">{comp.username}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-[10px] italic text-slate-400 font-bold">Waiting for first completion...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'User Analytics' && (
                         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in fade-in duration-500">
                            <h3 className="text-xl font-black text-slate-800 mb-8">Sisterhood Directory</h3>
                            <div className="overflow-hidden rounded-2xl border border-slate-50">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                        <tr>
                                            <th className="px-6 py-4">Sister</th>
                                            <th className="px-6 py-4">City</th>
                                            <th className="px-6 py-4 text-right">Points</th>
                                            <th className="px-6 py-4 text-center">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {allSisters.map((sister) => (
                                            <tr key={sister.id} className="hover:bg-slate-50 transition-colors font-bold text-slate-700">
                                                <td className="px-6 py-4">{sister.username || 'Sister'}</td>
                                                <td className="px-6 py-4 text-slate-500">{sister.city}</td>
                                                <td className="px-6 py-4 text-right text-rose-500">{sister.points} ❤️</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => toggleRole(sister.id, sister.role)} className={`px-3 py-1 rounded-full text-[9px] font-black ${sister.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {(sister.role || 'user').toUpperCase()}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                    )}

                    {activeTab === 'System Logs' && (
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 font-mono text-xs text-emerald-400 shadow-2xl min-h-[500px]">
                            <div className="flex items-center gap-2 mb-6 border-b border-emerald-900/50 pb-4">
                                <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                <span className="ml-4 text-[10px] text-emerald-900 font-bold uppercase tracking-widest">BarakahOS Console</span>
                            </div>
                            <div className="space-y-3">
                                {logs.map(log => (
                                    <div key={log.id} className="flex gap-4">
                                        <span className="opacity-40">[{log.time}]</span>
                                        <span className={`font-black uppercase w-20 ${log.status === 'error' ? 'text-rose-500' : 'text-indigo-400'}`}>{log.user}</span>
                                        <span className="text-slate-300">{log.event}</span>
                                    </div>
                                ))}
                                <div className="animate-pulse">_</div>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}