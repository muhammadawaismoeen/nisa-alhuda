import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient.js';

export default function ChallengeList() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
        
        const sub = supabase
            .channel('public_challenges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallenges())
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    async function fetchChallenges() {
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (err) {
            console.error("Fetch error:", err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest text-[10px]">Loading Hub...</div>;

    return (
        <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <span className="text-3xl">🌟</span> Barakah Hub
                </h3>
                <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest">
                    {challenges.length} Active
                </span>
            </div>
            
            <div className="space-y-6">
                {challenges.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2.5rem] p-16 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]">No challenges at the moment.<br/>Keep your intentions pure!</p>
                    </div>
                ) : (
                    challenges.map((task) => (
                        <div key={task.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h4 className="font-black text-slate-800 text-xl tracking-tight group-hover:text-indigo-600 transition-colors">{task.title}</h4>
                                <span className="bg-emerald-50 text-emerald-600 text-xs font-black px-4 py-2 rounded-full uppercase">
                                    +{task.reward_points} ❤️
                                </span>
                            </div>
                            <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium relative z-10">{task.description}</p>
                            <button className="w-full py-5 bg-indigo-50 text-indigo-600 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm relative z-10">
                                Mark as Completed
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}