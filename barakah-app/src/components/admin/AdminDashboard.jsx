import React, { useState, useEffect } from 'react';
// FIXED: Path changed to ../../ because this file is in src/components/admin/
import { supabase } from '../../supabaseClient'; 

export default function AdminDashboard() {
    // --- State Management ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [points, setPoints] = useState(50);
    const [duration, setDuration] = useState(24);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalUsers: 0, activeChallenges: 0 });

    // --- Initialization ---
    useEffect(() => {
        fetchAdminData();
    }, []);

    async function fetchAdminData() {
        try {
            // Fetch History
            const { data: chData, error: chError } = await supabase
                .from('challenges')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (chError) throw chError;
            setHistory(chData || []);

            // Fetch Global Stats for Admin Insight
            const { count: userCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            const activeCount = chData?.filter(c => new Date(c.expires_at) > new Date()).length;

            setStats({
                totalUsers: userCount || 0,
                activeChallenges: activeCount || 0
            });

        } catch (error) {
            console.error('Admin Fetch Error:', error.message);
        }
    }

    // --- Action Handlers ---
    async function handleCreateChallenge(e) {
        e.preventDefault();
        
        if (!title.trim() || !description.trim()) {
            return alert("Please provide both a title and description for the sisters.");
        }
        
        setLoading(true);
        try {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + parseInt(duration));

            const { error } = await supabase
                .from('challenges')
                .insert([{
                    title: title.trim(),
                    description: description.trim(),
                    points: parseInt(points),
                    expires_at: expiresAt.toISOString(),
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            // Success UI Feedback
            alert("MashaAllah! The challenge is now live for all users.");
            setTitle('');
            setDescription('');
            setPoints(50);
            fetchAdminData(); // Refresh list and stats
            
        } catch (error) {
            alert("Database Error: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function deleteChallenge(id) {
        if (!window.confirm("Are you sure you want to remove this challenge?")) return;
        
        try {
            const { error } = await supabase.from('challenges').delete().eq('id', id);
            if (error) throw error;
            fetchAdminData();
        } catch (error) {
            alert("Delete failed: " + error.message);
        }
    }

    return (
        <div className="p-4 pb-24 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header Section */}
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Admin Portal</h2>
                    <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Manage Community Challenges</p>
                </div>
                <div className="flex gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-indigo-500 uppercase">Total Sisters</p>
                        <p className="text-xl font-black text-slate-800">{stats.totalUsers}</p>
                    </div>
                    <div className="text-right border-l pl-4 border-slate-200">
                        <p className="text-[10px] font-black text-emerald-500 uppercase">Live Now</p>
                        <p className="text-xl font-black text-slate-800">{stats.activeChallenges}</p>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
                
                {/* Creation Form - Occupies 3 columns */}
                <div className="lg:col-span-3">
                    <form onSubmit={handleCreateChallenge} className="bg-indigo-600 rounded-[3rem] p-10 shadow-2xl shadow-indigo-200 border-4 border-white">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-white/20 p-3 rounded-2xl text-2xl shadow-inner">🚀</div>
                            <h3 className="text-2xl font-black text-white">Broadcast Challenge</h3>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[11px] font-black text-indigo-100 uppercase tracking-widest mb-2 ml-1">Challenge Headline</label>
                                <input 
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Fasting on White Days"
                                    className="w-full bg-white/10 border-2 border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 font-bold focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all text-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-black text-indigo-100 uppercase tracking-widest mb-2 ml-1">Instruction / Details</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide clear steps for the sisters..."
                                    rows="4"
                                    className="w-full bg-white/10 border-2 border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/30 font-bold focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[11px] font-black text-indigo-100 uppercase tracking-widest mb-2 ml-1">Points (Hasanat)</label>
                                    <input 
                                        type="number" 
                                        value={points}
                                        onChange={(e) => setPoints(e.target.value)}
                                        className="w-full bg-white/10 border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-black focus:outline-none focus:bg-white/20 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-black text-indigo-100 uppercase tracking-widest mb-2 ml-1">Valid For (Hours)</label>
                                    <input 
                                        type="number" 
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="w-full bg-white/10 border-2 border-white/10 rounded-2xl px-6 py-4 text-white font-black focus:outline-none focus:bg-white/20 transition-all"
                                    />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-white text-indigo-600 font-black py-6 rounded-[2.5rem] uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all shadow-xl disabled:opacity-50 text-sm mt-4"
                            >
                                {loading ? 'Propagating to Users...' : 'Activate Challenge Now'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* History Sidebar - Occupies 2 columns */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-xl font-black text-slate-800">History Log</h3>
                        <button onClick={fetchAdminData} className="text-indigo-500 text-xs font-black uppercase underline">Refresh</button>
                    </div>
                    
                    <div className="space-y-4 h-[600px] overflow-y-auto no-scrollbar pr-2">
                        {history.length === 0 ? (
                            <div className="p-10 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-center">
                                <p className="text-slate-400 font-bold text-xs uppercase">No Data Found</p>
                            </div>
                        ) : (
                            history.map((item) => {
                                const isActive = new Date(item.expires_at) > new Date();
                                return (
                                    <div key={item.id} className="group bg-white border border-slate-100 p-6 rounded-[2rem] shadow-sm hover:shadow-md transition-all relative overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                                {isActive ? 'Active' : 'Expired'}
                                            </span>
                                            <button 
                                                onClick={() => deleteChallenge(item.id)}
                                                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity"
                                            >
                                                <span className="text-xs font-black uppercase">Delete</span>
                                            </button>
                                        </div>
                                        <p className="font-black text-slate-800 mb-1 leading-tight">{item.title}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {item.points} Hasanat • {new Date(item.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}