import React, { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Users, Search, CheckCircle, XCircle, Clock, ShieldAlert, ArrowLeft, RefreshCw, Calendar, Loader2 } from 'lucide-react'

const SuperAdmin = () => {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [processing, setProcessing] = useState(null)

    // Estados para criação de rádio
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [newRadio, setNewRadio] = useState({ email: '', nome: '', slug: '', password: '' })
    const [creating, setCreating] = useState(false)

    useEffect(() => {
        fetchClients()
    }, [])

    const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString()

    const openCreateModal = () => {
        setNewRadio({ email: '', nome: '', slug: '', password: generatePin() })
        setShowCreateModal(true)
    }

    const handleCreateRadio = async (e) => {
        e.preventDefault()
        if (!newRadio.email || !newRadio.nome || !newRadio.slug) return alert("Preencha todos os campos")

        setCreating(true)
        try {
            // Chama a função RPC criada via SQL
            const { data, error } = await supabase.rpc('create_radio_account', {
                email: newRadio.email,
                password: newRadio.password, // Usa o PIN como senha inicial
                name: newRadio.nome,
                user_slug: newRadio.slug
            })

            if (error) throw error

            alert(`Rádio ${newRadio.nome} criada com sucesso!\nPIN Inicial: ${newRadio.password}`)
            setShowCreateModal(false)
            fetchClients() // Recarrega lista

        } catch (error) {
            console.error("Erro ao criar rádio:", error)
            alert("Erro ao criar: " + error.message)
        } finally {
            setCreating(false)
        }
    }

    const handleNameChange = (e) => {
        const val = e.target.value
        const slugAuto = val.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
        setNewRadio(prev => ({ ...prev, nome: val, slug: slugAuto }))
    }

    const fetchClients = async () => {
        setLoading(true)
        try {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (profilesError) throw profilesError

            const { data: licensesData, error: licensesError } = await supabase
                .from('licenses')
                .select('*')

            if (licensesError) throw licensesError

            const formatted = profilesData.map(p => {
                const license = licensesData?.find(l => l.user_id === p.id)
                return {
                    id: p.id,
                    email: p.email,
                    nome: p.nome_completo || 'Sem Nome',
                    telefone: p.telefone || 'N/A',
                    role: p.role,
                    slug: p.slug,
                    pin: p.pin,
                    status: license?.status || 'pending',
                    expires_at: license?.expires_at,
                    plan_type: license?.plan_type || 'trial',
                    created_at: p.created_at
                }
            })

            setClients(formatted)
        } catch (error) {
            console.error("Erro ao buscar clientes:", error)
            alert("Erro ao carregar lista: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    const updateName = async (userId, newName) => {
        setClients(prev => prev.map(c => c.id === userId ? { ...c, nome: newName } : c))
        try {
            const { error } = await supabase.from('profiles').update({ nome_completo: newName }).eq('id', userId)
            if (error) throw error
        } catch (error) {
            alert('Erro ao atualizar nome: ' + error.message)
            fetchClients()
        }
    }

    const gerarNovoPin = async (userId, userSlug) => {
        if (!confirm("Tem certeza? O PIN atual da rádio deixará de funcionar imediatamente.")) return;
        setProcessing(userId)
        try {
            const numPin = Math.floor(1000 + Math.random() * 9000).toString()
            
            // Atualiza profiles (Local principal de autenticação)
            const { error: err1 } = await supabase.from('profiles').update({ pin: numPin }).eq('id', userId)
            if (err1) throw err1
            
            // Se a coluna existir em app_radios (fallback do pedido original) tenta atualizar lá também
            if (userSlug) {
               await supabase.from('app_radios').update({ pin: numPin }).eq('slug', userSlug).catch(() => {}) 
            }
            
            setClients(prev => prev.map(c => c.id === userId ? { ...c, pin: numPin } : c))
            alert(`Novo PIN gerado: ${numPin}`)
        } catch (error) {
            alert("Erro ao gerar novo PIN: " + error.message)
        } finally {
            setProcessing(null)
        }
    }

    const updateSlug = async (userId, newSlug) => {
        const { data: existing } = await supabase.from('profiles').select('id').eq('slug', newSlug).neq('id', userId).maybeSingle()
        if (existing) {
            alert('Este slug já está em uso! Escolha outro.')
            fetchClients()
            return
        }
        setClients(prev => prev.map(c => c.id === userId ? { ...c, slug: newSlug } : c))
        try {
            const { error } = await supabase.from('profiles').update({ slug: newSlug }).eq('id', userId)
            if (error) throw error
            alert('Link personalizado atualizado!')
        } catch (error) {
            alert('Erro ao atualizar slug: ' + error.message)
            fetchClients()
        }
    }

    const updateLicense = async (userId, customDate = null, status = 'active', planType = null) => {
        setProcessing(userId)
        try {
            let expiresAt = null
            let finalPlanType = planType

            if (customDate) {
                const d = new Date(customDate)
                d.setHours(23, 59, 59, 999)
                expiresAt = d.toISOString()
                finalPlanType = 'pro_mensal'
            } else if (planType === 'pro_vitalicio') {
                expiresAt = null
                finalPlanType = 'pro_vitalicio'
            } else if (status === 'blocked' || status === 'active') {
                const currentClient = clients.find(c => c.id === userId)
                expiresAt = currentClient.expires_at
                finalPlanType = currentClient.plan_type
            }

            setClients(prev => prev.map(c => c.id === userId ? {
                ...c,
                status,
                expires_at: expiresAt,
                plan_type: finalPlanType
            } : c))

            const { error } = await supabase.from('licenses').upsert({
                user_id: userId,
                status: status,
                expires_at: expiresAt,
                plan_type: finalPlanType
            }, { onConflict: 'user_id' })

            if (error) throw error
            alert(`Licença atualizada!`)
        } catch (error) {
            alert("Erro ao atualizar: " + error.message)
            fetchClients()
        } finally {
            setProcessing(null)
        }
    }

    const filteredClients = clients.filter(c =>
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-950 text-white p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-10 bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">Gestão de Licenças</h1>
                            <p className="text-gray-400 text-sm">Super Admin: {user?.email}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={openCreateModal} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/20">
                            <Users className="w-5 h-5" /> Nova Rádio
                        </button>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar cliente..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-black/50 border border-gray-700 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-purple-500 outline-none w-64"
                            />
                        </div>
                        <button onClick={fetchClients} className="bg-gray-800 p-2 rounded-xl hover:bg-gray-700">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* MODAL CRIAR RÁDIO */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl w-full max-w-md shadow-2xl relative">
                            <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle /></button>
                            <h2 className="text-2xl font-bold text-white mb-6">Cadastrar Nova Rádio</h2>

                            <form onSubmit={handleCreateRadio} className="space-y-4">
                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Nome da Rádio</label>
                                    <input autoFocus type="text" value={newRadio.nome} onChange={handleNameChange} className="w-full bg-gray-800 border-gray-700 rounded p-3 text-white focus:border-purple-500 outline-none" placeholder="Ex: Rádio Top FM" />
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Slug (Link)</label>
                                    <div className="flex items-center bg-gray-800 border border-gray-700 rounded px-3">
                                        <span className="text-gray-500 text-sm">/radio/</span>
                                        <input type="text" value={newRadio.slug} onChange={e => setNewRadio({ ...newRadio, slug: e.target.value })} className="w-full bg-transparent p-3 text-white focus:outline-none" placeholder="radio-top" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Email de Login</label>
                                    <input type="email" value={newRadio.email} onChange={e => setNewRadio({ ...newRadio, email: e.target.value })} className="w-full bg-gray-800 border-gray-700 rounded p-3 text-white focus:border-purple-500 outline-none" placeholder="contato@radio.com" />
                                </div>

                                <div className="bg-yellow-900/20 p-4 rounded border border-yellow-600/30 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-yellow-500 font-bold uppercase">PIN Inicial (Senha)</p>
                                        <p className="text-2xl font-mono text-white tracking-widest">{newRadio.password}</p>
                                    </div>
                                    <button type="button" onClick={() => setNewRadio(prev => ({ ...prev, password: generatePin() }))} className="text-xs text-yellow-400 hover:underline">Gerar Outro</button>
                                </div>

                                <button disabled={creating} type="submit" className="w-full bg-purple-600 hover:bg-purple-500 py-3 rounded-xl font-bold text-white shadow-lg mt-4 flex justify-center">
                                    {creating ? <Loader2 className="animate-spin" /> : "Criar Rádio"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                        <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-500" />
                        <p>Carregando clientes...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredClients.length === 0 && <p className="text-center text-gray-500">Nenhum cliente encontrado.</p>}

                        {filteredClients.map(client => (
                            <div key={client.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 flex flex-col lg:flex-row justify-between items-center gap-6 hover:border-purple-500/30 transition-all">

                                {/* Info Cliente */}
                                <div className="flex items-center gap-6 flex-1 w-full lg:w-auto">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${client.role === 'admin' ? 'bg-purple-600' : 'bg-gray-800'}`}>
                                        {client.nome ? client.nome.charAt(0).toUpperCase() : '?'}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <input
                                                type="text"
                                                defaultValue={client.nome}
                                                onBlur={(e) => {
                                                    if (e.target.value !== client.nome && e.target.value.trim()) {
                                                        updateName(client.id, e.target.value)
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.target.blur()
                                                    }
                                                }}
                                                className="font-bold text-lg text-white bg-transparent border-b border-transparent hover:border-gray-600 focus:border-purple-500 focus:outline-none px-1 -mx-1"
                                                placeholder="Nome da rádio"
                                            />
                                            {client.role === 'admin' && <span className="text-[10px] bg-purple-900/50 text-purple-300 px-2 rounded-full border border-purple-500/50">ADMIN</span>}
                                        </div>
                                        <p className="text-gray-400 text-sm">{client.email}</p>
                                        <p className="text-gray-500 text-xs mt-1 flex items-center gap-1"><Users className="w-3 h-3" /> {client.telefone}</p>

                                        {/* Edição de Slug */}
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Slug:</span>
                                            <input
                                                type="text"
                                                defaultValue={client.slug || ''}
                                                onBlur={(e) => {
                                                    const newSlug = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-')
                                                    if (newSlug !== client.slug && newSlug) {
                                                        updateSlug(client.id, newSlug)
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') e.target.blur()
                                                }}
                                                placeholder="ex: radio-fm"
                                                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-purple-400 focus:border-purple-500 outline-none w-40"
                                            />
                                        </div>

                                        {client.slug && (
                                            <div className="mt-2 space-y-2">
                                                {/* Link de Acesso e Gestão */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <code className="text-xs bg-gray-800 px-2 py-1 rounded text-gray-400 select-all">
                                                        {window.location.origin}/#/participar/{client.slug}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault(); e.stopPropagation();
                                                            const link = `${window.location.origin}/#/participar/${client.slug}`
                                                            navigator.clipboard.writeText(link)
                                                            const btn = e.currentTarget;
                                                            const oldText = btn.innerHTML;
                                                            btn.innerHTML = '✅ Copiado!';
                                                            btn.classList.add('bg-green-600');
                                                            setTimeout(() => { btn.innerHTML = oldText; btn.classList.remove('bg-green-600') }, 2000)
                                                        }}
                                                        className="text-xs bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded transition-all"
                                                        title="Copiar link do Sorteio"
                                                    >
                                                        Copiar Link
                                                    </button>
                                                    
                                                    <button
                                                        type="button"
                                                        className="text-xs bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded flex items-center gap-1 font-bold shadow-lg"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            window.open(`${window.location.origin}/#/radio/${client.slug}`, '_blank')
                                                        }}
                                                    >
                                                        Painel Gestor ↗
                                                    </button>
                                                </div>
                                                {/* PIN de Acesso */}
                                                {client.pin && (
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs bg-yellow-900/20 border border-yellow-600/50 px-2 py-1 rounded text-yellow-400 font-mono select-all">
                                                            PIN: {client.pin}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault(); e.stopPropagation();
                                                                navigator.clipboard.writeText(client.pin)
                                                                const btn = e.currentTarget;
                                                                const oldText = btn.innerHTML;
                                                                btn.innerHTML = '✅ Copiado!';
                                                                btn.classList.add('bg-green-600');
                                                                setTimeout(() => { btn.innerHTML = oldText; btn.classList.remove('bg-green-600') }, 2000)
                                                            }}
                                                            className="text-xs bg-yellow-600 hover:bg-yellow-500 px-3 py-1.5 rounded text-white transition-all"
                                                            title="Copiar PIN"
                                                        >
                                                            Copiar PIN
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); gerarNovoPin(client.id, client.slug) }}
                                                            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded text-gray-300 transition-all border border-gray-600 flex items-center gap-1"
                                                            title="Gerar Novo PIN"
                                                            disabled={processing === client.id}
                                                        >
                                                            <RefreshCw className={`w-3 h-3 ${processing === client.id ? 'animate-spin' : ''}`} /> Novo PIN
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Status Licença */}
                                <div className="flex flex-col items-center min-w-[200px]">
                                    <div className={`px-4 py-1 rounded-full text-xs font-bold uppercase mb-2 flex items-center gap-2 border ${client.status === 'blocked' ? 'bg-red-900/20 text-red-400 border-red-900' :
                                        !client.expires_at ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)]' :
                                            'bg-green-900/20 text-green-400 border-green-900'
                                        }`}>
                                        {client.status === 'blocked' ? <ShieldAlert className="w-3 h-3" /> : !client.expires_at ? <Trophy className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                        {client.status === 'blocked' ? 'Bloqueado' : !client.expires_at ? 'Vitalício' : 'Ativo'}
                                    </div>
                                    {client.expires_at ? (
                                        <p className="text-xs text-gray-400">Vence: <strong className="text-white">{new Date(client.expires_at).toLocaleDateString()}</strong></p>
                                    ) : (
                                        client.status !== 'blocked' && <p className="text-xs text-yellow-600 font-bold">Acesso Ilimitado</p>
                                    )}
                                </div>

                                {/* Ações Flexíveis */}
                                <div className="flex flex-col gap-2 items-end">
                                    <div className="flex gap-2 items-center bg-black/20 p-2 rounded-lg border border-gray-800">
                                        <div className="flex flex-col">
                                            <label className="text-[10px] text-gray-500 font-bold uppercase">Validade</label>
                                            <input
                                                type="date"
                                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-purple-500"
                                                id={`date-${client.id}`}
                                            />
                                        </div>
                                        <button
                                            onClick={() => {
                                                const dateVal = document.getElementById(`date-${client.id}`).value
                                                if (!dateVal) return alert('Selecione uma data!')
                                                updateLicense(client.id, dateVal, 'active', 'pro_mensal')
                                            }}
                                            className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded text-xs font-bold"
                                        >
                                            Aplicar
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => updateLicense(client.id, null, 'active', 'pro_vitalicio')}
                                            className="bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-500 border border-yellow-600/50 px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors"
                                        >
                                            Tornar Vitalício
                                        </button>

                                        {client.status !== 'blocked' ? (
                                            <button onClick={() => updateLicense(client.id, null, 'blocked')} className="text-red-500 hover:bg-red-900/20 px-3 py-1 rounded text-[10px]">Bloquear</button>
                                        ) : (
                                            <button onClick={() => updateLicense(client.id, null, 'active')} className="text-green-500 hover:bg-green-900/20 px-3 py-1 rounded text-[10px]">Desbloquear</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function Trophy(props) {
    return (
        <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
    )
}

export default SuperAdmin
