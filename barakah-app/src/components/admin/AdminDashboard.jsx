import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; 
import { 
  Rocket, 
  Trophy, 
  Clock, 
  CheckCircle, 
  Users, 
  Calendar, 
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  Filter,
  PlusCircle,
  Activity,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const AdminDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // --- FORM STATE ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('50');
  const [duration, setDuration] = useState('24');

  // --- STATS STATE ---
  const [stats, setStats] = useState({
    totalSisters: 0,
    liveNow: 5,
    totalCompletions: 0,
    activeChallenges: 0
  });

  useEffect(() => {
    fetchInitialData();
    
    // Real-time subscription to sync UI across all devices
    const channel = supabase
      .channel('admin_sync_v4')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'challenges' }, 
        () => fetchChallenges()
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'challenge_completions' }, 
        () => {
          fetchChallenges();
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchChallenges(),
        fetchStats()
      ]);
    } catch (error) {
      console.error("Critical Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { count: sistersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const { count: completionsCount } = await supabase
        .from('challenge_completions')
        .select('*', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('challenges')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
        
      setStats({
        totalSisters: sistersCount || 0,
        liveNow: 5, 
        totalCompletions: completionsCount || 0,
        activeChallenges: activeCount || 0
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchChallenges = async () => {
    try {
      // Pulling relational data to show exactly who completed which challenge
      const { data, error } = await supabase
        .from('challenges')
        .select(`
          *,
          challenge_completions (
            id,
            username,
            completed_at
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Data Resolution Error:', error.message);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!title || !description) return alert("Please provide both a Title and Description");

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(duration));

      // This logic ensures 'is_active' is true so it appears in the user list
      const { error } = await supabase
        .from('challenges')
        .insert([
          {
            title: title,
            description: description,
            reward_points: parseInt(reward),
            expires_at: expiresAt.toISOString(),
            is_active: true,
            created_at: new Date().toISOString()
          }
        ]);

      if (error) throw error;

      // Reset form on success
      setTitle('');
      setDescription('');
      setReward('50');
      setDuration('24');
      
      await fetchInitialData();
      alert("Alhamdulillah! Challenge is now active for all sisters.");
      
    } catch (error) {
      alert("Submission Failed: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900">
      {/* HEADER SECTION */}
      <nav className="bg-white border-b border-slate-100 px-8 py-6 flex justify-between items-center sticky top-0 z-50 shadow-sm backdrop-blur-md bg-white/80">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <span className="font-black text-2xl tracking-tight text-slate-800 uppercase">Admin Portal</span>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-1">Barakah App Management</span>
        </div>
        
        <div className="flex items-center gap-12">
          <div className="flex gap-8 border-r border-slate-100 pr-8">
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Community Size</p>
              <p className="text-xl font-black text-slate-800 leading-none">{stats.totalSisters}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Sisters Online</p>
              <p className="text-xl font-black text-slate-800 leading-none">{stats.liveNow}</p>
            </div>
          </div>
          <button className="bg-slate-900 text-white px-5 py-3 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2 font-bold text-sm shadow-lg shadow-slate-200">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* LEFT COLUMN: CREATION ENGINE */}
          <div className="lg:col-span-5">
            <div className="bg-[#5d51e8] rounded-[48px] p-10 shadow-2xl text-white relative overflow-hidden ring-8 ring-indigo-50">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center gap-5 mb-10 relative z-10">
                <div className="bg-white/20 p-4 rounded-[24px] backdrop-blur-md">
                  <Rocket className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight leading-none">CREATE NEW</h2>
                  <p className="text-white/60 text-xs font-bold uppercase mt-1 tracking-widest">Broadcast to Hub</p>
                </div>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-8 relative z-10">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.15em] opacity-80 ml-1">Challenge Headline</label>
                  <input
                    type="text"
                    placeholder="e.g., Read Surah Mulk"
                    className="w-full bg-white/10 border-2 border-white/10 rounded-[24px] p-5 placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-bold text-lg"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black uppercase tracking-[0.15em] opacity-80 ml-1">Description & Steps</label>
                  <textarea
                    placeholder="Provide clear instructions for the sisters..."
                    className="w-full bg-white/10 border-2 border-white/10 rounded-[24px] p-5 placeholder:text-white/40 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all min-h-[160px] font-medium resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black uppercase tracking-[0.15em] opacity-80 ml-1">Hasanat Points</label>
                    <div className="relative">
                      <PlusCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="number"
                        className="w-full bg-white/10 border-2 border-white/10 rounded-[24px] p-5 pl-12 focus:outline-none font-black text-xl"
                        value={reward}
                        onChange={(e) => setReward(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black uppercase tracking-[0.15em] opacity-80 ml-1">Active Hours</label>
                    <div className="relative">
                      <Clock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="number"
                        className="w-full bg-white/10 border-2 border-white/10 rounded-[24px] p-5 pl-12 focus:outline-none font-black text-xl"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-[#5d51e8] font-black py-6 rounded-[28px] mt-4 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-sm shadow-2xl shadow-indigo-900/40 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    "ACTIVATE CHALLENGE NOW"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: HISTORY & PARTICIPANTS */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-[48px] p-10 shadow-sm border border-slate-100 min-h-[800px] flex flex-col ring-8 ring-slate-50">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                <div className="flex items-center gap-4">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600">
                    <Activity className="w-6 h-6" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tighter">Challenge Hub</h2>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={fetchInitialData} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all">
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <span className="bg-slate-100 text-slate-500 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.15em]">
                    {challenges.length} Records
                  </span>
                </div>
              </div>

              <div className="space-y-8 flex-1 overflow-y-auto pr-3 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-40 gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accessing Secure Ledger...</p>
                  </div>
                ) : challenges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 text-center opacity-40">
                    <AlertCircle className="w-16 h-16 text-slate-200 mb-4" />
                    <p className="font-bold text-slate-400 uppercase tracking-widest">No challenges in history</p>
                  </div>
                ) : (
                  challenges.map((challenge) => (
                    <div key={challenge.id} className="border-2 border-slate-50 rounded-[40px] p-8 hover:border-indigo-100/50 hover:bg-indigo-50/10 transition-all group">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-3">
                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter shadow-sm ${
                              challenge.is_active ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                            }`}>
                              {challenge.is_active ? 'Active' : 'Expired'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                              ID: {challenge.id.toString().slice(-4)}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-800 text-2xl tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                            {challenge.title}
                          </h3>
                          <div className="flex items-center gap-6 mt-3">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="text-xs font-black text-slate-500 uppercase">{challenge.reward_points} Hasanat</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-400" />
                              <span className="text-xs font-bold text-slate-400">{new Date(challenge.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DETAILED PARTICIPANT LOG */}
                      <div className="bg-white border-2 border-slate-50 rounded-[32px] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-4">
                           <p className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                             <Users className="w-4 h-4" /> Completed By ({challenge.challenge_completions?.length || 0})
                           </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          {challenge.challenge_completions && challenge.challenge_completions.length > 0 ? (
                            challenge.challenge_completions.map((completion, idx) => (
                              <div 
                                key={idx} 
                                className="bg-slate-50 border border-slate-100 text-slate-700 px-5 py-2.5 rounded-[20px] text-[11px] font-black shadow-sm flex items-center gap-3 hover:bg-white hover:border-indigo-200 transition-all cursor-default"
                              >
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ring-4 ring-emerald-50"></div>
                                {completion.username || 'Barakah Sister'}
                              </div>
                            ))
                          ) : (
                            <div className="w-full py-8 text-center border-2 border-dashed border-slate-100 rounded-[24px]">
                               <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em]">Awaiting first participation...</p>
                            </div>
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
      </main>

      <style jsx="true">{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid #fafbff; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;