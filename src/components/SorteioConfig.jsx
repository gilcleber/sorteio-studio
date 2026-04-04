import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import QRCodeDisplay from './QRCodeDisplay'
import PatrocinadorPanel from './PatrocinadorPanel'
import { Save, RadioReceiver } from 'lucide-react'

export default function SorteioConfig({ user }) {
   const [titulo, setTitulo] = useState("Meu Grande Sorteio")
   const [dataSorteio, setDataSorteio] = useState("")
   const [tipo, setTipo] = useState("unico")
   const [qtd, setQtd] = useState(1)
   const [premioSel, setPremioSel] = useState("")
   
   const [brindes, setBrindes] = useState([])
   const [sorteioAtivo, setSorteioAtivo] = useState(null)
   const [loading, setLoading] = useState(false)
   const [partCount, setPartCount] = useState(0)

   useEffect(() => {
       if (sorteioAtivo?.user_id) {
           supabase.from('app_participantes').select('*', { count: 'exact', head: true }).eq('user_id', sorteioAtivo.user_id)
           .then(({ count }) => { if (count !== null) setPartCount(count) })
       }
   }, [sorteioAtivo])

   useEffect(() => { if(user) carregaBasics() }, [user])

   const carregaBasics = async () => {
       const { data: bData } = await supabase.from('app_brindes').select('*').eq('user_id', user.id)
       if (bData) setBrindes(bData)

       const { data: sData } = await supabase.from('app_historico')
           .select('*')
           .eq('user_id', user.id)
           .is('data_ganho', null) // Sorteio Atualmente Pendente / Em captação
           .order('created_at', { ascending: false })
           .limit(1)

       if (sData && sData.length > 0) {
           preencheForm(sData[0])
       }
   }

   const preencheForm = (s) => {
       setSorteioAtivo(s)
       setTitulo(s.slug ? s.slug.split('-').slice(0,-1).join(' ').toUpperCase() : "Sorteio " + new Date().toLocaleDateString())
       if (s.data_sorteio) setDataSorteio(s.data_sorteio.slice(0, 16))
       setTipo(s.tipo || "unico")
       setQtd(s.qtd_ganhadores || 1)
       setPremioSel(s.premio || "")
   }

   const salvarOuCriar = async () => {
       if (!premioSel) return alert("Por favor, selecione qual prêmio será sorteado.")
       
       setLoading(true)
       // Gera slug baseada no titulo com random hash no final pra unicidade
       const baseSlug = titulo.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random()*10000)
       
       const novoSlug = sorteioAtivo?.slug || baseSlug;
       const payload = {
           user_id: user.id,
           slug: novoSlug,
           premio: premioSel,
           data_sorteio: dataSorteio ? new Date(dataSorteio).toISOString() : null,
           tipo,
           qtd_ganhadores: qtd
       }
       
       setSorteioAtivo(prev => ({ ...prev, ...payload }));

       let dbError = null;
       if (sorteioAtivo) {
           const { error } = await supabase.from('app_historico').update(payload).eq('id', sorteioAtivo.id)
           dbError = error;
       } else {
           const { error } = await supabase.from('app_historico').insert(payload)
           dbError = error;
       }
       
       setLoading(false)
       
       if (dbError) {
           alert("Bloqueio de Servidor: Suas edições não puderam ser salvas no Banco de Dados. Entre em contato com o suporte. Detalhe: " + dbError.message);
           return;
       }

       const btn = document.getElementById('btn-salvar-evento');
       if (btn) {
           const old = btn.innerHTML;
           btn.innerHTML = '✅ Dados Salvos e Evento Pronto!';
           btn.classList.add('bg-green-600');
           setTimeout(() => { btn.innerHTML = old; btn.classList.remove('bg-green-600') }, 3500);
       }
   }

   const baseURL = "https://sorteio-studio.vercel.app"

   return (
       <div className="space-y-6">
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl">
               <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                   <RadioReceiver className="w-6 h-6 text-indigo-500" />
                   <div>
                       <h2 className="text-xl font-black text-white">Configuração do Evento</h2>
                       <p className="text-xs text-gray-400">Monte o seu sorteio live, defina link e prêmios.</p>
                   </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {/* Lado Esquerdo: Parametros */}
                   <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Título da Campanha</label>
                            <input value={titulo} onChange={e=>setTitulo(e.target.value)} type="text" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="Ex: Sorteio Mega Show" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Data / Hora</label>
                                <input value={dataSorteio} onChange={e=>setDataSorteio(e.target.value)} type="datetime-local" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Qual Prêmio?</label>
                                <select value={premioSel} onChange={e=>setPremioSel(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none">
                                    <option value="">-- Selecione --</option>
                                    {brindes.map(b => <option key={b.id} value={b.nome_brinde}>{b.nome_brinde}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Modo de Extração</label>
                                <select value={tipo} onChange={e=>setTipo(e.target.value)} className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none">
                                    <option value="unico">Vencedor Único</option>
                                    <option value="multiplo">Múltiplos Ganhadores</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Quantidade de Cotas/Prêmios</label>
                                <input value={qtd} onChange={e=>setQtd(Number(e.target.value))} type="number" min="1" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                            </div>
                        </div>

                        <button id="btn-salvar-evento" disabled={loading} onClick={salvarOuCriar} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all mt-4"><Save className="w-5 h-5"/> SALVAR DADOS DO SORTEIO</button>
                   </div>

                   {/* Lado Direito: QRCode Sharing e Public Link */}
                   <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl p-6 bg-black/50">
                       {sorteioAtivo?.slug ? (
                           <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-500">
                               <h3 className="font-bold text-center text-gray-300 uppercase tracking-widest text-xs">Visão do Público / Escaneie</h3>
                               
                               <div className="bg-white p-3 rounded-xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                   <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`https://sorteio-studio.vercel.app/#/participar/${sorteioAtivo.slug}`)}`} alt="QR Code do Sorteio" className="w-48 h-48" />
                               </div>

                               <div className="text-center w-full max-w-[280px]">
                                   <div className="bg-gray-800 text-purple-300 text-[10px] break-all p-3 rounded-lg border border-gray-700 select-all mb-4 text-center font-mono">
                                       {baseURL}/#/participar/{sorteioAtivo.slug}
                                   </div>
                                   
                                   <div className="grid grid-cols-2 gap-3 mb-5">
                                        <button 
                                            onClick={(e) => {
                                                navigator.clipboard.writeText(`${baseURL}/#/participar/${sorteioAtivo.slug}`);
                                                const btn = e.currentTarget;
                                                const oldText = btn.innerHTML;
                                                btn.innerHTML = '✅ Copiado!';
                                                btn.classList.add('bg-green-600', 'text-white');
                                                btn.classList.remove('bg-indigo-600');
                                                setTimeout(()=> { btn.innerHTML = oldText; btn.classList.remove('bg-green-600', 'text-white'); btn.classList.add('bg-indigo-600'); }, 2000)
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg shadow-lg transition-all"
                                        >
                                            Copiar Link
                                        </button>
                                        <a 
                                            href={`https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(`${baseURL}/#/participar/${sorteioAtivo.slug}`)}`}
                                            download="qrcode_sorteio"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2.5 px-3 rounded-lg text-center shadow-lg transition-all"
                                        >
                                            Baixar QR Code
                                        </a>
                                   </div>

                                   <div className="bg-green-900/30 border border-green-500/30 p-2.5 rounded-xl flex items-center justify-center gap-3">
                                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,1)]"></span>
                                       <span className="text-green-400 text-xs font-black uppercase tracking-widest">{partCount} Participantes</span>
                                   </div>
                               </div>
                           </div>
                       ) : (
                           <div className="text-center space-y-3">
                               <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto opacity-50">
                                   <RadioReceiver className="w-8 h-8 text-gray-600" />
                               </div>
                               <p className="text-sm text-gray-500 font-medium">Salve as configurações à esquerda para gerar o Link e o QR Code de participação.</p>
                           </div>
                       )}
                   </div>
               </div>
           </div>

           {/* Patrocinadores vinculados a este sorteio exato */}
           <PatrocinadorPanel sorteioId={sorteioAtivo?.id} />
       </div>
   )
}
