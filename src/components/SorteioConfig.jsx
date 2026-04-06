import React, { useState, useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../services/supabaseClient'
import QRCodeDisplay from './QRCodeDisplay'
import PatrocinadorPanel from './PatrocinadorPanel'
import { Save, RadioReceiver, Plus, Check, Archive, Edit3 } from 'lucide-react'

export default function SorteioConfig({ user }) {
   const [titulo, setTitulo] = useState("Meu Grande Sorteio")
   const [dataSorteio, setDataSorteio] = useState("")
   const [tipo, setTipo] = useState("unico")
   const [qtd, setQtd] = useState(1)
   const [premioSel, setPremioSel] = useState("")
   
   const [brindes, setBrindes] = useState([])
   const [todosSorteios, setTodosSorteios] = useState([])
   const [sorteioAtivo, setSorteioAtivo] = useState(null)
   const [loading, setLoading] = useState(false)
   const [partCount, setPartCount] = useState(0)

   const [dataInicio, setDataInicio] = useState("")
   const [dataFim, setDataFim] = useState("")
   const [filterStatus, setFilterStatus] = useState('todos')
   const [ocultarConcluidos, setOcultarConcluidos] = useState(false)

   useEffect(() => {
       if (sorteioAtivo?.id) {
           supabase.from('app_participantes').select('*', { count: 'exact', head: true }).eq('evento_id', sorteioAtivo.id)
           .then(({ count }) => { if (count !== null) setPartCount(count) })
       }
   }, [sorteioAtivo])

   useEffect(() => { if(user) carregaBasics() }, [user])

   const carregaBasics = async () => {
       const { data: bData } = await supabase.from('app_brindes').select('*').eq('user_id', user.id)
       if (bData) setBrindes(bData)

       const { data: sData } = await supabase.from('app_eventos')
           .select('*')
           .eq('radio_id', user.slug)
           .order('created_at', { ascending: false })

       if (sData) {
           setTodosSorteios(sData)
           const ativo = sData.find(s => s.ativo === true)
           if (ativo) {
               preencheForm(ativo, bData || [])
           } else {
               limparForm()
           }
       }
   }

   const preencheForm = (s, brindesLoad) => {
       setSorteioAtivo(s)
       setTitulo(s.titulo || "")
       if (s.data_sorteio) setDataSorteio(s.data_sorteio.slice(0, 16))
       else setDataSorteio("")
       if (s.data_inicio) setDataInicio(s.data_inicio.slice(0, 16))
       else setDataInicio("")
       if (s.data_fim) setDataFim(s.data_fim.slice(0, 16))
       else setDataFim("")
       setTipo(s.modo || "unico")
       setQtd(s.qtd_ganhadores || 1)
       
       const bList = (brindesLoad && brindesLoad.length > 0) ? brindesLoad : brindes
       const brindeObj = bList.find(b => b.id === s.premio_id)
       setPremioSel(brindeObj ? brindeObj.nome_brinde : "")
   }

   const limparForm = () => {
       setSorteioAtivo(null)
       setTitulo("Sorteio " + new Date().toLocaleDateString())
       setDataSorteio("")
       setDataInicio("")
       setDataFim("")
       setTipo("unico")
       setQtd(1)
       setPremioSel("")
       setPartCount(0)
   }

   const ativarEvento = async (id) => {
       setLoading(true)
       try {
           await supabase.from('app_eventos').update({ ativo: false }).eq('radio_id', user.slug)
           const { error } = await supabase.from('app_eventos').update({ ativo: true }).eq('id', id)
           if (error) throw error
           await carregaBasics()
           alert("Sorteio ativado!")
       } catch (err) {
           alert("Erro ao ativar: " + err.message)
       } finally {
           setLoading(false)
       }
   }

   const arquivarEvento = async (id) => {
       if (!confirm("Arquivar este sorteio? ele sairá da lista principal.")) return
       try {
           const { error } = await supabase.from('app_eventos').update({ ativo: false }).eq('id', id)
           if (error) throw error
           await carregaBasics()
       } catch (err) {
           alert("Erro ao arquivar: " + err.message)
       }
   }

   const salvarOuCriar = async () => {
       if (!premioSel) return alert("Por favor, selecione qual prêmio será sorteado.")
       
       setLoading(true)
       const baseSlug = titulo.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random()*10000)
       const novoSlug = sorteioAtivo?.slug || baseSlug;
       
       const objPremio = brindes.find(b => b.nome_brinde === premioSel);
       const pId = objPremio ? objPremio.id : null;

       const payload = {
           radio_id: user.slug,
           titulo,
           slug: novoSlug,
           premio_id: pId,
           data_sorteio: dataSorteio ? new Date(dataSorteio).toISOString() : null,
           data_inicio: dataInicio ? new Date(dataInicio).toISOString() : null,
           data_fim: dataFim ? new Date(dataFim).toISOString() : null,
           modo: tipo,
           qtd_ganhadores: qtd,
           ativo: true
       }
       
       let dbError = null;
       if (sorteioAtivo) {
           const { error } = await supabase.from('app_eventos').update(payload).eq('id', sorteioAtivo.id)
           dbError = error;
       } else {
           await supabase.from('app_eventos').update({ ativo: false }).eq('radio_id', user.slug)
           const { error } = await supabase.from('app_eventos').insert(payload)
           dbError = error;
       }
       
       setLoading(false)
       if (!dbError) {
           await carregaBasics()
           const btn = document.getElementById('btn-salvar-evento');
           if (btn) {
               const old = btn.innerHTML;
               btn.innerHTML = '✅ Dados Salvos!';
               setTimeout(() => { btn.innerHTML = old; }, 3500);
           }
       } else {
           alert("Erro ao salvar: " + dbError.message);
       }
   }

   const getStatusBadge = (s) => {
        if (!s.ativo) return <span className="bg-gray-800 text-gray-500 border border-gray-700 px-2 py-1 rounded-full text-[10px] font-bold">🌑 OFF</span>;
        const now = new Date();
        const start = s.data_inicio ? new Date(s.data_inicio) : null;
        const end = s.data_fim ? new Date(s.data_fim) : null;
        if (start && now < start) return <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-600/30 px-2 py-1 rounded-full text-[10px] font-bold">🟡 ESPERA</span>;
        if (end && now > end) return <span className="bg-red-900/30 text-red-400 border border-red-600/30 px-2 py-1 rounded-full text-[10px] font-bold">🔴 CONCLUÍDO</span>;
        return <span className="bg-green-900/30 text-green-400 border border-green-600/30 px-2 py-1 rounded-full text-[10px] font-bold">🟢 ON</span>;
   }
   
   const isConcluido = (s) => {
        if (!s.ativo) return true;
        if (s.data_fim && new Date() > new Date(s.data_fim)) return true;
        return false;
   }
   
   const isEmAndamento = (s) => {
        if (!s.ativo) return false;
        const now = new Date();
        const start = s.data_inicio ? new Date(s.data_inicio) : null;
        const end = s.data_fim ? new Date(s.data_fim) : null;
        if (start && now < start) return false;
        if (end && now > end) return false;
        return true;
   }
   
   const sorteiosFiltrados = todosSorteios.filter(s => {
        if (ocultarConcluidos && isConcluido(s)) return false;
        if (filterStatus === 'em_andamento') return isEmAndamento(s);
        if (filterStatus === 'concluidos') return isConcluido(s);
        return true;
   });

   const baseURL = "https://sorteio-studio.vercel.app"

   return (
       <div className="space-y-6">
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-2xl">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                   <div className="flex items-center gap-3">
                       <RadioReceiver className="w-6 h-6 text-indigo-500" />
                       <div>
                           <h2 className="text-xl font-black text-white">Configuração do Evento</h2>
                           <p className="text-xs text-gray-400">Monte o seu sorteio live, defina link e prêmios.</p>
                       </div>
                   </div>
                   <button 
                       onClick={limparForm}
                       className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-xs font-bold border border-gray-700 flex items-center gap-2"
                   >
                       <Plus className="w-4 h-4" /> Criar Novo Sorteio
                   </button>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Título da Campanha</label>
                            <input value={titulo} onChange={e=>setTitulo(e.target.value)} type="text" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" placeholder="Ex: Sorteio Mega Show" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Data / Hora do Sorteio</label>
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-800 pt-4 mt-2">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Abertura das Inscrições</label>
                                <input value={dataInicio} onChange={e=>setDataInicio(e.target.value)} type="datetime-local" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Término das Inscrições</label>
                                <input value={dataFim} onChange={e=>setDataFim(e.target.value)} type="datetime-local" className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white focus:border-indigo-500 outline-none" />
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

                   <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl p-6 bg-black/50">
                       {sorteioAtivo?.slug ? (
                           <div className="w-full flex flex-col items-center gap-5 animate-in fade-in zoom-in duration-500">
                               <h3 className="font-bold text-center text-gray-300 uppercase tracking-widest text-xs">Visão do Público / Escaneie</h3>
                               
                               <div className="bg-white p-3 rounded-xl shadow-[0_0_50px_rgba(255,255,255,0.1)]">
                                   <QRCodeCanvas 
                                        value={`${baseURL}/#/participar/${sorteioAtivo.slug}`} 
                                        size={200} 
                                        level={"H"} 
                                   />
                                   <div className="hidden">
                                        <QRCodeCanvas 
                                            id="qr-download-canvas"
                                            value={`${baseURL}/#/participar/${sorteioAtivo.slug}`} 
                                            size={1000} 
                                            level={"H"} 
                                            marginSize={4}
                                        />
                                   </div>
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
                                                setTimeout(()=> { btn.innerHTML = oldText; }, 2000)
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2.5 px-3 rounded-lg"
                                        >
                                            Copiar Link
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const canvas = document.getElementById('qr-download-canvas');
                                                if(canvas) {
                                                    const pngUrl = canvas.toDataURL("image/png")
                                                    let downloadLink = document.createElement("a");
                                                    downloadLink.href = pngUrl;
                                                    downloadLink.download = `qrcode_${sorteioAtivo.slug}.png`;
                                                    downloadLink.click();
                                                }
                                            }}
                                            className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2.5 px-3 rounded-lg text-center shadow-lg"
                                        >
                                            Baixar QR
                                        </button>
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

           <PatrocinadorPanel sorteioId={sorteioAtivo?.id} />

           {/* LISTA DE SORTEIOS - HISTÓRICO */}
           <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl mt-10">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                   <h3 className="text-lg font-black text-white flex items-center gap-2">📚 Seus Sorteios</h3>
                   <div className="flex flex-wrap items-center gap-2 bg-black/40 p-1.5 rounded-lg border border-gray-800">
                       <button onClick={() => setFilterStatus('em_andamento')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'em_andamento' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}>🟢 Em Andamento</button>
                       <button onClick={() => setFilterStatus('todos')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'todos' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}>🟡 Todos</button>
                       <button onClick={() => setFilterStatus('concluidos')} className={`px-3 py-1.5 rounded text-xs font-bold transition-all ${filterStatus === 'concluidos' ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white'}`}>🔴 Concluídos</button>
                       <div className="w-px h-6 bg-gray-700 mx-1 hidden md:block"></div>
                       <button onClick={() => setOcultarConcluidos(!ocultarConcluidos)} className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-all ${ocultarConcluidos ? 'bg-gray-700 text-white shadow-inner' : 'text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700'}`}>
                           {ocultarConcluidos && <Check className="w-3 h-3 text-green-400" />} Ocultar Concluídos
                       </button>
                   </div>
               </div>
               <div className="overflow-x-auto">
                   <table className="w-full text-left">
                       <thead>
                           <tr className="border-b border-gray-800 text-[10px] text-gray-500 uppercase font-black">
                               <th className="pb-4">Sorteio</th>
                               <th className="pb-4">Data</th>
                               <th className="pb-4">Status</th>
                               <th className="pb-4 text-right pr-4">Ações</th>
                           </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-800/50">
                           {sorteiosFiltrados.map(s => (
                               <tr key={s.id} className={`group ${s.ativo ? 'bg-indigo-900/10' : ''}`}>
                                   <td className="py-4">
                                       <p className="font-bold text-sm text-white">{s.titulo}</p>
                                       <p className="text-[10px] text-gray-500 font-mono">/{s.slug}</p>
                                   </td>
                                   <td className="py-4 text-xs text-gray-400">
                                       {s.data_sorteio ? new Date(s.data_sorteio).toLocaleDateString() : '-'}
                                   </td>
                                   <td className="py-4">
                                       {getStatusBadge(s)}
                                   </td>
                                   <td className="py-4 text-right pr-4">
                                       <div className="flex justify-end gap-2">
                                           {!s.ativo && (
                                               <button onClick={() => ativarEvento(s.id)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-[10px] font-bold border border-green-600/30 flex items-center gap-1 transition-all">
                                                   <Check className="w-3 h-3" /> Ativar
                                               </button>
                                           )}
                                           <button onClick={() => { preencheForm(s, brindes); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-1 rounded text-[10px] font-bold border border-gray-700 flex items-center gap-1 transition-all">
                                               <Edit3 className="w-3 h-3" /> Editar
                                           </button>
                                           <button onClick={() => arquivarEvento(s.id)} className="text-[10px] font-bold text-red-500 hover:bg-red-900/20 px-3 py-1 rounded flex items-center gap-1 transition-all border border-red-900/30">
                                               <Archive className="w-3 h-3" /> Arquivar
                                           </button>
                                       </div>
                                   </td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
       </div>
   )
}
