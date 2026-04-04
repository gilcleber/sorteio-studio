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
       
       const payload = {
           user_id: user.id,
           slug: sorteioAtivo?.slug || baseSlug,
           premio: premioSel,
           data_sorteio: dataSorteio ? new Date(dataSorteio).toISOString() : null,
           tipo,
           qtd_ganhadores: qtd
       }

       if (sorteioAtivo) {
           const { data } = await supabase.from('app_historico').update(payload).eq('id', sorteioAtivo.id).select().single()
           if (data) setSorteioAtivo(data)
       } else {
           const { data, error } = await supabase.from('app_historico').insert(payload).select().single()
           if (!error && data) setSorteioAtivo(data)
       }
       setLoading(false)
       alert("Sorteio configurado. QRCode Gerado e Pronto pra captação!")
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

                        <button disabled={loading} onClick={salvarOuCriar} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all mt-4"><Save className="w-5 h-5"/> SALVAR DADOS DO SORTEIO</button>
                   </div>

                   {/* Lado Direito: QRCode Sharing e Public Link */}
                   <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl p-6 bg-black/50">
                       {sorteioAtivo?.slug ? (
                           <div className="w-full">
                               <QRCodeDisplay url={`${baseURL}/#/participar/${sorteioAtivo.slug}`} />
                               <div className="mt-4 text-center">
                                   <span className="bg-green-900/30 text-green-400 text-[10px] font-bold px-2 py-1 rounded inline-block">Sorteio Online Acoplado 🟢</span>
                               </div>
                           </div>
                       ) : (
                           <div className="text-center space-y-3">
                               <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto opacity-50">
                                   <RadioReceiver className="w-8 h-8 text-gray-600" />
                               </div>
                               <p className="text-sm text-gray-500 font-medium">Configure os parâmetros à esquerda e Salve para habilitar o painel público e gerar o QR Code.</p>
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
