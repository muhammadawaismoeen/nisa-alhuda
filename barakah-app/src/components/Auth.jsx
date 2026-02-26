import { useState } from 'react'
import { supabase } from '../supabaseClient'

// Using your official logo from the public folder
const BrandLogo = () => (
    <div className="flex flex-col items-center mb-8">
        <img 
            src="/logo.png" 
            alt="Nisa Al-Huda Logo" 
            className="w-48 h-auto drop-shadow-lg"
        />
        <h1 className="text-xl font-black tracking-[0.3em] uppercase text-white mt-4">
            Women of Guidance
        </h1>
    </div>
);

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [username, setUsername] = useState('')
    const [city, setCity] = useState('')

    const handleAuth = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { username, city } }
                })
                if (error) throw error
                alert('Account created! Please check your email.')
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password })
                if (error) throw error
            }
        } catch (error) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-rose-500 flex flex-col items-center justify-center px-6 font-sans">
            <BrandLogo />
            
            <div className="w-full max-w-md bg-white/10 backdrop-blur-lg rounded-[3rem] p-8 border border-white/20 shadow-2xl">
                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
                        <>
                            <input
                                className="w-full px-6 py-4 rounded-2xl bg-white/20 border-none text-white placeholder-white/60 text-sm font-bold outline-none focus:ring-2 focus:ring-white/40"
                                type="text"
                                placeholder="Your Name"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                            <input
                                className="w-full px-6 py-4 rounded-2xl bg-white/20 border-none text-white placeholder-white/60 text-sm font-bold outline-none focus:ring-2 focus:ring-white/40"
                                type="text"
                                placeholder="City"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                required
                            />
                        </>
                    )}
                    <input
                        className="w-full px-6 py-4 rounded-2xl bg-white/20 border-none text-white placeholder-white/60 text-sm font-bold outline-none focus:ring-2 focus:ring-white/40"
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        className="w-full px-6 py-4 rounded-2xl bg-white/20 border-none text-white placeholder-white/60 text-sm font-bold outline-none focus:ring-2 focus:ring-white/40"
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    
                    <button
                        className="w-full bg-white text-rose-500 font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
                    </button>
                </form>

                <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="w-full mt-6 text-[10px] font-black text-white uppercase tracking-widest opacity-80 hover:opacity-100"
                >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
            </div>
            <p className="mt-8 text-[10px] font-bold text-white/40 uppercase tracking-[0.3em]">Built for the Ummah</p>
        </div>
    )
}