import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Trophy, Gift, Users } from 'lucide-react'
import { supabase } from '../services/supabaseClient'

const PublicDisplay = () => {
    const [nomeAtual, setNomeAtual] = useState("Aguardando Início...")
    const [ganhador, setGanhador] = useState(null)
    const [isSorteando, setIsSorteando] = useState(false)
    const [premioAtual, setPremioAtual] = useState("")

    // Phase 2 Metadata
    const [bannerUrl, setBannerUrl] = useState(null)
    const [patrocinadores, setPatrocinadores] = useState([])
    const [count, setCount] = useState(0)
    const [sorteioInfo, setSorteioInfo] = useState(null)

    useEffect(() => {
        carregarMetadados()

        const channel = new BroadcastChannel('sorteio_facil_channel')
        channel.onmessage = (event) => {
            const { type, payload } = event.data
            switch (type) {
                case 'START_ROLLING':
                    setIsSorteando(true)
                    setGanhador(null)
                    if (event.data.prize) setPremioAtual(event.data.prize)
                    // Fetch refreshes prize images just in case
                    carregarMetadados()
                    break
                case 'UPDATE_NAME':
                    if (payload && payload !== '...') setNomeAtual(payload)
                    break
                case 'UPDATE_PRIZE':
                    setPremioAtual(payload)
                    break
                case 'WINNER_SELECTED':
                    setIsSorteando(false)
                    setGanhador(payload)
                    setNomeAtual(payload.nome)
                    if (payload.premio) setPremioAtual(payload.premio)
                    dispararConfete()
                    break
                case 'RESET':
                    setGanhador(null)
                    setIsSorteando(false)
                    setNomeAtual("Sorteio Studio")
                    break
                default:
                    break
            }
        }

        // Live Participant Counter
        const rtime = supabase.channel('public_room')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'app_participantes' }, payload => {
                setCount(prev => prev + 1)
            })
            .subscribe()

        return () => { channel.close(); supabase.removeChannel(rtime) }
    }, [])

    const carregarMetadados = async () => {
        // Tenta achar evento Master Ativo
        const { data: sData } = await supabase.from('app_historico')
           .select('*')
           .is('data_ganho', null)
           .order('created_at', { ascending: false })
           .limit(1)

        if (sData && sData.length > 0) {
            const trg = sData[0]
            if (trg.premio) setPremioAtual(trg.premio)
            setSorteioInfo(trg)
            
            const { data: bData } = await supabase.from('app_brindes').select('imagem_url').eq('user_id', trg.user_id).eq('nome_brinde', trg.premio).single()
            if (bData?.imagem_url) setBannerUrl(bData.imagem_url)

            const { data: pData } = await supabase.from('app_patrocinadores').select('*').eq('sorteio_id', trg.id)
            if (pData) setPatrocinadores(pData)

            const { count: qt } = await supabase.from('app_participantes').select('*', { count: 'exact', head: true }).eq('user_id', trg.user_id)
            if (qt !== null) setCount(qt)
        }
    }

    const dispararConfete = () => {
        const duration = 7 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        const randomInRange = (min, max) => Math.random() * (max - min) + min;

        const interval = setInterval(function () {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
            confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
        }, 250);
    }

    const mascararTelefone = (tel) => {
        if (!tel) return ""
        const digits = tel.replace(/\D/g, '')
        if (digits.length < 4) return tel
        const visiblePart = tel.slice(0, -4)
        return visiblePart + "xxxx"
    }

    return (
        <div className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden relative font-sans">
            {/* Background Dinâmico */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-950 via-black to-black" />

            {/* BARRA SUPERIOR (Metadata Master) */}
            <div className="absolute top-0 left-0 w-full flex justify-between items-start p-6 md:p-10 z-30">
                 {/* Prêmio e Capa */}
                 {premioAtual && !isSorteando && !ganhador && (
                     <div className="flex bg-black/60 backdrop-blur-md rounded-2xl border border-gray-800 overflow-hidden shadow-2xl animate-in slide-in-from-top-12 duration-700">
                         {bannerUrl ? (
                             <img src={bannerUrl} alt={premioAtual} className="w-48 h-48 object-cover border-r border-gray-800" />
                         ) : (
                             <div className="w-48 h-48 bg-gradient-to-br from-purple-800 to-indigo-900 flex items-center justify-center border-r border-gray-800"><Gift className="w-16 h-16 text-yellow-500 opacity-80" /></div>
                         )}
                         <div className="p-6 flex flex-col justify-center max-w-sm">
                             <div className="text-[10px] uppercase font-black text-yellow-500 tracking-[0.3em] mb-1">Valendo Agora</div>
                             <h2 className="text-white font-black text-2xl leading-tight">{premioAtual}</h2>
                             {sorteioInfo?.slug && <div className="mt-4 bg-purple-900/40 text-purple-300 text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 font-medium">sorteio-studio.vercel.app/#/participar/{sorteioInfo.slug}</div>}
                         </div>
                     </div>
                 )}
                 {/* Live Counters */}
                 <div className="flex flex-col gap-3 items-end">
                      <div className="flex items-center gap-3 bg-red-900/30 border border-red-500/50 text-red-500 px-4 py-2 rounded-full animate-pulse shadow-lg shadow-red-900/20">
                          <div className="w-3 h-3 bg-red-500 rounded-full" />
                          <span className="font-bold text-sm tracking-widest uppercase">Ao Vivo</span>
                      </div>
                      <div className="flex gap-2 items-center text-gray-400 bg-gray-900/60 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-800">
                          <Users className="w-5 h-5"/>
                          <span className="font-bold font-mono text-white text-lg">{count}</span>
                          <span className="text-xs uppercase ml-1">Na Sala</span>
                      </div>
                 </div>
            </div>

            {/* PATROCINADORES (Rodapé) */}
            {patrocinadores.length > 0 && !isSorteando && !ganhador && (
                 <div className="absolute bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-gray-800 p-6 flex flex-col items-center z-40 animate-in slide-in-from-bottom duration-1000">
                     <span className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-bold mb-4">Apoio Cultural / Patrocínio</span>
                     <div className="flex gap-16 overflow-x-hidden items-center justify-center w-full max-w-7xl">
                         {patrocinadores.map((p, i) => (
                             <div key={i} className="flex flex-col items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-80 hover:opacity-100">
                                 {p.logo_url && <img src={p.logo_url} className="h-16 w-auto object-contain drop-shadow-md rounded bg-white/5 p-1" alt={p.nome} />}
                                 <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{p.nome}</span>
                             </div>
                         ))}
                     </div>
                 </div>
            )}

            <AnimatePresence mode='wait'>
                <motion.div
                    key={isSorteando ? 'rolling' : (ganhador ? 'winner' : 'idle')}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.1 }}
                    transition={{ duration: 0.5 }}
                    className="relative z-10 text-center w-full max-w-7xl flex flex-col items-center"
                >
                    {ganhador ? (
                        <div className="space-y-8 animate-in fade-in zoom-in slide-in-from-bottom-24 duration-700 flex flex-col items-center w-full">
                            <div className="mb-6 flex flex-col items-center gap-2">
                                <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 text-black px-8 py-2 rounded-full text-xl font-black uppercase tracking-[0.3em] shadow-[0_0_80px_rgba(234,179,8,0.6)] animate-bounce">
                                    Ganhador(a) Oficial
                                </span>
                                {premioAtual && (
                                    <span className="text-yellow-200/90 uppercase font-black text-sm tracking-widest mt-4">
                                        Levou: {premioAtual}
                                    </span>
                                )}
                            </div>

                            <div className="w-full flex justify-center items-center px-2" style={{ height: '30vh' }}>
                                <h1
                                    className="font-black text-white neon-text leading-none text-center transition-all duration-300 drop-shadow-2xl"
                                    style={{
                                        whiteSpace: 'nowrap',
                                        fontSize: `clamp(2rem, ${150 / Math.max(ganhador.nome.length, 10)}vw, 12rem)`,
                                        width: '100%',
                                    }}
                                >
                                    {ganhador.nome}
                                </h1>
                            </div>

                            <div className="flex flex-col gap-4 items-center justify-center text-4xl font-mono text-gray-300 mt-8">
                                <p className="text-green-400 font-bold tracking-widest text-[5vw] md:text-5xl bg-green-900/20 px-8 py-3 rounded-2xl border border-green-500/30">
                                    {mascararTelefone(ganhador.telefone)}
                                </p>
                            </div>
                        </div>
                    ) : (
                        // MODO PRE-GAME (IDLE E ROLLING)
                        <div className={`w-full flex justify-center items-center px-2 flex-col gap-8 h-[50vh]`}>
                             {isSorteando && (
                                 <motion.div initial={{opacity:0}} animate={{opacity:1}} className="bg-yellow-500 text-black px-6 py-1 rounded-full font-black tracking-[0.4em] uppercase text-sm animate-pulse">Sorteando</motion.div>
                             )}
                             
                            <h1
                                className={`font-black tracking-tighter transition-all duration-75 ${isSorteando ? 'text-gray-300 opacity-60 blur-[2px]' : 'text-gray-700 opacity-50'}`}
                                style={{
                                    whiteSpace: 'nowrap',
                                    fontSize: `clamp(3rem, ${120 / Math.max(nomeAtual.length, 10)}vw, 8rem)`,
                                    width: '100%',
                                }}
                            >
                                {nomeAtual}
                            </h1>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default PublicDisplay
