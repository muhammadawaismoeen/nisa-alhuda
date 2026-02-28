import { useState, useEffect } from 'react';
// Path adjusted for: src/components/Leaderboard.jsx -> src/supabaseClient
import { supabase } from '../supabaseClient'; 

export default function Leaderboard({ currentUser, totalPoints }) {
    const [tab, setTab] = useState('Global');
    const [leaders, setLeaders] = useState([]);
    const [userRank, setUserRank] = useState({ rank: '...', points: totalPoints });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [tab, totalPoints]);

    async function fetchLeaderboard() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, points, avatar_url, city')
                .order('points', { ascending: false })
                .limit(50);

            if (error) throw error;

            const formattedLeaders = data.map((user, index) => ({
                id: user.id,
                name: user.username || 'Sister',
                points: user.points || 0,
                rank: index + 1,
                avatar: user.avatar_url || "👤",
                city: user.city
            }));

            let filtered = formattedLeaders;
            if (tab === 'Region' && currentUser?.city) {
                filtered = formattedLeaders.filter(l => l.city === currentUser.city);
            }

            setLeaders(filtered);

            const myRankIndex = data.findIndex(u => u.id === currentUser?.id);
            if (myRankIndex !== -1) {
                setUserRank({ rank: myRankIndex + 1, points: totalPoints });
            }
        } catch (err) {
            console.error("Leaderboard Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#A855F7] pb-32 pt-12 px-4 font-sans text-white animate-in fade-in duration-700">
            <div className="flex items-center mb-8">
                <button className="text-white text-2xl mr-4 hover:opacity-60 transition-opacity">←</button>
                <h2 className="text-white text-2xl font-black tracking-tight mx-auto">Leaderboard</h2>
            </div>

            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-3xl flex mb-10 border border-white/10 shadow-xl">
                {['Friends', 'Global', 'Region'].map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${
                            tab === t ? 'bg-white text-[#A855F7] shadow-lg' : 'text-white/60 hover:text-white'
                        }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* User Highlight Card */}
            <div className="bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-2xl border border-white/40 rounded-[3rem] p-6 mb-10 relative overflow-hidden shadow-2xl group">
                <div className="flex items-center gap-6">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-4xl border-4 border-amber-400 shadow-xl transform transition-transform group-hover:rotate-12">
                            🌸
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-rose-500 text-[10px] font-black px-3 py-1 rounded-full text-white border-2 border-[#A855F7] shadow-lg">
                            {userRank.rank === 1 ? '🥇' : `#${userRank.rank}`}
                        </div>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-white font-black text-xl tracking-tight">{currentUser?.username || 'You'}</h3>
                        <div className="flex gap-4 mt-2">
                            <div className="text-[10px] text-white/80 font-black uppercase bg-white/10 px-2 py-1 rounded-lg">🔥 Live Rank</div>
                            <div className="text-[10px] text-white/80 font-black uppercase bg-white/10 px-2 py-1 rounded-lg">📍 {currentUser?.city || 'Global'}</div>
                        </div>
                    </div>
                    <div className="bg-white px-5 py-3 rounded-[1.5rem] flex flex-col items-center shadow-xl">
                        <span className="text-rose-500 text-sm">❤️</span>
                        <span className="text-[#A855F7] font-black text-lg leading-none">{totalPoints}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-40">
                        <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-xs font-black uppercase tracking-widest">Fetching Elite Sisters...</p>
                    </div>
                ) : (
                    leaders.map((leader) => (
                        <div 
                            key={leader.id} 
                            className={`flex items-center p-5 rounded-[2.5rem] transition-all transform hover:scale-[1.02] ${
                                leader.id === currentUser?.id 
                                ? 'bg-white text-[#A855F7] ring-4 ring-amber-400' 
                                : leader.rank <= 3 ? 'bg-white/15 border border-white/20' : 'bg-white text-slate-700'
                            }`}
                        >
                            <span className={`w-8 text-xs font-black ${leader.rank <= 3 || leader.id === currentUser?.id ? 'text-white' : 'text-slate-300'}`}>
                                {leader.rank.toString().padStart(2, '0')}
                            </span>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mr-4 shadow-inner ${leader.id === currentUser?.id ? 'bg-[#A855F7]/10' : 'bg-slate-50'}`}>
                                {leader.avatar}
                            </div>
                            <div className="flex-1">
                                <span className={`block font-black text-sm tracking-tight ${leader.rank <= 3 || leader.id === currentUser?.id ? 'text-white' : 'text-slate-700'}`}>
                                    {leader.name}
                                </span>
                                <span className={`text-[9px] font-bold uppercase tracking-tighter ${leader.rank <= 3 || leader.id === currentUser?.id ? 'text-white/60' : 'text-slate-400'}`}>
                                    {leader.city || 'Global'}
                                </span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl ${leader.rank <= 3 || leader.id === currentUser?.id ? 'bg-white/20' : 'bg-rose-50'}`}>
                                <span className="text-xs">❤️</span>
                                <span className={`text-sm font-black ${leader.rank <= 3 || leader.id === currentUser?.id ? 'text-white' : 'text-rose-500'}`}>
                                    {leader.points}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}