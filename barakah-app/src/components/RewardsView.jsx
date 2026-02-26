import { useState } from 'react';

export function RewardsView({ unlockedBadges, MILESTONES, LEADERBOARD_DATA }) {
    const [rewardTab, setRewardTab] = useState('badges');

    return (
        <div className="pb-28 animate-in fade-in duration-500 h-full overflow-y-auto no-scrollbar px-6">
            <div className="pt-12 mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-6">Rewards</h2>
                
                {/* Tab Switcher */}
                <div className="flex gap-2 bg-white p-1 rounded-2xl border border-rose-50 shadow-sm">
                    <button 
                        onClick={() => setRewardTab('badges')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${rewardTab === 'badges' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}
                    >
                        Badges
                    </button>
                    <button 
                        onClick={() => setRewardTab('leaderboard')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${rewardTab === 'leaderboard' ? 'bg-rose-500 text-white' : 'text-gray-400'}`}
                    >
                        Ummah Rank
                    </button>
                </div>
            </div>

            {rewardTab === 'badges' ? (
                <div className="grid grid-cols-2 gap-4">
                    {MILESTONES.map((m) => {
                        const isUnlocked = unlockedBadges.includes(m.id);
                        return (
                            <div key={m.id} className={`p-6 rounded-[2.5rem] border flex flex-col items-center text-center transition-all ${isUnlocked ? 'bg-white border-rose-100 shadow-sm' : 'bg-gray-50/50 border-dashed border-gray-200 opacity-60'}`}>
                                <span className={`text-4xl mb-3 ${!isUnlocked && 'grayscale'}`}>{m.icon}</span>
                                <p className="text-[10px] font-black text-gray-800 uppercase mb-1">{m.title}</p>
                                <p className="text-[9px] font-bold text-rose-400 uppercase tracking-tighter">
                                    {isUnlocked ? 'Unlocked' : `${m.threshold} Points`}
                                </p>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-3">
                    {LEADERBOARD_DATA.map((user, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-3xl flex items-center justify-between border border-rose-50 shadow-sm">
                            <div className="flex items-center gap-4">
                                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : 'bg-rose-50 text-rose-500'}`}>
                                    {user.rank}
                                </span>
                                <span className="text-2xl">{user.avatar}</span>
                                <div>
                                    <p className="font-black text-gray-800 text-sm">{user.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Spiritual Level 4</p>
                                </div>
                            </div>
                            <p className="font-black text-rose-500 text-sm">{user.points.toLocaleString()} pts</p>
                        </div>
                    ))}
                    
                    {/* Perspective Note */}
                    <div className="mt-8 p-6 bg-rose-50 rounded-[2rem] text-center">
                        <p className="text-[10px] font-bold text-rose-400 uppercase leading-relaxed">
                            "The race is not against others, but against your own soul."
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RewardsView;