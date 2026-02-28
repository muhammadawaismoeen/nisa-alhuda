import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ChallengeList() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();

        // Real-time listener: Hub updates immediately when Admin broadcasts
        const channel = supabase
            .channel('public:challenges')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
                fetchChallenges();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function fetchChallenges() {
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                // Only show challenges that haven't expired and are marked active
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (err) {
            console.error("Error fetching challenges:", err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center opacity-50 font-black uppercase text-[10px] tracking-widest">Loading Daily Tasks...</div>;

    return (
        <div className="px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <span className="text-2xl">🌟</span> Daily Barakah Tasks
                </h3>
                <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                    {challenges.length} Active
                </span>
            </div>
            
            <div className="space-y-4">
                {challenges.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-100 rounded-[2rem] p-10 text-center">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No active challenges today.<br/>Check back soon, Sis!</p>
                    </div>
                ) : (
                    challenges.map((task) => (
                        <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                            {/* Decorative accent */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 tracking-tight text-lg">{task.title}</h4>
                                <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full uppercase whitespace-nowrap">
                                    +{task.reward_points} Hasanat ❤️
                                </span>
                            </div>
                            
                            <p className="text-slate-500 text-xs leading-relaxed mb-4 font-medium">
                                {task.description}
                            </p>
                            
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => alert('Complete functionality coming next!')}
                                    className="flex-1 py-4 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                >
                                    Mark as Completed
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}