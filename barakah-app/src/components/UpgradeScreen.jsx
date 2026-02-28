import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function UpgradeScreen({ userId, onBack }) {
    const [plan, setPlan] = useState('lite');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async () => {
        if (!file) return alert("Please upload your payment screenshot!");
        setUploading(true);

        // 1. Upload screenshot to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, file);

        if (uploadError) {
            alert("Upload failed. Try again!");
        } else {
            // 2. Create a pending subscription request
            await supabase.from('payment_requests').insert([{
                user_id: userId,
                tier: plan,
                screenshot_url: fileName,
                status: 'pending'
            }]);
            alert("Proof submitted! Admin will verify within 2-4 hours. ✨");
            onBack();
        }
        setUploading(false);
    };

    return (
        <div className="min-h-screen bg-white p-8 animate-in slide-in-from-right duration-500">
            <button onClick={onBack} className="mb-6 font-black text-rose-500 uppercase text-[10px] tracking-widest">← Back</button>
            
            <h2 className="text-3xl font-black text-slate-900 mb-2">Upgrade Your Journey</h2>
            <p className="text-slate-500 font-medium mb-8">Support the platform and unlock premium spiritual tools.</p>

            {/* Plan Selector */}
            <div className="flex gap-4 mb-10">
                {['lite', 'pro'].map(p => (
                    <button 
                        key={p} onClick={() => setPlan(p)}
                        className={`flex-1 p-6 rounded-[2rem] border-2 transition-all ${plan === p ? 'border-rose-500 bg-rose-50/50' : 'border-slate-100'}`}
                    >
                        <p className="font-black uppercase text-[10px] tracking-widest mb-1">{p}</p>
                        <p className="text-xl font-black text-slate-800">Rs. {p === 'lite' ? '250' : '599'}</p>
                    </button>
                ))}
            </div>

            {/* Payment Details Box */}
            <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] mb-8 shadow-xl">
                <p className="text-[10px] font-black uppercase text-rose-400 mb-4 tracking-widest">Payment Method</p>
                <div className="space-y-4">
                    <div className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold opacity-60">Easypaisa / JazzCash</span>
                        <span className="text-sm font-black text-rose-100">0300-XXXXXXX</span>
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-50 italic">Please send the exact amount and upload a clear screenshot of the receipt below.</p>
                </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-4">
                <input 
                    type="file" accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-4 file:px-8 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100"
                />
                
                <button 
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full py-5 bg-rose-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-100 active:scale-95 transition-all disabled:opacity-50"
                >
                    {uploading ? "TRANSMITTING..." : "SUBMIT PROOF"}
                </button>
            </div>
        </div>
    );
}