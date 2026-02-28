import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
// Standard imports for components in the same folder
import NotificationCenter from './NotificationCenter'; 
import DeedTracker from './DeedTracker'; 
import ToolGrid from './Tools';

/**
 * ============================================================================
 * COMPONENT: Dashboard
 * ============================================================================
 * The primary interface for the Barakah App. 
 * Handles profile fetching, subscription status, and real-time events.
 * ============================================================================
 */
export default function Dashboard({ session }) {
    // -------------------------------------------------------------------------
    // 1. STATE DEFINITIONS
    // -------------------------------------------------------------------------
    
    // User profile state structure
    const [profile, setProfile] = useState({
        id: null,
        username: 'Sister',
        subscription_tier: 'free',
        role: 'user',
        created_at: null,
        avatar_url: null
    });

    // Operational states
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [lastSynced, setLastSynced] = useState(new Date());

    // -------------------------------------------------------------------------
    // 2. BACKEND SYNCHRONIZATION
    // -------------------------------------------------------------------------

    /**
     * getProfile
     * Fetches authenticated user data from Supabase 'profiles' table.
     */
    const getProfile = useCallback(async () => {
        try {
            // Safety check for active session
            if (!session?.user?.id) {
                console.warn("No active session detected in Dashboard.");
                return;
            }

            const { data, error: profileError, status } = await supabase
                .from('profiles')
                .select('id, username, subscription_tier, role, created_at, avatar_url')
                .eq('id', session.user.id)
                .single();

            // Handle potential query errors
            if (profileError && status !== 406) {
                throw profileError;
            }

            // Successfully retrieved data
            if (data) {
                setProfile({
                    id: data.id,
                    username: data.username || 'Sister',
                    subscription_tier: data.subscription_tier || 'free',
                    role: data.role || 'user',
                    created_at: data.created_at,
                    avatar_url: data.avatar_url
                });
                setLastSynced(new Date());
            }
        } catch (err) {
            setError(err.message);
            console.error('Dashboard Data Fetch Error:', err.message);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [session]);

    // -------------------------------------------------------------------------
    // 3. LIFECYCLE HOOKS
    // -------------------------------------------------------------------------

    useEffect(() => {
        let active = true;

        if (active) {
            getProfile();
        }

        // Standard cleanup to prevent memory leaks during hot reloads
        return () => { active = false; };
    }, [getProfile]);

    /**
     * handleManualRefresh
     * Allows user to manually trigger a data sync with the database.
     */
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await getProfile();
    };

    // -------------------------------------------------------------------------
    // 4. MODULAR UI FRAGMENTS (MEMOIZED)
    // -------------------------------------------------------------------------

    const DashboardHeader = useMemo(() => {
        return (
            <header className="p-8 pt-16 bg-white rounded-b-[4.5rem] shadow-sm mb-8 border-b border-rose-50/30 relative overflow-hidden">
                <div className="max-w-5xl mx-auto flex justify-between items-center relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            <p className="text-[11px] font-black text-rose-400 uppercase tracking-[0.4em]">
                                Assalam-o-Alaikum
                            </p>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">
                            {profile.username}
                        </h1>
                        <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-black px-4 py-1 rounded-full uppercase tracking-widest ${
                                profile.subscription_tier === 'pro' 
                                ? 'bg-amber-100 text-amber-600 border border-amber-200' 
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                                {profile.subscription_tier === 'pro' ? '★ Premium Access' : 'Standard Plan'}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="relative group transition-all active:scale-95 focus:outline-none"
                    >
                        <div className={`w-20 h-20 bg-gradient-to-br from-rose-50 via-white to-orange-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-sm border border-rose-100/50 group-hover:shadow-md transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-[2.5rem]" />
                            ) : '✨'}
                        </div>
                    </button>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100/10 rounded-full blur-3xl -ml-24 -mb-24"></div>
            </header>
        );
    }, [profile, isRefreshing]);

    // -------------------------------------------------------------------------
    // 5. RENDER LOGIC
    // -------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
                <div className="relative mb-6">
                    <div className="w-24 h-24 border-[6px] border-rose-50 border-t-rose-400 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🌱</div>
                </div>
                <p className="text-[11px] font-black text-rose-400 uppercase tracking-[0.5em] animate-pulse">
                    Aligning your Barakah...
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-40 selection:bg-rose-100 animate-in fade-in duration-1000">
            
            {/* RENDER MEMOIZED HEADER */}
            {DashboardHeader}

            {/* NOTIFICATION SECTION */}
            {/* Integrated with the NotificationCenter.jsx component in your components folder */}
            <div className="max-w-5xl mx-auto px-6 mb-12">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-rose-100 to-orange-100 rounded-[3.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                    <div className="relative bg-white/70 backdrop-blur-md rounded-[3.5rem] p-4 border border-white shadow-sm">
                        <NotificationCenter userId={session.user.id} />
                    </div>
                </div>
            </div>

            {/* PRIMARY CONTENT SECTIONS */}
            <main className="max-w-5xl mx-auto px-6 space-y-16">
                
                {/* SECTION: PROGRESS TRACKING */}
                <section className="animate-in slide-in-from-bottom-10 duration-1000">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 mb-8 gap-4">
                        <div>
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Daily Tracker
                            </h3>
                            <p className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">Monitor your spiritual habits</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                            <span className="text-[10px] font-black text-slate-300 px-2 uppercase">Last Sync:</span>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-xl">
                                {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-[4rem] p-4 shadow-sm border border-slate-50 hover:shadow-lg transition-all duration-500">
                        <DeedTracker userId={session.user.id} />
                    </div>
                </section>

                {/* SECTION: SPIRITUAL TOOLS */}
                <section className="animate-in slide-in-from-bottom-12 duration-1000 delay-200">
                    <div className="flex justify-between items-end px-6 mb-8">
                        <div>
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Essential Tools
                            </h3>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider italic">Guided resources for every sister</p>
                        </div>
                        {profile.subscription_tier !== 'pro' && (
                            <button className="text-[10px] font-black text-rose-500 bg-rose-50 px-6 py-3 rounded-full hover:bg-rose-500 hover:text-white transition-all duration-300 uppercase tracking-widest shadow-sm">
                                Explore Pro
                            </button>
                        )}
                    </div>
                    
                    <div className="px-2">
                        <ToolGrid tier={profile.subscription_tier} />
                    </div>
                </section>

                {/* ERROR STATE VIEW */}
                {error && (
                    <div className="mx-6 p-8 bg-rose-50/30 rounded-[3rem] border-2 border-dashed border-rose-100 text-center animate-in zoom-in duration-500">
                        <div className="text-2xl mb-2">📡</div>
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">
                            Connection Alert
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-[9px] font-black text-white bg-slate-800 px-8 py-3 rounded-2xl uppercase tracking-[0.2em] active:scale-95 transition-all"
                        >
                            Refresh App
                        </button>
                    </div>
                )}
            </main>

            {/* DECORATIVE FOOTER ELEMENT */}
            <footer className="fixed bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#FDFCFB] via-[#FDFCFB]/80 to-transparent pointer-events-none z-0">
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-20">
                    <div className="w-1 h-10 bg-gradient-to-b from-transparent to-rose-300 rounded-full"></div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.6em]">Barakah v2.0</p>
                </div>
            </footer>
        </div>
    );
}