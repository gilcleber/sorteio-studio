import React, { useState, useEffect, useRef } from 'react'
import Importador from './Importador'
import SorteioConfig from './SorteioConfig'
import FormularioConfig from './FormularioConfig'
import RelatorioPanel from './RelatorioPanel'
import { Settings, Play, RefreshCw, Trophy, Clock, Zap, Upload, Users, List, MonitorPlay, Check, X, Volume2, Ban, Gauge, Shuffle, Gift, Trash2, AlertCircle, VolumeX, FilePlus, Cloud, RadioReceiver, PenTool } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Link } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../services/supabaseClient' // CLIENTE SUPABASE

// Efeitos Sonoros
const SOUNDS = {
    drum: new Audio('/sons/tambores.mp3'),
    win: new Audio('/sons/vitoria.mp3')
}

const AdminPanel = () => {
    const { user, signOut } = useAuth()

    // --- ESTADOS DE DADOS (NUVEM) ---
    const [participantes, setParticipantes] = useState([])
    const [historico, setHistorico] = useState([])
    const [brindes, setBrindes] = useState([])
    const [brindeAtual, setBrindeAtual] = useState("Carregando...")
    const [eventoAtivoId, setEventoAtivoId] = useState(null)
    const [toasts, setToasts] = useState([])

    // Estados locais (Configurações simples podem ficar locais por enquanto ou localStorage)
    const [importStats, setImportStats] = useState(null)
    const [loadingData, setLoadingData] = useState(true)

    // --- ESTADOS DE CONTROLE ---
    const [ganhador, setGanhador] = useState(null)
    const [isSorteando, setIsSorteando] = useState(false)
    const [isModoEspera, setIsModoEspera] = useState(false)
    const [nomeAtual, setNomeAtual] = useState("...")
    const [viewMode, setViewMode] = useState('sorteio')
    const [abaAtiva, setAbaAtiva] = useState('controle')
    const [novoBrinde, setNovoBrinde] = useState("")
    const [showImportador, setShowImportador] = useState(false)

    // Configurações (Mantidas local por preferência de sessão)
    const [duracao, setDuracao] = useState(3)
    const [velocidade, setVelocidade] = useState(50)
    const [volume, setVolume] = useState(true)

    // Modais
    const [ganhadorSelecionado, setGanhadorSelecionado] = useState(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [diasQuarentena, setDiasQuarentena] = useState('30')

    const intervalRef = useRef(null)
    const timeoutRef = useRef(null)
    const esperaRef = useRef(null)
    const channelRef = useRef(null)
    const velocidadeRef = useRef(velocidade)
    const duracaoRef = useRef(duracao)

    useEffect(() => { velocidadeRef.current = velocidade }, [velocidade])
    useEffect(() => { duracaoRef.current = duracao }, [duracao])

    // --- CARREGAMENTO INICIAL (SYNC) ---
    useEffect(() => {
        if (!user) return

        const carregarDados = async () => {
            setLoadingData(true)
            try {
                // 1. Participantes
                const { data: parts } = await supabase.from('app_participantes').select('*').order('created_at', { ascending: false })
                if (parts) setParticipantes(parts)

                // 2. Histórico
                const { data: hist } = await supabase.from('app_historico').select('*').order('data_ganho', { ascending: false })
                if (hist) setHistorico(hist)

                // 3. Brindes
                const { data: brinds } = await supabase.from('app_brindes').select('*').order('created_at', { ascending: true })
                if (brinds && brinds.length > 0) {
                    setBrindes(brinds.map(b => b.nome_brinde))
                    setBrindeAtual(brinds[0].nome_brinde)
                } else {
                    // Default se vazio
                    setBrindes(["Brinde Surpresa"])
                    setBrindeAtual("Brinde Surpresa")
                }

                // 4. Evento Ativo
                const { data: eventData } = await supabase.from('app_eventos').select('id').eq('ativo', true).order('created_at', { ascending: false }).limit(1)
                if (eventData && eventData.length > 0) {
                    setEventoAtivoId(eventData[0].id)
                }
            } catch (error) {
                console.error("Erro ao sincronizar:", error)
                alert("Erro ao conectar com a nuvem. Verifique sua internet.")
            } finally {
                setLoadingData(false)
            }
        }

        carregarDados()
    }, [user])

    // --- CANAL DE COMUNICAÇÃO ---
    useEffect(() => {
        channelRef.current = new BroadcastChannel('sorteio_facil_channel')
        setTimeout(() => { syncComTelao() }, 1000)
        return () => channelRef.current?.close()
    }, [])

    const syncComTelao = () => {
        if (!channelRef.current) return
        channelRef.current.postMessage({ type: 'UPDATE_PRIZE', payload: brindeAtual })
    }

    useEffect(() => {
        if (channelRef.current) channelRef.current.postMessage({ type: 'UPDATE_PRIZE', payload: brindeAtual })
    }, [brindeAtual])

    // Controle de Loop do som
    useEffect(() => {
        if (typeof SOUNDS.drum.loop !== 'undefined') SOUNDS.drum.loop = true;
    }, [])

    // --- MODO ESPERA (SCREENSAVER) ---
    useEffect(() => {
        if (isModoEspera && !isSorteando && !ganhador && participantes.length > 0) {
            esperaRef.current = setInterval(() => {
                const randomIndex = Math.floor(Math.random() * participantes.length)
                const nome = participantes[randomIndex].nome
                setNomeAtual(nome)
                channelRef.current.postMessage({ type: 'UPDATE_NAME', payload: nome })
            }, 300)
        } else {
            clearInterval(esperaRef.current)
        }
        return () => clearInterval(esperaRef.current)
    }, [isModoEspera, isSorteando, ganhador, participantes])

    const toggleModoEspera = () => {
        setIsModoEspera(!isModoEspera)
        channelRef.current.postMessage({ type: isModoEspera ? 'STOP_IDLE' : 'START_IDLE' })
    }

    // --- REAL-TIME LISTENER (NOVO) ---
    useEffect(() => {
        const channel = supabase.channel('realtime:admin_participantes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'app_participantes'
            }, (payload) => {
                const newPart = payload.new;
                
                // Apenas atualizar se pertencer ao evento atual
                if (eventoAtivoId && newPart.evento_id && newPart.evento_id !== eventoAtivoId) return;

                setParticipantes(prev => [newPart, ...prev]);

                // Toast Notification
                const toastId = Math.random().toString(36).substr(2, 9);
                setToasts(prev => [...prev, { id: toastId, nome: newPart.nome, cidade: newPart.cidade }]);
                
                setTimeout(() => {
                    setToasts(current => current.filter(t => t.id !== toastId));
                }, 4500);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        }
    }, [eventoAtivoId]);

    // --- SORTEIO (AGORA SERVER-SIDE & COM UX AUMENTADA) ---
    const loopSorteio = (startTime) => {
        // Giro visual provisório apenas para animação da roleta
        const randomIndex = Math.floor(Math.random() * participantes.length)
        const nomeSorteado = participantes[randomIndex].nome

        setNomeAtual(nomeSorteado)
        channelRef.current.postMessage({ type: 'UPDATE_NAME', payload: nomeSorteado })

        // UX: Vibração Tátil (Haptic Feedback) via API do Navegador
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(50) // Pequeno pulso de 50ms simulando passar p/ próximo nome
        }

        // UX: Progresso e Tensão Dinâmica do Audio (Pitch Ascendente)
        if (SOUNDS.drum && volume) {
            const timeElapsed = Date.now() - startTime
            const ratio = timeElapsed / (duracaoRef.current * 1000)
            const newPitch = 1 + (ratio * 1.5) // Acelera o playback gradativamente até 2.5x

            try {
                SOUNDS.drum.playbackRate = newPitch > 2.5 ? 2.5 : newPitch
            } catch (e) {
                console.log("Ajuste de playbackRate não suportado pelo browser.", e)
            }
        }

        if (Date.now() - startTime > duracaoRef.current * 1000) {
            finalizarSorteio()
        } else {
            timeoutRef.current = setTimeout(() => loopSorteio(startTime), velocidadeRef.current)
        }
    }

    const iniciarSorteio = () => {
        if (participantes.length === 0) return alert("Adicione participantes primeiro!")
        
        // Debounce Real-State: Impede clicks duplicadíssimos caso force a barra
        if (isSorteando) return 

        setIsModoEspera(false)
        setIsSorteando(true)
        setGanhador(null)
        const tempoInicio = Date.now()

        channelRef.current.postMessage({ type: 'START_ROLLING', prize: brindeAtual })

        if (volume) {
            try { SOUNDS.drum.playbackRate = 1.0 } catch(e){} // Reseta pitch ao iniciar
            SOUNDS.drum.currentTime = 0
            SOUNDS.drum.play().catch(e => console.log("Erro som:", e))
        }

        loopSorteio(tempoInicio)
    }

    const finalizarSorteio = async () => {
        clearTimeout(timeoutRef.current)
        
        // Mantém state ocupado para evitar conflitos até o servidor responder
        setNomeAtual("Processando no Servidor...")

        try {
            // ---> MIGRAÇÃO: LOGICA MOVIDA PARA UMA RPC TOTALMENTE SEGURA NO SUPABASE
            const { data: ganhadorFinal, error } = await supabase.rpc('executar_sorteio_seguro', {
                p_user_id: user.id,
                p_brinde: brindeAtual,
                p_evento_id: eventoAtivoId
            })

            if (error || !ganhadorFinal) {
                console.error("Erro na Database Function:", error)
                alert("Erro de segurança no sorteio (Servidor): " + (error?.message || "Desconhecido"))
                
                // Reseta estado local por haver falha de nuvem
                setIsSorteando(false)
                setNomeAtual("Erro!")
                if (volume) SOUNDS.drum.pause()
                return
            }

            if (volume) {
                SOUNDS.drum.pause()
                SOUNDS.drum.currentTime = 0
                try { SOUNDS.drum.playbackRate = 1.0 } catch(e){} // Reseta pitch
                SOUNDS.win.play().catch(e => console.log("Erro som vitória:", e))
            }

            setGanhador(ganhadorFinal)
            setNomeAtual(ganhadorFinal.nome)
            setIsSorteando(false)

            // A transação do Supabase já inseriu, a gente só alimenta o Cache React local:
            setHistorico([ganhadorFinal, ...historico])

            channelRef.current.postMessage({ type: 'WINNER_SELECTED', payload: ganhadorFinal })
            dispararConfete()

        } catch (catastrophicError) {
            console.error("Falha gravíssima ao contactar o BD:", catastrophicError)
            setIsSorteando(false)
            setNomeAtual("Tentativa Falhou")
        }
    }

    const dispararConfete = () => confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } })

    const resetarSorteio = () => {
        setGanhador(null)
        setNomeAtual("...")
        channelRef.current.postMessage({ type: 'RESET' })
    }

    // --- GESTÃO DE DADOS (IMPORTAÇÃO VIA SUPABASE) ---
    const handleDataLoaded = async (novosDados, novosStats) => {
        if (!user) return

        // 1. LIMPEZA TOTAL (Substituição Solicitada)
        // O usuário quer que o novo arquivo substitua o anterior, deletando contatos antigos.
        await supabase.from('app_participantes').delete().eq('user_id', user.id)

        // Prepara dados
        const dadosParaInserir = novosDados.map(p => ({
            user_id: user.id,
            nome: p.nome,
            telefone: p.telefone,
            cpf: p.cpf,
            email: p.email,
            detalhes: p.detalhes,
            origem: 'importacao'
        }))

        // 2. Insert Novos
        const { data, error } = await supabase.from('app_participantes').insert(dadosParaInserir).select()

        if (error) {
            alert("Erro ao salvar dados na nuvem: " + error.message)
            return
        }

        // Atualiza estado local (SUBSTITUI TUDO)
        const novosComId = data || []
        setParticipantes(novosComId) // Substitui array antigo

        setImportStats({
            ...novosStats,
            totalValido: novosComId.length,
            novosAdicionados: novosComId.length
        })

        setShowImportador(false)
        alert(`Lista atualizada! ${novosComId.length} participantes sincronizados.`)
    }

    const addBrinde = async () => {
        if (!novoBrinde.trim()) return

        // Salvar no Banco
        const { error } = await supabase.from('app_brindes').insert({
            user_id: user.id,
            nome_brinde: novoBrinde,
            ativo: true
        })

        if (!error) {
            setBrindes([...brindes, novoBrinde])
            setNovoBrinde("")
        } else {
            alert("Erro ao salvar brinde.")
        }
    }

    const removerBrinde = async (index) => {
        const brindeParaRemover = brindes[index]

        // Remove do banco (pelo nome, cuidado se tiver nomes iguais, mas ok por user_id)
        const { error } = await supabase.from('app_brindes').delete().match({ user_id: user.id, nome_brinde: brindeParaRemover })

        if (!error) {
            const novos = brindes.filter((_, i) => i !== index)
            setBrindes(novos)
            if (brindeAtual === brindeParaRemover && novos.length > 0) setBrindeAtual(novos[0])
        }
    }

    const limparTudo = async () => {
        if (confirm("ATENÇÃO: Isso apagará TODO o histórico e participantes DA NUVEM. Dados serão perdidos. Continuar?")) {
            await supabase.from('app_participantes').delete().eq('user_id', user.id)
            await supabase.from('app_historico').delete().eq('user_id', user.id)
            setParticipantes([])
            setHistorico([])
            setImportStats(null)
            setGanhador(null)
            window.location.reload()
        }
    }

    const removerGanhador = async (id, e) => {
        e.stopPropagation()
        if (!confirm("Tem certeza que deseja apagar este ganhador do histórico?")) return

        const { error } = await supabase.from('app_historico').delete().eq('id', id)
        if (!error) {
            setHistorico(historico.filter(h => h.id !== id))
        } else {
            alert("Erro ao remover: " + error.message)
        }
    }

    // --- RENDERIZADORES ---
    const abrirDetalhes = (g) => { setGanhadorSelecionado(g); setIsModalOpen(true) }

    // BLINDAGEM DE RENDER: Impede Runtime Crash por Variáveis indefinidas antes do React Hydration
    if (!participantes) return <div className="p-10 text-white font-mono text-center">Carregando painel de sorteios...</div>;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 md:p-6 font-sans flex flex-col gap-4">

            {/* TOPO */}
            <header className="flex flex-col md:flex-row justify-between items-center bg-gray-900/80 backdrop-blur p-4 rounded-xl border border-gray-800 shadow-lg sticky top-0 z-40">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-600/20 p-2 rounded-lg"><Cloud className="w-6 h-6 text-purple-400" /></div>
                    <div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Sorteio Studio <span className="text-[10px] bg-green-500 text-black px-2 rounded-full font-bold ml-2">PRO</span></h1>
                        <p className="text-xs text-gray-500 flex gap-2 items-center">
                            {loadingData ? "Sincronizando..." : `${participantes.length} Participantes • ${historico.length} Ganhadores`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 items-center mt-4 md:mt-0">
                    <button onClick={() => setVolume(!volume)} className={`p-2 rounded-lg transition-all ${volume ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
                        {volume ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                    </button>

                    <button onClick={limparTudo} className="p-2 rounded-lg text-red-500 hover:bg-red-900/20" title="Zerar Sistema">
                        <Trash2 className="w-5 h-5" />
                    </button>

                    <button onClick={() => setViewMode(viewMode === 'config' ? 'sorteio' : 'config')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'config' ? 'bg-indigo-600 shadow-lg shadow-indigo-900/40 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                        <RadioReceiver className="w-4 h-4" /> {viewMode === 'config' ? 'Voltar ao Sorteio' : 'Evento'}
                    </button>
                    <button onClick={() => setViewMode(viewMode === 'forms' ? 'sorteio' : 'forms')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'forms' ? 'bg-pink-600 shadow-lg shadow-pink-900/40 text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'}`}>
                        <PenTool className="w-4 h-4" /> Forms
                    </button>

                    <Link to={`/telao${eventoAtivoId ? `/${eventoAtivoId}` : ''}`} target="_blank" className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20">
                        <MonitorPlay className="w-4 h-4" /> Telão
                    </Link>

                    {user && user.isAdmin && (
                        <Link to="/super-admin" className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold border border-gray-700">
                            <Settings className="w-4 h-4" /> Admin
                        </Link>
                    )}

                    <button onClick={signOut} className="flex items-center gap-2 px-4 py-2 bg-red-900/50 hover:bg-red-900 rounded-lg text-sm font-bold border border-red-900">
                        Sair
                    </button>
                </div>
            </header>

            {/* VIEWS SECUNDARIAS */}
            {viewMode === 'config' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full"><SorteioConfig user={user} /></div>}
            {viewMode === 'forms' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto w-full"><FormularioConfig user={user} /></div>}

            {/* CONTEÚDO PRINCIPAL */}
            {viewMode === 'sorteio' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* COLUNA ESQUERDA: CONTROLE E IMPORTAÇÃO (8 colunas) */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* ÁREA DE SORTEIO */}
                    <div className="bg-gray-900 rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative min-h-[400px] flex flex-col justify-center items-center p-8">

                        {/* Seletor Rápido de Brinde (MOVIDO DO TOPO PARA DENTRO DO FLUXO, MAIS DISCRETO) */}
                        {!ganhador && !isSorteando && (
                            <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-gray-700 flex items-center gap-4 hover:border-yellow-500/50 transition-colors group">
                                    <div className="bg-yellow-500/10 p-2 rounded-full group-hover:bg-yellow-500/20 transition-colors">
                                        <Gift className="w-5 h-5 text-yellow-400" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Valendo Prêmio:</span>
                                        <select
                                            value={brindeAtual}
                                            onChange={(e) => setBrindeAtual(e.target.value)}
                                            className="bg-transparent text-white font-bold text-lg outline-none cursor-pointer appearance-none"
                                        >
                                            {brindes.map(b => <option key={b} value={b} className="bg-gray-900 text-white">{b}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {showImportador || participantes.length === 0 ? (
                            <div className="w-full max-w-md animate-in fade-in zoom-in duration-300">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-white">Adicionar Participantes (Nuvem)</h3>
                                    {participantes.length > 0 && <button onClick={() => setShowImportador(false)} className="text-gray-500 hover:text-white"><X /></button>}
                                </div>
                                <Importador onDataLoaded={handleDataLoaded} />
                                <p className="text-center text-xs text-gray-500 mt-4">Seus dados serão salvos na nuvem segura automaticamente.</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-center w-full mb-10">
                                    {ganhador ? (
                                        <div className="animate-in zoom-in duration-500 cursor-pointer" onClick={() => abrirDetalhes(ganhador)}>
                                            <p className="text-yellow-500 font-bold tracking-widest animate-bounce mb-2">🏆 GANHADOR(A) 🏆</p>
                                            <h2 className="text-5xl md:text-6xl font-black text-white mb-2 leading-tight">{ganhador.nome}</h2>
                                            <p className="text-xl text-gray-400 font-mono">{ganhador.telefone}</p>
                                            <div className="mt-4 inline-block bg-yellow-500/10 text-yellow-300 px-4 py-1 rounded border border-yellow-500/30 text-sm">
                                                Prêmio: {ganhador.premio || brindeAtual}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <h2 className={`text-6xl md:text-7xl font-black text-gray-700 tracking-tighter transition-all ${isModoEspera ? 'animate-pulse text-purple-900/50 scale-105 duration-1000' : ''}`}>
                                                {isSorteando || isModoEspera ? nomeAtual : "PRONTO"}
                                            </h2>
                                            {isModoEspera && <p className="text-purple-500/50 mt-4 animate-pulse uppercase tracking-widest text-sm">Aguardando Sorteio...</p>}
                                        </div>
                                    )}
                                </div>

                                {/* BOTÕES DE AÇÃO */}
                                <div className="flex flex-wrap justify-center gap-4 z-20">
                                    {!isSorteando && (
                                        <>
                                            <button
                                                onClick={iniciarSorteio}
                                                className="group bg-green-600 hover:bg-green-500 text-white px-10 py-5 rounded-2xl font-black text-2xl shadow-lg hover:scale-105 transition-all flex items-center gap-3"
                                            >
                                                <Play className="fill-current w-8 h-8 group-hover:rotate-12 transition-transform" />
                                                <span>SORTEAR</span>
                                            </button>

                                            {ganhador ? (
                                                <button onClick={resetarSorteio} className="bg-gray-800 hover:bg-gray-700 text-white p-5 rounded-2xl transition-all" title="Resetar">
                                                    <RefreshCw className="w-8 h-8" />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={toggleModoEspera}
                                                    className={`p-5 rounded-2xl transition-all ${isModoEspera ? 'bg-purple-600 text-white animate-pulse' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                                                    title="Modo Espera (Girar Nomes)"
                                                >
                                                    <Shuffle className={`w-8 h-8 ${isModoEspera ? 'animate-spin' : ''}`} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* GRADE DE CONTROLES */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. TEMPO */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-center">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Tempo (s)</label>
                                <span className="text-xs font-mono text-purple-400">{duracao}s</span>
                            </div>
                            <input type="range" min="5" max="60" step="1" value={duracao} onChange={(e) => setDuracao(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>

                        {/* 2. VELOCIDADE */}
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex flex-col justify-center">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1"><Gauge className="w-3 h-3" /> Velocidade</label>
                                <span className="text-xs font-mono text-purple-400">{velocidade}ms</span>
                            </div>
                            <input type="range" min="10" max="300" step="10" value={velocidade} onChange={(e) => setVelocidade(Number(e.target.value))} className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
                        </div>

                        {/* 3. SOM */}
                        <button
                            onClick={() => setVolume(!volume)}
                            className={`p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2 transition-all ${volume ? 'bg-green-900/20 text-green-400 hover:bg-green-900/30' : 'bg-red-900/20 text-red-400 hover:bg-red-900/30'}`}
                        >
                            {volume ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                            <span className="text-[10px] uppercase font-bold">{volume ? "Som Ativado" : "Som Mudo"}</span>
                        </button>

                        {/* 4. NOVO ARQUIVO */}
                        <button
                            onClick={() => setShowImportador(true)}
                            className={`p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2 transition-all ${showImportador ? 'bg-purple-600 text-white' : 'bg-gray-900/50 text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        >
                            <FilePlus className="w-6 h-6" />
                            <span className="text-[10px] uppercase font-bold">Novo Arquivo</span>
                        </button>

                        {/* 5 e 6: Ver Ganhadores e Cadastro Brinde */}
                        <button
                            onClick={() => setAbaAtiva('historico')}
                            className={`p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2 transition-all bg-gray-900/50 text-yellow-400 hover:bg-yellow-900/20 lg:col-span-2`}
                        >
                            <Trophy className="w-6 h-6" />
                            <span className="text-[10px] uppercase font-bold">Ver Ganhadores</span>
                        </button>

                        <button
                            onClick={() => setAbaAtiva('brindes')}
                            className={`p-4 rounded-xl border border-gray-800 flex flex-col items-center justify-center gap-2 transition-all bg-gray-900/50 text-purple-400 hover:bg-purple-900/20 lg:col-span-2`}
                        >
                            <Gift className="w-6 h-6" />
                            <span className="text-[10px] uppercase font-bold">Cadastro Brinde</span>
                        </button>
                    </div>
                </div>

                {/* COLUNA DIREITA: ABAS E LISTAS (4 colunas) */}
                <div className="lg:col-span-4 flex flex-col h-[700px] bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden shadow-xl">
                    {/* Navegação de Abas */}
                    <div className="flex border-b border-gray-800">
                        <button onClick={() => setAbaAtiva('historico')} className={`flex-1 py-3 text-xs font-bold uppercase ${abaAtiva === 'historico' ? 'bg-gray-800 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}>Ganhadores</button>
                        <button onClick={() => setAbaAtiva('brindes')} className={`flex-1 py-3 text-xs font-bold uppercase ${abaAtiva === 'brindes' ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-gray-300'}`}>Brindes</button>
                        <button onClick={() => setAbaAtiva('participantes')} className={`flex-1 py-3 text-xs font-bold uppercase ${abaAtiva === 'participantes' ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>LISTA</button>
                    </div>

                    <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-black/20">

                        {/* ABA Lista Completa (Participantes) */}
                        {abaAtiva === 'participantes' && (
                            <div className="space-y-2">
                                <RelatorioPanel 
                                    participantes={participantes} 
                                    eventoAtivoId={eventoAtivoId} 
                                    tituloEvento={"Sorteio (Gerado Via Sistema)"} 
                                    premio={brindeAtual} 
                                />
                                <div className="text-center text-xs text-gray-500 mb-4">{participantes?.length || 0} participantes sincronizados</div>
                                {participantes?.slice(0, 100).map((p, i) => (
                                    <div key={i} onClick={() => abrirDetalhes(p)} className="text-xs text-gray-400 border-b border-gray-800 py-2 flex justify-between hover:bg-gray-800/50 cursor-pointer px-2 rounded transition-colors group">
                                        <span className="group-hover:text-white transition-colors">{p.nome}</span>
                                        <span className="font-mono text-gray-600 group-hover:text-gray-400">{p.telefone ? p.telefone.slice(-4) : '***'}</span>
                                    </div>
                                ))}
                                {(participantes?.length || 0) > 100 && <p className="text-center text-[10px] text-gray-600 mt-2">... e mais {(participantes?.length || 0) - 100}. Use a busca (em breve).</p>}
                            </div>
                        )}

                        {/* ABA HISTÓRICO */}
                        {abaAtiva === 'historico' && (
                            <div className="space-y-3">
                                {(!historico || historico?.length === 0) && <div className="text-center text-gray-600 mt-10">Nenhum ganhador ainda.</div>}
                                {historico?.map((h, i) => (
                                    <div key={i} onClick={() => abrirDetalhes(h)} className="bg-gradient-to-r from-gray-900 to-gray-800 p-3 rounded-lg border border-gray-700 hover:border-yellow-500/50 cursor-pointer group transition-all relative">
                                        <div className="flex justify-between items-start">
                                            <span className="text-[10px] font-bold text-yellow-600 uppercase bg-yellow-900/10 px-1 rounded">#{historico.length - i}</span>
                                            <div className="flex gap-2">
                                                <span className="text-[10px] text-gray-500">{new Date(h.data_ganho || h.dataHora).toLocaleTimeString().slice(0, 5)}</span>
                                                <button onClick={(e) => removerGanhador(h.id, e)} className="text-gray-600 hover:text-red-500 p-1 -mt-1 -mr-1 rounded-full hover:bg-red-900/20 z-10" title="Apagar Registro"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                        <p className="font-bold text-white mt-1 group-hover:text-yellow-400 transition-colors">{h.nome}</p>
                                        <p className="text-xs text-purple-400/80 mt-1 flex items-center gap-1 font-medium"><Gift className="w-3 h-3" /> {h.premio || "Prêmio não registrado"}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ABA BRINDES */}
                        {abaAtiva === 'brindes' && (
                            <div className="space-y-4">
                                <div className="bg-gray-950 p-3 rounded border border-gray-800">
                                    <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Cadastrar Novo Brinde</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={novoBrinde}
                                            onChange={(e) => setNovoBrinde(e.target.value)}
                                            placeholder="Ex: Cesta Básica..."
                                            className="flex-1 bg-black border border-gray-700 rounded px-3 py-2 text-sm focus:border-purple-500 outline-none placeholder-gray-700"
                                            onKeyPress={(e) => e.key === 'Enter' && addBrinde()}
                                        />
                                        <button onClick={addBrinde} className="bg-purple-600 px-3 rounded hover:bg-purple-500 transition-colors"><Check className="w-4 h-4" /></button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {brindes.map((b, i) => (
                                        <div key={i} className={`flex justify-between items-center p-3 rounded border transition-all ${brindeAtual === b ? 'bg-purple-900/20 border-purple-500/50 shadow-lg shadow-purple-900/10' : 'bg-gray-900 border-gray-800'}`}>
                                            <span onClick={() => setBrindeAtual(b)} className="cursor-pointer flex-1 text-sm font-medium">{b}</span>
                                            <div className="flex gap-2">
                                                {brindeAtual === b && <span className="text-[10px] bg-purple-500 text-white px-2 py-0.5 rounded-full font-bold">Ativo</span>}
                                                <button onClick={() => removerBrinde(i)} className="text-gray-600 hover:text-red-500"><X className="w-3 h-3" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            )}

            {/* MODAL DETALHES - MANTIDO IDÊNTICO MAS ADAPTADO PROS DADOS */}
            <AnimatePresence>
                {isModalOpen && ganhadorSelecionado && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-gray-900 w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
                                <h2 className="text-2xl font-bold text-white">Detalhes do Ganhador</h2>
                                <button onClick={() => setIsModalOpen(false)} className="bg-gray-800 p-1 rounded-full text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-6 overflow-y-auto custom-scrollbar">
                                <div className="space-y-4">
                                    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ganhador(a)</p>
                                        <p className="text-2xl text-white font-black">{ganhadorSelecionado.nome}</p>
                                        {/* Tenta buscar o prêmio no objeto principal, depois em detalhes, depois cruza com histórico se for participante */}
                                        <p className="text-purple-400 font-mono text-lg mt-1">
                                            {ganhadorSelecionado.premio ||
                                                ganhadorSelecionado.detalhes?.premio ||
                                                historico.find(h => h.nome === ganhadorSelecionado.nome && h.telefone === ganhadorSelecionado.telefone)?.premio ||
                                                "Prêmio não registrado"}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="bg-gray-950 p-3 rounded border border-gray-800">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Email</p>
                                            <p className="text-sm text-white font-mono break-all">
                                                {ganhadorSelecionado.email ||
                                                    ganhadorSelecionado.detalhes?.email ||
                                                    (ganhadorSelecionado.detalhes && Object.entries(ganhadorSelecionado.detalhes).find(([k]) => k.toLowerCase().includes('email'))?.[1]) ||
                                                    "Não informado"}
                                            </p>
                                        </div>
                                        <div className="bg-gray-950 p-3 rounded border border-gray-800">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Telefone</p>
                                            <p className="text-lg text-green-400 font-mono">{ganhadorSelecionado.telefone}</p>
                                        </div>
                                    </div>
                                    <div className="bg-gray-950 px-3 py-2 rounded border border-gray-800 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-gray-500 uppercase font-bold">Data do Sorteio</span>
                                            <span className="text-xs text-gray-300 font-mono">
                                                {ganhadorSelecionado.data_ganho || ganhadorSelecionado.dataHora
                                                    ? new Date(ganhadorSelecionado.data_ganho || ganhadorSelecionado.dataHora).toLocaleString()
                                                    : "Não sorteado (Participante)"}
                                            </span>
                                        </div>
                                        {(ganhadorSelecionado.data_ganho || ganhadorSelecionado.dataHora) && (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-green-500 uppercase font-bold">Liberado em (15 dias)</span>
                                                <span className="text-xs text-green-300 font-mono font-bold">
                                                    {(() => {
                                                        const d = new Date(ganhadorSelecionado.data_ganho || ganhadorSelecionado.dataHora)
                                                        d.setDate(d.getDate() + 15)
                                                        return d.toLocaleDateString()
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* SEÇÃO IMPORTANTE: DOCUMENTOS E ENDEREÇO (SOLICITAÇÃO URGENTE) */}
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        <div className="bg-gray-900/80 p-3 rounded border border-gray-700">
                                            <p className="text-[10px] text-yellow-500 uppercase font-bold mb-1">CPF / RG</p>
                                            <p className="text-sm text-white font-mono leading-tight break-all">
                                                {ganhadorSelecionado.cpf ||
                                                    (ganhadorSelecionado.detalhes && Object.entries(ganhadorSelecionado.detalhes).find(([k]) => {
                                                        const kl = k.toLowerCase()
                                                        return kl.includes('rg') || kl.includes('documento') || kl === 'doc' || kl === 'cpf'
                                                    })?.[1]) ||
                                                    "Não informado"}
                                            </p>
                                        </div>
                                        <div className="bg-gray-900/80 p-3 rounded border border-gray-700">
                                            <p className="text-[10px] text-yellow-500 uppercase font-bold mb-1">Cidade / Local</p>
                                            <p className="text-sm text-white font-mono leading-tight break-words capitalize">
                                                {(() => {
                                                    // 1. Tenta campo cidade oficial
                                                    let cidade = ganhadorSelecionado.cidade;

                                                    // 2. Busca em detalhes
                                                    if (!cidade || cidade === "Não informado") {
                                                        cidade = ganhadorSelecionado.detalhes && Object.entries(ganhadorSelecionado.detalhes).find(([k, v]) => {
                                                            const kl = k.toLowerCase()
                                                            const vl = String(v).toLowerCase()
                                                            return (kl.includes('cidade') || kl.includes('municipio') || kl === 'uf') && !vl.includes('rua')
                                                        })?.[1]
                                                    }

                                                    // 3. Tenta extrair do fim do endereço (Risk Heuristic, mas pedida pelo usuário)
                                                    if ((!cidade || cidade === "Não informado") && ganhadorSelecionado.endereco) {
                                                        const parts = ganhadorSelecionado.endereco.split(/[-–,]/) // Separa por traço ou vírgula
                                                        if (parts.length > 1) {
                                                            const lastPart = parts[parts.length - 1].trim()
                                                            if (lastPart.length < 30 && !lastPart.match(/\d/)) return lastPart + " (Est.)" // Estimado
                                                        }
                                                    }

                                                    return cidade || "Não informado"
                                                })()}
                                            </p>
                                        </div>
                                        <div className="col-span-2 bg-gray-900/80 p-3 rounded border border-gray-700">
                                            <p className="text-[10px] text-yellow-500 uppercase font-bold mb-1">Endereço Completo</p>
                                            <p className="text-sm text-white font-mono leading-tight break-words">
                                                {ganhadorSelecionado.endereco ||
                                                    (ganhadorSelecionado.detalhes && Object.entries(ganhadorSelecionado.detalhes).find(([k]) => {
                                                        const kl = k.toLowerCase()
                                                        return kl.includes('endereco') || kl.includes('endereço') || kl.includes('rua') || kl.includes('logradouro') || kl.includes('av') || kl.includes('avenida')
                                                    })?.[1]) ||
                                                    "Não informado (Verificar 'Outros Dados' abaixo)"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* EXIBIÇÃO DE DETALHES EXTRAS (JSON) */}
                                    {ganhadorSelecionado.detalhes && (
                                        <div className="bg-gray-900/50 p-3 rounded border border-gray-800 mt-4">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 border-b border-gray-700 pb-1">Outros Dados do Cadastro</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Object.entries(ganhadorSelecionado.detalhes).map(([key, value]) => {
                                                    // Filtro de campos técnicos ou já exibidos ACIMA
                                                    const keyLower = key.toLowerCase()
                                                    if (['nome', 'telefone', 'cpf', 'email', 'id', 'user_id', 'origem', 'created_at', 'premio', 'dataHora', 'data_ganho', 'cidade', 'endereco'].includes(keyLower)) return null
                                                    if (keyLower.includes('endereco') || keyLower.includes('endereço') || keyLower.includes('rua') || keyLower.includes('logradouro')) return null
                                                    if (typeof value === 'object') return null
                                                    return (
                                                        <div key={key} className="flex flex-col">
                                                            <span className="text-[10px] text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                                            <span className="text-xs text-gray-300 break-words">{String(value)}</span>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* TOASTS REAL-TIME */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {toasts.map(t => (
                        <motion.div 
                            key={t.id}
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            className="bg-gray-900 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.15)] rounded-xl p-3 flex items-center gap-3 w-72 pointer-events-auto overflow-hidden relative"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />
                            <div className="bg-green-900/30 text-green-400 p-2 rounded-full shadow-inner ml-1">
                                <Zap className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex flex-col flex-1 overflow-hidden pt-0.5">
                                <span className="text-[9px] uppercase font-black text-green-500 tracking-wider">Novo Participante!</span>
                                <span className="text-sm font-bold text-white truncate leading-tight mt-0.5">{t.nome}</span>
                                {t.cidade && <span className="text-xs text-gray-400 truncate">{t.cidade}</span>}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

        </div>
    )
}

export default AdminPanel
