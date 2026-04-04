import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { motion } from 'framer-motion'
import { Trophy, Gift, ArrowRight, CheckCircle2, User, Phone, MapPin, Hash, AtSign, Instagram } from 'lucide-react'
import confetti from 'canvas-confetti'

export default function PaginaParticipacao() {
    const { slug } = useParams()
    const [sorteio, setSorteio] = useState(null)
    const [sorteioStatus, setSorteioStatus] = useState('loading') // loading, not_found, encerrado, ativo
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
            const { data: sortData, error } = await supabase.from('app_eventos').select('*').eq('slug', slug).eq('ativo', true).maybeSingle()
            if (error || !sortData) { 
                setSorteioStatus('not_found')
                setLoading(false); 
                return 
            } 
            
            setSorteio(sortData)
            setSorteioStatus('ativo')

            if (sortData.premio_id) {
                const { data: brindeData } = await supabase.from('app_brindes').select('*').eq('id', sortData.premio_id).single()
                if (brindeData) setBrinde(brindeData)
            }

            const { data: patData } = await supabase.from('app_patrocinadores').select('*').eq('sorteio_id', sortData.id)
            if (patData) setPatrocinadores(patData)

            const { data: cfgData } = await supabase.from('app_formulario_config').select('*').eq('evento_id', sortData.id).single()
            if (cfgData) setConfigForm(cfgData)

            setLoading(false)
        }
        fetchData()
    }, [slug])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setEnviando(true)

        const detalhes = {
             origem: 'qrcode_web',
             sorteio_slug: slug,
             instagram: formData.instagram,
             email: formData.email,
             ...customFields
        }

        const { error } = await supabase.from('app_participantes').insert({
            evento_id: sorteio.id,
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
            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 }
            })
        } else {
            alert("Erro ao enviar inscrição. Pode ser um erro de segurança ou falha de conexão. Tente novamente.")
        }
    }

    if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center font-mono text-purple-500 animate-pulse">Sincronizando Sorteio...</div>
    if (sorteioStatus === 'not_found') return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-red-500 font-bold px-4 text-center"><Trophy className="w-16 h-16 mb-4 text-gray-800" /> Ops! Este Sorteio não foi encontrado ou o link é inválido. 🚫</div>
    if (sorteioStatus === 'encerrado') return <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-yellow-500 font-bold px-4 text-center"><CheckCircle2 className="w-16 h-16 mb-4 text-yellow-600" /> Este Sorteio já foi encerrado e teve seu Ganhador sorteado! 🎉</div>

    const isSuccess = success
    const corTema = configForm?.acao_pos_participacao?.corTema || '#6b21a8'
    const hasCustomConfig = configForm && configForm.campos && configForm.campos.length > 0
    const activeCampos = hasCustomConfig ? configForm.campos.filter(c => c.active) : []

    // Helper para verificar se campo deve renderizar
    const shouldRender = (id) => {
        if (!hasCustomConfig) return false; // Se n tem config customizada, o fallback não cobre CPF/email
        return activeCampos.some(c => c.id === id);
    }
    
    // Label fallback
    const getFieldLabel = (id, fallback) => {
        if (!hasCustomConfig) return fallback;
        const field = activeCampos.find(c => c.id === id);
        return field ? field.label : fallback;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 md:p-8 font-sans">
            <motion.div 
               initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
               className="bg-white max-w-md w-full rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col"
            >
                {/* HEADER COM COR TEMA */}
                {brinde?.imagem_url ? (
                    <div className="w-full h-64 bg-gray-200 relative group">
                        <img src={brinde.imagem_url} alt={brinde.nome_brinde} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent flex flex-col justify-end p-6">
                            <span className="text-white/90 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Concorra a</span>
                            <h1 className="text-white font-black text-3xl leading-tight drop-shadow-lg">{brinde.nome_brinde}</h1>
                        </div>
                    </div>
                ) : (
                    <div className="w-full p-10 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]" style={{ backgroundColor: corTema, backgroundImage: `linear-gradient(135deg, ${corTema} 0%, #00000040 100%)` }}>
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
                        <Trophy className="w-16 h-16 text-yellow-300 drop-shadow-xl mb-4" />
                        <h1 className="text-white font-black text-3xl drop-shadow-md leading-tight mt-2">{sorteio.titulo || "Sorteio Oficial"}</h1>
                        <span className="inline-block mt-3 bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-bold backdrop-blur-md uppercase tracking-wider">Válido para hoje</span>
                    </div>
                )}

                {patrocinadores.length > 0 && (
                    <div className="bg-gray-50 px-6 py-3.5 flex gap-4 items-center overflow-x-auto border-b border-gray-100 hide-scrollbar shrink-0">
                        <span className="text-[10px] uppercase font-bold text-gray-400 whitespace-nowrap">Apoio:</span>
                        {patrocinadores.map(p => (
                            <a key={p.id} href={p.link || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-white rounded-xl p-1.5 pr-3 shadow-sm border border-gray-200 hover:border-gray-300 transition-colors">
                                {p.logo_url && <img src={p.logo_url} className="h-6 w-6 rounded-lg object-cover" alt={p.nome} />}
                                <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{p.nome}</span>
                            </a>
                        ))}
                    </div>
                )}

                <div className="p-6 md:p-8 grow">
                    {brinde?.descricao && !isSuccess && (
                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8 flex items-start gap-3">
                            <Gift className="w-5 h-5 shrink-0 mt-0.5" style={{ color: corTema }} />
                            <p className="text-sm text-gray-600 leading-relaxed font-medium">{brinde.descricao}</p>
                        </div>
                    )}

                    {isSuccess ? (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
                            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <CheckCircle2 className="w-12 h-12 text-green-500" />
                            </div>
                            <h2 className="text-3xl font-black text-gray-800 mb-3 tracking-tight">Sucesso!</h2>
                            <p className="text-gray-500 mb-8 font-medium px-4 text-sm leading-relaxed">{configForm?.acao_pos_participacao?.mensagem || "Pronto! Você já está concorrendo. Fique de olho!"}</p>
                            
                            <div className="space-y-3">
                                {configForm?.acao_pos_participacao?.instagram_url && (
                                    <a href={configForm.acao_pos_participacao.instagram_url} target="_blank" rel="noreferrer" className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-bold py-4 px-6 rounded-2xl w-full flex items-center justify-center gap-2 shadow-xl shadow-pink-500/25 hover:scale-[1.02] transition-transform">
                                        <Instagram className="w-5 h-5" /> Seguir Instagram
                                    </a>
                                )}
                                {configForm?.acao_pos_participacao?.link_externo && (
                                    <a href={configForm.acao_pos_participacao.link_externo} target="_blank" rel="noreferrer" className="bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl w-full flex items-center justify-center shadow-lg hover:bg-black transition-colors">
                                        Site Oficial
                                    </a>
                                )}
                            </div>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-4">
                                {/* OBRIGATÓRIOS (Nome, Whats, Cidade) */}
                                <div className="group relative">
                                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('nome', 'Nome Completo *')}</label>
                                    <div className="relative">
                                        <User className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                        <input required value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} type="text" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="Como quer ser chamado?" />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('telefone', 'WhatsApp *')}</label>
                                        <div className="relative">
                                            <Phone className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                            <input required value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} type="tel" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="(00) 90000-0000" />
                                        </div>
                                    </div>

                                    <div className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('cidade', 'Cidade *')}</label>
                                        <div className="relative">
                                            <MapPin className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                            <input required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} type="text" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="Sua cidade" />
                                        </div>
                                    </div>
                                </div>

                                {/* OPCIONAIS */}
                                {shouldRender('cpf') && (
                                    <div className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('cpf', 'CPF')}</label>
                                        <div className="relative">
                                            <Hash className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                            <input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} type="text" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="000.000.000-00" />
                                        </div>
                                    </div>
                                )}

                                {shouldRender('email') && (
                                    <div className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('email', 'E-mail')}</label>
                                        <div className="relative">
                                            <AtSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                            <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="seu@email.com" />
                                        </div>
                                    </div>
                                )}
                                
                                {(shouldRender('instagram') || !hasCustomConfig) /* Insta era field opcional ms fallback default tinha ele livre. Pra seguir restrito: */ && shouldRender('instagram') && (
                                    <div className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{getFieldLabel('instagram', 'Instagram')}</label>
                                        <div className="relative">
                                            <Instagram className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }} />
                                            <input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} type="text" className="w-full bg-white border-2 border-gray-200 rounded-2xl pl-12 pr-4 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder="@seuperfil" />
                                        </div>
                                    </div>
                                )}

                                {/* CUSTOM FIELDS */}
                                {hasCustomConfig && activeCampos.filter(c => c.id.startsWith('custom_')).map(customCamp => (
                                    <div key={customCamp.id} className="group relative">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block group-focus-within:text-[var(--corTema)] transition-colors" style={{ '--corTema': corTema }}>{customCamp.label} {customCamp.required ? '*' : ''}</label>
                                        <div className="relative">
                                            <input required={customCamp.required} value={customFields[customCamp.id] || ''} onChange={e => setCustomFields({...customFields, [customCamp.id]: e.target.value})} type="text" className="w-full bg-white border-2 border-gray-200 rounded-2xl px-5 py-3.5 outline-none transition-all font-semibold text-gray-800 placeholder-gray-300 shadow-sm" onFocus={(e)=> { e.target.style.borderColor = corTema; e.target.style.boxShadow = `0 0 0 4px ${corTema}25` }} onBlur={(e)=> { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none' }} placeholder={`Insira ${customCamp.label.toLowerCase()}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button disabled={enviando} style={{ backgroundColor: enviando ? '#9ca3af' : corTema }} className="w-full text-white font-black text-lg py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-3 mt-8 transition-all hover:scale-[1.01] active:scale-95 disabled:scale-100 disabled:hover:scale-100 disabled:cursor-not-allowed">
                                {enviando ? 'ENVIANDO...' : 'FINALIZAR INSCRIÇÃO'} 
                                {!enviando && <span className="bg-white/20 p-1.5 rounded-full"><ArrowRight className="w-5 h-5" /></span>}
                            </button>
                            
                            <p className="text-[10px] text-center text-gray-400 mt-6 font-medium leading-relaxed">
                                Oferecido por <strong className="text-gray-500 uppercase tracking-wider">{sorteio?.radio_id?.replace(/[^a-zA-Z0-9-]/g, ' ')}</strong><br/>
                                Ao concluir o envio você concorda com as nossas regras.
                            </p>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    )
}
