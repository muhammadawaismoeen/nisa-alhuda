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

    // Timer Logic State Added
    const [newChallenge, setNewChallenge] = useState({ title: '', description: '', points: 50, durationHours: 24 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchAdminData();
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
            // Calculate Expiry based on timer input
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
            alert("MashaAllah! Challenge is live with timer.");
        } catch (err) {
            alert("Database Error: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
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
                    <button onClick={fetchAdminData} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                        <span className={loading ? "animate-spin block" : ""}>🔄</span>
                    </button>
                    <button onClick={onClose} className="bg-slate-900 hover:bg-rose-600 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95">
                        EXIT ADMIN ×
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <nav className="w-64 bg-white border-r border-slate-200 p-6 flex flex-col gap-2">
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
                                <p className="text-slate-500 font-medium">Real-time engagement across the platform.</p>
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
                        <div className="max-w-2xl animate-in fade-in slide-in-from-left-4 duration-500">
                             <header className="mb-8">
                                <h1 className="text-3xl font-black text-slate-800 tracking-tight">Challenge Hub</h1>
                                <p className="text-slate-500">Push dynamic tasks with auto-expiration.</p>
                            </header>

                            <div className="bg-indigo-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-indigo-200">
                                <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                                    <span className="bg-white/20 p-2 rounded-xl text-lg">🚀</span>
                                    Create New Challenge
                                </h3>
                                <form onSubmit={handleAddChallenge} className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Challenge Title</label>
                                        <input required type="text" placeholder="e.g., Read Surah Mulk" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-bold placeholder:text-white/30 focus:bg-white/20 transition-all" value={newChallenge.title} onChange={(e) => setNewChallenge({...newChallenge, title: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Description</label>
                                        <textarea required placeholder="Recite before sleeping..." rows="2" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none text-sm placeholder:text-white/30 focus:bg-white/20 transition-all" value={newChallenge.description} onChange={(e) => setNewChallenge({...newChallenge, description: e.target.value})} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Hasanat Rewards</label>
                                            <input required type="number" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-black text-white" value={newChallenge.points} onChange={(e) => setNewChallenge({...newChallenge, points: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase opacity-60 ml-2 mb-1 block">Duration (Hours)</label>
                                            <input required type="number" placeholder="24" className="w-full p-4 bg-white/10 border border-white/20 rounded-2xl outline-none font-black text-white" value={newChallenge.durationHours} onChange={(e) => setNewChallenge({...newChallenge, durationHours: e.target.value})} />
                                        </div>
                                    </div>
                                    <button disabled={isSubmitting} type="submit" className="w-full bg-white text-indigo-600 p-5 rounded-[1.5rem] font-black text-sm hover:bg-emerald-400 hover:text-white transition-all shadow-xl active:scale-95">
                                        {isSubmitting ? "SYNCING..." : "ACTIVATE CHALLENGE NOW"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {activeTab === 'User Analytics' && (
                         <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm animate-in fade-in duration-500">
                            <h3 className="text-xl font-black text-slate-800 mb-8">Sisterhood Directory</h3>
                            <div className="overflow-hidden rounded-2xl border border-slate-50">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50">
                                        <tr className="text-[10px] font-black uppercase text-slate-400">
                                            <th className="px-6 py-4">Sister Name</th>
                                            <th className="px-6 py-4">City</th>
                                            <th className="px-6 py-4 text-right">Points</th>
                                            <th className="px-6 py-4 text-center">Role</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {allSisters.map((sister) => (
                                            <tr key={sister.id} className="group hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-700">{sister.username || 'Sister'}</td>
                                                <td className="px-6 py-4 text-slate-500 text-sm">{sister.city}</td>
                                                <td className="px-6 py-4 text-right font-black text-rose-500">{sister.points} ❤️</td>
                                                <td className="px-6 py-4 text-center">
                                                    <button onClick={() => toggleRole(sister.id, sister.role)} className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest ${sister.role === 'admin' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
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
                                <span className="ml-4 text-[10px] text-emerald-900 font-bold uppercase tracking-widest">BarakahOS Console v4.0.2</span>
                            </div>
                            <div className="space-y-3">
                                {logs.map(log => (
                                    <div key={log.id} className="flex gap-4 animate-in slide-in-from-left duration-300">
                                        <span className="opacity-40 whitespace-nowrap">[{log.time}]</span>
                                        <span className={`font-black uppercase tracking-tighter w-20 ${log.status === 'error' ? 'text-rose-500' : 'text-indigo-400'}`}>
                                            {log.user}
                                        </span>
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