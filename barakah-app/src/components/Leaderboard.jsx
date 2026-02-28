import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

export default function Leaderboard({ currentUser, totalPoints }) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaders();
    }, []);

    async function fetchLeaders() {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('username, points, city')
                .order('points', { ascending: false })
                .limit(10);

            if (error) throw error;
            setLeaders(data || []);
        } catch (error) {
            console.error('Error fetching leaderboard:', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Top Sisters</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Community Leaders</p>
                </div>
                <div className="bg-amber-50 text-amber-600 px-4 py-2 rounded-2xl font-black text-xs">
                    🏆 HIGH SCORES
                </div>
            </div>

            {loading ? (
                <div className="space-y-4 py-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {leaders.map((leader, index) => (
                        <div key={index} className={`flex items-center justify-between p-4 rounded-3xl transition-all ${leader.username === currentUser?.name ? 'bg-indigo-50 border-2 border-indigo-200' : 'bg-slate-50 border border-transparent'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${index === 0 ? 'bg-amber-400 text-white' : index === 1 ? 'bg-slate-300 text-slate-600' : index === 2 ? 'bg-orange-300 text-white' : 'bg-white text-slate-400'}`}>
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="font-black text-slate-800 text-sm capitalize">{leader.username || 'Sister'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{leader.city || 'Unknown City'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-indigo-600">{leader.points || 0}</p>
                                <p className="text-[8px] font-black text-slate-400 uppercase">Hasanat</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}