import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import NotificationCenter from './NotificationCenter'; 
import DeedTracker from './DeedTracker'; 
import ToolGrid from './Tools';

/**
 * ============================================================================
 * COMPONENT: Dashboard
 * DESCRIPTION: The primary landing interface for authenticated sisters.
 * This component manages the holistic state of the user's spiritual journey,
 * including profile metadata, subscription tiers, and real-time alerts.
 * ============================================================================
 */
export default function Dashboard({ session }) {
    // -------------------------------------------------------------------------
    // 1. STATE INITIALIZATION
    // -------------------------------------------------------------------------
    
    // Core profile data retrieved from the 'profiles' table
    const [profile, setProfile] = useState({
        id: null,
        username: 'Sister',
        subscription_tier: 'free',
        role: 'user',
        created_at: null,
        avatar_url: null
    });

    // Tracking the synchronization status with the Supabase backend
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Error handling state for UI feedback
    const [error, setError] = useState(null);
    const [lastSynced, setLastSynced] = useState(new Date());

    // -------------------------------------------------------------------------
    // 2. DATA FETCHING & SYNC LOGIC
    // -------------------------------------------------------------------------

    /**
     * getProfile: Fetches the most recent user data from the database.
     * Implements explicit error checking for RLS policy failures.
     */
    const getProfile = useCallback(async () => {
        try {
            if (!session?.user?.id) {
                throw new Error("Critical Auth Error: No user session detected.");
            }

            const { data, error: profileError, status } = await supabase
                .from('profiles')
                .select(`
                    id, 
                    username, 
                    subscription_tier, 
                    role, 
                    created_at,
                    avatar_url
                `)
                .eq('id', session.user.id)
                .single();

            if (profileError && status !== 406) {
                console.error('Fetch Error:', profileError.message);
                throw profileError;
            }

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
            console.error('Context Hook Error:', err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [session]);

    // -------------------------------------------------------------------------
    // 3. SIDE EFFECTS
    // -------------------------------------------------------------------------

    // Primary effect hook to trigger data loading on mount
    useEffect(() => {
        let isMounted = true;

        if (isMounted) {
            getProfile();
        }

        // Cleanup function to prevent memory leaks on unmount
        return () => {
            isMounted = false;
        };
    }, [getProfile]);

    /**
     * handleManualRefresh: Triggered by user interaction with the UI
     */
    const handleManualRefresh = async () => {
        setIsRefreshing(true);
        await getProfile();
    };

    // -------------------------------------------------------------------------
    // 4. MEMOIZED UI FRAGMENTS
    // -------------------------------------------------------------------------

    const renderHeader = useMemo(() => {
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
                                {profile.subscription_tier === 'pro' ? '★ Pro Member' : 'Lite Member'}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleManualRefresh}
                        disabled={isRefreshing}
                        className="relative group focus:outline-none focus:ring-4 focus:ring-rose-50 rounded-[2.5rem] transition-all"
                    >
                        <div className={`w-20 h-20 bg-gradient-to-br from-rose-50 via-white to-orange-50 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-sm border border-rose-100/50 group-hover:scale-105 group-active:scale-95 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-[2.5rem]" />
                            ) : '✨'}
                        </div>
                    </button>
                </div>
                {/* Decorative Background Blur */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-100/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            </header>
        );
    }, [profile, isRefreshing]);

    // -------------------------------------------------------------------------
    // 5. CONDITIONAL RENDERING (LOADING STATE)
    // -------------------------------------------------------------------------

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB] p-12 text-center">
                <div className="relative mb-8">
                    <div className="w-24 h-24 border-[6px] border-rose-50 border-t-rose-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🌿</div>
                </div>
                <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-[0.5em] mb-2">Initializing</h2>
                <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest animate-pulse">Your Spiritual Workspace is Loading...</p>
            </div>
        );
    }

    // -------------------------------------------------------------------------
    // 6. MAIN COMPONENT BODY
    // -------------------------------------------------------------------------

    return (
        <div className="min-h-screen bg-[#FDFCFB] pb-40 selection:bg-rose-100 animate-in fade-in duration-1000">
            
            {/* INJECTED HEADER VIEW */}
            {renderHeader}

            {/* NOTIFICATION LAYER */}
            {/* This listens for the SQL triggers on the backend for instant approval feedback */}
            <div className="max-w-5xl mx-auto px-6 mb-12">
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-rose-100 to-orange-100 rounded-[3.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                    <div className="relative bg-white/60 backdrop-blur-md rounded-[3.5rem] p-3 border border-white">
                        <NotificationCenter userId={session.user.id} />
                    </div>
                </div>
            </div>

            {/* PRIMARY DASHBOARD GRID */}
            <main className="max-w-5xl mx-auto px-6 space-y-16">
                
                {/* SECTION: PROGRESS TRACKING */}
                <section className="animate-in slide-in-from-bottom-10 duration-1000 fill-mode-both">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-6 mb-8 gap-4">
                        <div>
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Spiritual Accountability
                            </h3>
                            <p className="text-[10px] text-rose-300 font-bold uppercase tracking-wider">Tracking your daily deeds for Jannah</p>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-50">
                            <span className="text-[10px] font-black text-slate-400 px-2 uppercase">Sync:</span>
                            <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">
                                {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                    
                    <div className="bg-white rounded-[4rem] p-4 shadow-sm border border-slate-100/50 hover:shadow-md transition-shadow duration-500">
                        <DeedTracker userId={session.user.id} />
                    </div>
                </section>

                {/* SECTION: RESOURCE TOOLS */}
                <section className="animate-in slide-in-from-bottom-12 duration-1000 delay-200 fill-mode-both">
                    <div className="flex justify-between items-end px-6 mb-8">
                        <div>
                            <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">
                                Barakah Toolbox
                            </h3>
                            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider italic">Premium tools for a mindful life</p>
                        </div>
                        {profile.subscription_tier !== 'pro' && (
                            <button className="group flex items-center gap-2 text-[10px] font-black text-rose-500 bg-rose-50 px-6 py-3 rounded-full hover:bg-rose-500 hover:text-white transition-all duration-300 uppercase tracking-widest shadow-sm">
                                Upgrade Plan
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        )}
                    </div>
                    
                    <div className="px-2">
                        <ToolGrid tier={profile.subscription_tier} />
                    </div>
                </section>

                {/* ERROR FEEDBACK OVERLAY */}
                {error && (
                    <div className="mx-6 p-8 bg-white rounded-[3rem] border-2 border-dashed border-rose-200 text-center shadow-xl shadow-rose-100/20 animate-bounce">
                        <div className="text-3xl mb-3">⚠️</div>
                        <p className="text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] mb-2">
                            Synchronization Issue
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="text-[9px] font-black text-white bg-slate-900 px-8 py-3 rounded-2xl uppercase tracking-[0.3em] hover:bg-slate-800 transition-colors"
                        >
                            Reconnect
                        </button>
                    </div>
                )}
            </main>

            {/* ARTISTIC FOOTER SPACER */}
            <footer className="fixed bottom-0 left-0 w-full h-48 bg-gradient-to-t from-[#FDFCFB] via-[#FDFCFB]/90 to-transparent pointer-events-none z-0">
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
                    <div className="w-1 h-8 bg-gradient-to-b from-transparent to-rose-200 rounded-full"></div>
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.6em]">Nisa Al-Huda</p>
                </div>
            </footer>
        </div>
    );
}