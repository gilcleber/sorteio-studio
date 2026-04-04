import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Plus, Trash2, Image, Edit2 } from 'lucide-react'

export default function PatrocinadorPanel({ sorteioId }) {
  const [patrocinadores, setPatrocinadores] = useState([])
  const [nome, setNome] = useState("")
  const [logo, setLogo] = useState("")
  const [link, setLink] = useState("")
  const [editandoId, setEditandoId] = useState(null)

  useEffect(() => {
      if(sorteioId) carregar()
  }, [sorteioId])

  const carregar = async () => {
      const { data } = await supabase.from('app_patrocinadores').select('*').eq('evento_id', sorteioId)
      if (data) setPatrocinadores(data)
  }

  const salvarOuEditar = async () => {
      if (!nome) return alert("O Nome ou Marca do patrocinador é obrigatório!")
      const payload = { 
          evento_id: sorteioId, 
          nome,
          logo_url: logo || null,
          link: link || null
      };

      if (editandoId) {
          const { error } = await supabase.from('app_patrocinadores').update(payload).eq('id', editandoId)
          if (!error) { 
              carregar(); limparForm() 
          } else alert("Erro ao editar: " + error.message)
      } else {
          const { error } = await supabase.from('app_patrocinadores').insert(payload)
          if (!error) { 
              carregar(); limparForm() 
          } else alert("Erro ao adicionar: " + error.message)
      }
  }

  const limparForm = () => {
      setNome(""); setLogo(""); setLink(""); setEditandoId(null);
  }

  const prepararEdicao = (p) => {
      setNome(p.nome);
      setLogo(p.logo_url || "");
      setLink(p.link || "");
      setEditandoId(p.id);
  }

  const remover = async (id) => {
      await supabase.from('app_patrocinadores').delete().eq('id', id)
      carregar()
  }

  if (!sorteioId) return <div className="text-gray-500 text-sm text-center py-6 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/50">⚠️ Por favor, salve ou crie o Evento de Sorteio acima ANTES de tentar vincular cotas de patrocínio a ele.</div>

  return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
         <h3 className="text-lg font-bold text-white mb-1">Cotas de Patrocínio / Apoiadores</h3>
         <p className="text-xs text-gray-500 mb-5">Estas marcas aparecerão brilhando pro seu público no Celular e no Telão Ao Vivo.</p>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-black p-4 rounded-xl border border-gray-800">
            <input value={nome} onChange={e=>setNome(e.target.value)} type="text" placeholder="Nome da Marca *" className="bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-purple-500" />
            <input value={logo} onChange={e=>setLogo(e.target.value)} type="url" placeholder="Logo (URL HTTP.png)" className="bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-purple-500" />
            <input value={link} onChange={e=>setLink(e.target.value)} type="url" placeholder="URL do Cliq Site" className="bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-purple-500" />
            
            <div className="flex gap-2">
                {editandoId && (
                    <button onClick={limparForm} className="bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold px-3 transition-all" title="Cancelar Edição">✕</button>
                )}
                <button onClick={salvarOuEditar} className={`${editandoId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-indigo-600 hover:bg-indigo-500'} flex-1 rounded-lg text-white flex items-center justify-center text-[10px] md:text-xs font-bold tracking-wide gap-2 active:scale-95 transition-all shadow-md`}>
                    {editandoId ? "💾 SALVAR EDIÇÃO" : <><Plus className="w-4 h-4"/> ADD COTA</>}
                </button>
            </div>
         </div>

         <div className="space-y-2">
            {patrocinadores.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-gray-800/30 p-3 rounded-lg border border-gray-800 hover:border-indigo-500/50 transition-colors">
                    <div className="flex items-center gap-4">
                        {p.logo_url ? <img src={p.logo_url} className="w-10 h-10 rounded bg-white object-contain p-1" /> : <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center"><Image className="w-5 h-5 text-gray-500"/></div>}
                        <div>
                            <p className="text-sm font-black text-white tracking-wide">{p.nome}</p>
                            {p.link && <a href={p.link} target="_blank" className="text-[10px] text-blue-400 hover:underline">{p.link}</a>}
                        </div>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={()=>prepararEdicao(p)} className="text-gray-500 hover:bg-orange-900/40 hover:text-orange-400 p-2 rounded-full transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={()=>remover(p.id)} className="text-gray-500 hover:bg-red-900/30 hover:text-red-500 p-2 rounded-full transition-colors" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            ))}
            {patrocinadores.length === 0 && <p className="text-center text-xs font-mono text-gray-600 py-4">Sorteio sem parceiros financiadores.</p>}
         </div>
      </div>
  )
}
