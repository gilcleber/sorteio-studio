import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { motion } from 'framer-motion'
import { Trophy, Gift, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function PaginaParticipacao() {
    const { slug } = useParams()
    const [sorteio, setSorteio] = useState(null)
    const [brinde, setBrinde] = useState(null)
    const [patrocinadores, setPatrocinadores] = useState([])
    const [configForm, setConfigForm] = useState(null)
    
    // UI State
    const [loading, setLoading] = useState(true)
    const [enviando, setEnviando] = useState(false)
    const [success, setSuccess] = useState(false)
    
    // Form Data
    const [formData, setFormData] = useState({ nome: '', telefone: '', email: '', cpf: '', cidade: '', instagram: '' })
    const [customFields, setCustomFields] = useState({})

    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch Sorteio Config/Params na tabela Host (Historico)
            const { data: sortData, error } = await supabase.from('app_historico').select('*').eq('slug', slug).single()
            if (error || !sortData) { setLoading(false); return } 
            setSorteio(sortData)

            // 2. Fetch Brinde Detail Extra Info (se aplicável na rodada)
            if (sortData.premio) {
                const { data: brindeData } = await supabase.from('app_brindes').select('*').eq('user_id', sortData.user_id).eq('nome_brinde', sortData.premio).single()
                if (brindeData) setBrinde(brindeData)
            }

            // 3. Opcional: Patrocinadores Livres vinculados ao evento
            const { data: patData } = await supabase.from('app_patrocinadores').select('*').eq('sorteio_id', sortData.id)
            if (patData) setPatrocinadores(patData)

            // 4. Form Rules
            const { data: cfgData } = await supabase.from('app_formulario_config').select('*').eq('radio_id', sortData.user_id).single()
            if (cfgData) setConfigForm(cfgData)

            setLoading(false)
        }
        fetchData()
    }, [slug])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setEnviando(true)

        // Aglomera dados extras preenchidos e não triviais no JSON detalhes
        const detalhes = {
             origem: 'qrcode_web',
             sorteio_slug: slug,
             instagram: formData.instagram,
             ...customFields
        }

        // Insere o cidadão na caixa de participantes ativos daquele usuário/logista
        const { error } = await supabase.from('app_participantes').insert({
            user_id: sorteio.user_id,
            nome: formData.nome,
            telefone: formData.telefone,
            cpf: formData.cpf,
            email: formData.email,
            cidade: formData.cidade,
            detalhes
        })

        setEnviando(false)
        if (!error) {
            setSuccess(true)
        } else {
            alert("Erro ao enviar inscrição. Pode ser um erro de segurança ou falha de conexão. Tente novamente.")
        }
    }

    if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center font-mono text-purple-500 animate-pulse">Sincronizando Sorteio...</div>
    if (!sorteio) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-red-500 font-bold text-xl px-4 text-center">Inscrições Encerradas ou Link Inválido 🚫</div>

    const isSuccess = success
    
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8 font-sans">
            <motion.div 
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} 
               className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
                {/* HEAD VISUAL: Foto Dinâmica ou Ícone */}
                {brinde?.imagem_url ? (
                    <div className="w-full h-56 bg-gray-200 relative group">
                        <img src={brinde.imagem_url} alt={brinde.nome_brinde} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-end p-6">
                             <h1 className="text-white font-black text-3xl leading-tight drop-shadow-md">{brinde.nome_brinde}</h1>
                             <span className="text-white/80 text-xs font-medium uppercase tracking-widest mt-1">Prêmio Oficial</span>
                        </div>
                    </div>
                ) : (
                    <div className="w-full bg-gradient-to-tr from-purple-700 to-indigo-600 p-10 text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <Trophy className="w-16 h-16 text-yellow-300 mx-auto mb-4 drop-shadow-lg" />
                        <h1 className="text-white font-black text-3xl drop-shadow-md leading-tight">{sorteio.premio || "Participe do Sorteio"}</h1>
                        <span className="inline-block mt-3 bg-white/20 text-white text-xs px-3 py-1 rounded-full font-bold backdrop-blur-md">Válido para hoje</span>
                    </div>
                )}

                {/* PATROCÍNIO (Sponsorship Banner) */}
                {patrocinadores.length > 0 && (
                    <div className="bg-gray-100 px-6 py-4 flex gap-4 items-center overflow-x-auto border-b border-gray-200 hide-scrollbar">
                        <span className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap shrink-0">Apoio:</span>
                        {patrocinadores.map(p => (
                            <a key={p.id} href={p.link || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:bg-white rounded-lg p-1.5 transition-all opacity-80 hover:opacity-100 shadow-sm border border-transparent hover:border-gray-200">
                                {p.logo_url && <img src={p.logo_url} className="h-6 w-6 rounded object-cover" alt={p.nome} />}
                                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{p.nome}</span>
                            </a>
                        ))}
                    </div>
                )}

                <div className="p-6 md:p-8">
                    {brinde?.descricao && !isSuccess && (
                        <p className="text-sm text-gray-600 mb-8 flex items-start gap-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100 leading-relaxed">
                            <Gift className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                            {brinde.descricao}
                        </p>
                    )}

                    {isSuccess ? (
                        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight">Participação<br/>Confirmada!</h2>
                            <p className="text-gray-500 mb-8 font-medium px-4">{configForm?.acao_pos_participacao?.mensagem || "Obrigado! Seu nome já está na caixa virtual do sorteio. Fique ligado!"}</p>
                            
                            <div className="space-y-3">
                                {configForm?.acao_pos_participacao?.instagram_url && (
                                    <a href={configForm.acao_pos_participacao.instagram_url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-bold py-4 px-6 rounded-2xl w-full flex items-center justify-center gap-2 shadow-xl shadow-pink-500/25 hover:scale-[1.02] transition-transform">
                                        Seguir nosso Instagram ❤️
                                    </a>
                                )}
                                {configForm?.acao_pos_participacao?.link_externo && (
                                    <a href={configForm.acao_pos_participacao.link_externo} target="_blank" rel="noreferrer" className="bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl w-full flex items-center justify-center shadow-lg hover:bg-black transition-colors">
                                        Visitar Site / Loja
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                <div className="group">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-purple-600 transition-colors">Nome Completo *</label>
                                    <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} type="text" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium text-gray-800 placeholder-gray-400" placeholder="Digite seu nome completo" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-purple-600 transition-colors">WhatsApp *</label>
                                        <input required value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} type="tel" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium text-gray-800 placeholder-gray-400" placeholder="(DDD) 90000-0000" />
                                    </div>
                                    <div className="group">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-purple-600 transition-colors">Sua Cidade *</label>
                                        <input required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} type="text" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium text-gray-800 placeholder-gray-400" placeholder="Onde você mora?" />
                                    </div>
                                </div>
                                
                                <div className="group">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-purple-600 transition-colors">Seu @ Instagram (Opcional)</label>
                                    <input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} type="text" className="w-full bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3.5 focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 outline-none transition-all font-medium text-gray-800 placeholder-gray-400" placeholder="@seuperfil" />
                                </div>
                            </div>

                            <button disabled={enviando} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-lg py-4 rounded-xl shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 mt-8 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0 cursor-pointer disabled:cursor-not-allowed">
                                {enviando ? 'Verificando...' : 'FINALIZAR INSCRIÇÃO'} {!enviando && <ArrowRight className="w-5 h-5 ml-1" />}
                            </button>
                            <p className="text-[10px] text-center text-gray-400 mt-4">Ao participar você concorda com o regulamento do Sorteio.</p>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
