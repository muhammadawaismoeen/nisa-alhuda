import React, { useState, useEffect } from 'react';
// PRODUCTION PATH: admin -> components -> src -> supabaseClient.js
import { supabase } from '../../supabaseClient.js'; 
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
  AlertCircle,
  TrendingUp,
  Award,
  Zap,
  ChevronRight,
  MoreVertical,
  Bell
} from 'lucide-react';

const AdminDashboard = () => {
  // --- STATE MANAGEMENT ---
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
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
    activeChallenges: 0,
    engagementRate: '88%'
  });

  useEffect(() => {
    fetchInitialData();
    
    const channel = supabase
      .channel('admin_prod_sync_final')
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
      console.error("Critical Data Sync Error:", error);
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
        activeChallenges: activeCount || 0,
        engagementRate: '88%'
      });
    } catch (err) {
      console.error("Error fetching schema stats:", err);
    }
  };

  const fetchChallenges = async () => {
    try {
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
      console.error('Database Connectivity Issue:', error.message);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    if (!title || !description) return alert("Please fill in the Title and Description fields.");

    setIsSubmitting(true);
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + parseInt(duration));

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

      setTitle('');
      setDescription('');
      setReward('50');
      setDuration('24');
      
      await fetchInitialData();
      alert("Success: Challenge is now Live!");
      
    } catch (error) {
      alert("Submission Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbff] font-sans text-slate-900">
      <nav className="bg-white/80 border-b border-slate-100 px-8 py-6 flex justify-between items-center sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl">
               <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-2xl tracking-tighter text-slate-800 uppercase">Admin Portal</span>
          </div>
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 ml-1">Live Schema Sync</span>
        </div>
        
        <div className="flex items-center gap-10">
          <div className="hidden md:flex gap-8 border-r border-slate-100 pr-10">
            <div className="text-right">
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Sisters</p>
              <p className="text-xl font-black text-slate-800 leading-none mt-1">{stats.totalSisters}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Online</p>
              <p className="text-xl font-black text-slate-800 leading-none mt-1">{stats.liveNow}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all relative">
               <Bell className="w-5 h-5" />
               <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
             </button>
             <button className="bg-slate-900 text-white px-6 py-3.5 rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-3 font-bold text-sm">
               <LogOut className="w-4 h-4" />
               Sign Out
             </button>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-8 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-5">
            <div className="bg-[#5d51e8] rounded-[50px] p-12 shadow-2xl text-white relative overflow-hidden border-8 border-white">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center gap-5 mb-12 relative z-10">
                <div className="bg-white/20 p-5 rounded-[28px] backdrop-blur-xl border border-white/20">
                  <Rocket className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight leading-none uppercase">Broadcast</h2>
                  <p className="text-white/60 text-[10px] font-black uppercase mt-2 tracking-[0.2em]">Final Schema v2</p>
                </div>
              </div>

              <form onSubmit={handleCreateChallenge} className="space-y-10 relative z-10">
                <div className="space-y-4">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-80 ml-1">Headline</label>
                  <input
                    type="text"
                    placeholder="Enter title..."
                    className="w-full bg-white/10 border-2 border-white/10 rounded-[28px] p-6 placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all font-bold text-lg"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-4">
                  <label className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-80 ml-1">Description</label>
                  <textarea
                    placeholder="Steps for sisters..."
                    className="w-full bg-white/10 border-2 border-white/10 rounded-[28px] p-6 placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:bg-white/20 transition-all min-h-[180px] font-medium resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-80 ml-1">Points</label>
                    <div className="relative group">
                      <PlusCircle className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="number"
                        className="w-full bg-white/10 border-2 border-white/10 rounded-[28px] p-6 pl-14 focus:outline-none font-black text-2xl"
                        value={reward}
                        onChange={(e) => setReward(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="block text-[11px] font-black uppercase tracking-[0.2em] opacity-80 ml-1">Hours</label>
                    <div className="relative group">
                      <Clock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                      <input
                        type="number"
                        className="w-full bg-white/10 border-2 border-white/10 rounded-[28px] p-6 pl-14 focus:outline-none font-black text-2xl"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-white text-[#5d51e8] font-black py-7 rounded-[32px] mt-6 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.25em] text-sm shadow-2xl disabled:opacity-50"
                >
                  {isSubmitting ? <RefreshCw className="w-6 h-6 animate-spin" /> : "ACTIVATE BROADCAST"}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white rounded-[50px] p-12 shadow-sm border border-slate-100 min-h-[900px] flex flex-col border-8 border-slate-50">
              <div className="flex items-center justify-between mb-12 pb-8 border-b border-slate-100">
                <div className="flex items-center gap-5">
                  <div className="bg-indigo-50 p-4 rounded-[22px] text-indigo-600 border border-indigo-100">
                    <Activity className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Activity Log</h2>
                  </div>
                </div>
                <button onClick={fetchInitialData} className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-slate-100">
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-10 flex-1 overflow-y-auto pr-4 custom-scrollbar">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-48 gap-6">
                    <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing...</p>
                  </div>
                ) : (
                  challenges
                    .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map((challenge) => (
                    <div key={challenge.id} className="group border-2 border-slate-50 rounded-[45px] p-10 hover:border-indigo-100 hover:bg-indigo-50/20 transition-all">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <span className={`text-[10px] font-black px-5 py-2 rounded-full uppercase tracking-widest border ${
                              challenge.is_active ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-100 text-slate-400'
                            }`}>
                              {challenge.is_active ? '● Live Now' : 'Expired'}
                            </span>
                          </div>
                          <h3 className="font-black text-slate-800 text-3xl tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">
                            {challenge.title}
                          </h3>
                          <div className="flex items-center gap-8 mt-5">
                            <div className="bg-amber-50 px-4 py-2 rounded-2xl border border-amber-100">
                              <span className="text-xs font-black text-amber-700 uppercase">{challenge.reward_points} Hasanat</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/80 border-2 border-slate-50 rounded-[36px] p-8 shadow-sm group-hover:border-white transition-all">
                        <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-5">
                           <div className="flex items-center gap-3">
                              <Users className="w-4 h-4 text-indigo-600" />
                              <p className="text-[11px] font-black text-slate-700 uppercase tracking-[0.2em]">
                                 Completed By ({challenge.challenge_completions?.length || 0})
                              </p>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          {challenge.challenge_completions?.map((completion, idx) => (
                              <div key={idx} className="bg-white border-2 border-slate-50 text-slate-700 px-6 py-3.5 rounded-[22px] text-[11px] font-black">
                                {completion.username || 'Sister'}
                              </div>
                            )) || <p className="text-[10px] text-slate-300 font-black uppercase">Awaiting participation...</p>
                          }
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
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 30px; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;