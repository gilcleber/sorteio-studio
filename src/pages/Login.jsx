import React, { useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, Lock, Mail, Trophy, ArrowRight, Loader2, Radio, ShieldCheck } from 'lucide-react'

const Login = () => {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // Modo Discreto: AdminLogin oculto por padrão
    const [showAdmin, setShowAdmin] = useState(false)
    const [radioSlug, setRadioSlug] = useState('')

    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) throw error
            navigate('/') // Redireciona para o painel
        } catch (error) {
            setError(error.message === "Invalid login credentials" ? "Email ou senha incorretos." : error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleRadioAccess = (e) => {
        e.preventDefault()
        if (!radioSlug) return
        // Redireciona para a rota de login da rádio
        window.location.href = `#/radio/${radioSlug.toLowerCase().trim()}`
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 font-sans relative overflow-hidden">

            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-900/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl w-full max-w-md relative z-10">

                <div className="text-center mb-6">
                    <div className="bg-purple-900/30 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4 border border-purple-500/30 shadow-lg shadow-purple-900/20">
                        <Trophy className="w-10 h-10 text-purple-400" />
                    </div>
                    <h1 className="text-3xl font-black text-white">Sorteio Studio</h1>
                    <p className="text-gray-400 mt-2 text-sm">{showAdmin ? 'Acesso Administrativo' : 'Área do Cliente'}</p>
                </div>

                {error && (
                    <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-3 rounded-lg text-sm mb-6 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> {error}
                    </div>
                )}

                {showAdmin ? (
                    // FORMULÁRIO DE LOGIN ADMIN/MASTER
                    <form onSubmit={handleLogin} className="space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Master</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-10 py-3 text-white focus:border-purple-500 outline-none transition-all placeholder-gray-600"
                                    placeholder="admin@master.com"
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-black/50 border border-gray-700 rounded-xl px-10 py-3 text-white focus:border-purple-500 outline-none transition-all placeholder-gray-600"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Acessar Painel <ShieldCheck className="w-5 h-5" /></>}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowAdmin(false)}
                            className="w-full text-gray-500 text-sm hover:text-white mt-4"
                        >
                            Voltar para Acesso Rádio
                        </button>
                    </form>
                ) : (
                    // FORMULÁRIO DE ACESSO RÁDIO (PADRÃO)
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50">
                            <label className="block text-sm font-bold text-gray-300 mb-3 text-center">Digite o nome do seu link</label>
                            <form onSubmit={handleRadioAccess} className="flex flex-col gap-3">
                                <div className="relative">
                                    <span className="absolute left-3 top-3.5 text-gray-500 text-sm font-mono">/radio/</span>
                                    <input
                                        type="text"
                                        value={radioSlug}
                                        onChange={e => setRadioSlug(e.target.value)}
                                        className="w-full bg-black/50 border border-gray-600 rounded-xl pl-16 pr-4 py-3 text-white focus:border-purple-500 outline-none font-mono tracking-wide"
                                        placeholder="rbcampinas"
                                        required
                                    />
                                </div>
                                <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-green-900/20 flex items-center justify-center gap-2">
                                    <Radio className="w-4 h-4" /> Entrar
                                </button>
                            </form>
                        </div>

                        <div className="flex justify-center pt-4">
                            <button
                                onClick={() => setShowAdmin(true)}
                                className="text-xs text-gray-700 hover:text-gray-500 transition-colors flex items-center gap-1 opacity-50 hover:opacity-100"
                                title="Acesso Administrativo"
                            >
                                <Lock className="w-3 h-3" /> Acesso Master
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

export default Login
