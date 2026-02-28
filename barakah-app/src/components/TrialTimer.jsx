import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TrialTimer({ profile }) {
    const [timeLeft, setTimeLeft] = useState(null);
    const [trialDays, setTrialDays] = useState(0);

    useEffect(() => {
        const calculateTime = async () => {
            // 1. Fetch the latest trial days from admin settings
            const { data: settings } = await supabase
                .from('global_settings')
                .select('trial_period_days')
                .eq('id', 'config')
                .single();

            if (!settings || !profile?.trial_started_at) return;

            const daysAllowed = settings.trial_period_days;
            setTrialDays(daysAllowed);

            const startDate = new Date(profile.trial_started_at);
            const endDate = new Date(startDate.getTime() + daysAllowed * 24 * 60 * 60 * 1000);
            
            const updateTimer = () => {
                const now = new Date();
                const diff = endDate - now;

                if (diff <= 0) {
                    setTimeLeft("Expired");
                    // Logic to update status to 'expired' in DB could go here
                } else {
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
                    const m = Math.floor((diff / 1000 / 60) % 60);
                    setTimeLeft(`${d}d ${h}h ${m}m`);
                }
            };

            updateTimer();
            const timerId = setInterval(updateTimer, 60000); // Update every minute
            return () => clearInterval(timerId);
        };

        calculateTime();
    }, [profile]);

    if (!timeLeft || profile?.subscription_tier === 'pro') return null;

    return (
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 text-white p-4 rounded-3xl shadow-lg mb-6">
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Free Trial Ending In</p>
                    <h2 className="text-2xl font-black tabular-nums">{timeLeft}</h2>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                        {trialDays} Day Access
                    </p>
                </div>
            </div>
            {timeLeft === "Expired" ? (
                <button className="w-full mt-3 bg-white text-rose-600 py-2 rounded-xl font-black text-[10px] uppercase">
                    Upgrade to Pro Now
                </button>
            ) : (
                <div className="w-full bg-black/10 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-white h-full transition-all duration-1000" style={{ width: '60%' }}></div>
                </div>
            )}
        </div>
    );
}