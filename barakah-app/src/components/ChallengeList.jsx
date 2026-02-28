import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ChallengeList() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
        
        // Listen for new broadcasts immediately
        const subscription = supabase
            .channel('any')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => fetchChallenges())
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
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

    if (loading) return <div className="p-10 text-center animate-pulse font-bold text-slate-400">LOADING HUB...</div>;

    return (
        <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800">🌟 Community Challenges</h3>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    {challenges.length} ACTIVE
                </span>
            </div>
            
            <div className="space-y-4">
                {challenges.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No challenges right now.</p>
                    </div>
                ) : (
                    challenges.map((task) => (
                        <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 tracking-tight">{task.title}</h4>
                                <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                    +{task.reward_points} ❤️
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed mb-4">{task.description}</p>
                            <button className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                Mark as Completed
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}