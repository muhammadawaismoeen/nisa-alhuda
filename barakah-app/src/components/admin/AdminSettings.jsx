import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminSettings() {
    const [settings, setSettings] = useState({
        trial_period_days: 7,
        features_locked_after_trial: true
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        try {
            const { data, error } = await supabase
                .from('global_settings')
                .select('*')
                .eq('id', 'config')
                .single();

            if (data) {
                setSettings(data);
            }
        } catch (err) {
            console.error("Error fetching settings:", err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateSettings() {
        setMessage("Updating...");
        try {
            const { error } = await supabase
                .from('global_settings')
                .update({
                    trial_period_days: settings.trial_period_days,
                    features_locked_after_trial: settings.features_locked_after_trial
                })
                .eq('id', 'config');

            if (error) throw error;
            setMessage("Settings saved successfully! ✅");
            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            alert("Update failed: " + err.message);
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
    );

    return (
        <div className="max-w-md mx-auto bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 mt-10 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <span className="p-2 bg-rose-50 rounded-xl text-lg">⚙️</span> 
                    Trial Config
                </h2>
                <span className="text-[9px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                    System Global
                </span>
            </div>

            {message && (
                <div className="mb-6 p-4 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl text-center shadow-lg shadow-emerald-200/50 animate-bounce">
                    {message}
                </div>
            )}

            <div className="space-y-8">
                {/* Trial Duration Input */}
                <div className="relative">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] block mb-3 ml-2">
                        Trial Length (Days)
                    </label>
                    <div className="relative">
                        <input 
                            type="number"
                            value={settings.trial_period_days}
                            onChange={(e) => setSettings({...settings, trial_period_days: parseInt(e.target.value) || 0})}
                            className="w-full bg-gray-50 border-2 border-gray-50 p-5 rounded-[1.5rem] font-black text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all text-xl"
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 uppercase">Days</span>
                    </div>
                </div>

                {/* Feature Lock Toggle */}
                <div className="flex items-center justify-between bg-gray-50 p-6 rounded-[1.5rem] border border-gray-100 group hover:border-rose-200 transition-colors">
                    <div className="pr-4">
                        <p className="text-xs font-black text-gray-800 uppercase tracking-tight">Hard-Lock Features</p>
                        <p className="text-[10px] text-gray-500 font-medium mt-1 leading-tight">
                            Users cannot access challenges or points after trial expires.
                        </p>
                    </div>
                    <button 
                        onClick={() => setSettings({...settings, features_locked_after_trial: !settings.features_locked_after_trial})}
                        className={`w-14 h-7 rounded-full transition-all duration-300 relative shadow-inner ${settings.features_locked_after_trial ? 'bg-rose-500' : 'bg-gray-300'}`}
                    >
                        <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${settings.features_locked_after_trial ? 'translate-x-8' : 'translate-x-1'}`} />
                    </button>
                </div>

                {/* Save Button */}
                <div className="pt-4">
                    <button 
                        onClick={handleUpdateSettings}
                        className="w-full bg-gray-900 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                        Save Settings
                    </button>
                    
                    <p className="text-[9px] text-gray-400 font-bold text-center mt-6 uppercase tracking-widest opacity-60">
                        Changes apply to all active users
                    </p>
                </div>
            </div>
        </div>
    );
}