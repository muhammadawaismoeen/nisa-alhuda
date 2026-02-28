import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ChallengeList() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChallenges();
    }, []);

    async function fetchChallenges() {
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (err) {
            console.error("Error fetching challenges:", err.message);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8 text-center opacity-50">Loading Daily Tasks...</div>;

    return (
        <div className="px-6 py-8">
            <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                <span className="text-2xl">🌟</span> Daily Barakah Tasks
            </h3>
            
            <div className="space-y-4">
                {challenges.length === 0 ? (
                    <p className="text-slate-400 text-sm italic">No active challenges today. Stay tuned!</p>
                ) : (
                    challenges.map((task) => (
                        <div key={task.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-black text-slate-800 tracking-tight">{task.title}</h4>
                                <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                                    +{task.points} ❤️
                                </span>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed mb-4">
                                {task.description}
                            </p>
                            <button className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">
                                Mark as Completed
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}