import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Plus, Trash2, Image, Edit2, Upload, Loader2 } from 'lucide-react'

export default function PatrocinadorPanel({ radioSlug }) {
  const [patrocinadores, setPatrocinadores] = useState([])
  const [nome, setNome] = useState("")
  const [logo, setLogo] = useState("")
  const [link, setLink] = useState("")
  const [editandoId, setEditandoId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
      if(radioSlug) carregar()
  }, [radioSlug])

  const carregar = async () => {
      const { data } = await supabase.from('app_patrocinadores').select('*').eq('radio_id', radioSlug)
      if (data) setPatrocinadores(data)
  }

  const handleFileUpload = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      setUploading(true)
      try {
          const fileExt = file.name.split('.').pop()
          const fileName = `${radioSlug}/sponsor-${Date.now()}.${fileExt}`

          const { error } = await supabase.storage
              .from('radio-logos') // Reutilizando o bucket de logos
              .upload(fileName, file)

          if (error) throw error

          const { data: { publicUrl } } = supabase.storage
              .from('radio-logos')
              .getPublicUrl(fileName)

          setLogo(publicUrl)
      } catch (err) {
          alert("Erro no upload: " + err.message)
      } finally {
          setUploading(false)
      }
  }

  const salvarOuEditar = async () => {
      if (!nome) return alert("O Nome ou Marca do patrocinador é obrigatório!")
      setSaving(true)
      
      const payload = { 
          radio_id: radioSlug, 
          nome,
          logo_url: logo || null,
          link: link || null
      };

      try {
          if (editandoId) {
              const { error } = await supabase.from('app_patrocinadores').update(payload).eq('id', editandoId)
              if (error) throw error
          } else {
              const { error } = await supabase.from('app_patrocinadores').insert(payload)
              if (error) throw error
          }
          carregar()
          limparForm()
      } catch (error) {
          alert("Erro ao salvar: " + error.message)
      } finally {
          setSaving(false)
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
      if(!confirm("Remover patrocinador do banco? Ele deixará de aparecer em todos os sorteios vinculados.")) return
      await supabase.from('app_patrocinadores').delete().eq('id', id)
      carregar()
  }

  if (!radioSlug) return <div className="text-gray-500 text-sm text-center py-6 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/50">⚠️ Erro ao carregar rádio identificada.</div>

  return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 shadow-lg">
         <h3 className="text-lg font-bold text-white mb-1">🏦 Banco de Patrocinadores (Global)</h3>
         <p className="text-xs text-gray-400 mb-5">Cadastre seus parceiros e reutilize-os em qualquer sorteio.</p>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 bg-black p-4 rounded-xl border border-gray-800">
            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Nome da Marca</label>
                <input value={nome} onChange={e=>setNome(e.target.value)} type="text" placeholder="Ex: Coca-Cola" className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-purple-500" />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Logo / Imagem</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input value={logo} onChange={e=>setLogo(e.target.value)} type="text" placeholder="URL da Logo" className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-xs outline-none text-white focus:border-purple-500 pr-8" />
                        {logo && <img src={logo} className="absolute right-2 top-2 w-5 h-5 object-contain bg-white rounded" />}
                    </div>
                    <label className="bg-gray-800 hover:bg-gray-700 border border-gray-700 p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> : <Upload className="w-4 h-4 text-gray-400" />}
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase ml-1">Link (Opcional)</label>
                <input value={link} onChange={e=>setLink(e.target.value)} type="url" placeholder="https://..." className="w-full bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5 text-sm outline-none text-white focus:border-purple-500" />
            </div>
            
            <div className="flex items-end pb-0.5">
                <div className="flex gap-2 w-full">
                    {editandoId && (
                        <button onClick={limparForm} className="bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold px-3 transition-all" title="Cancelar Edição">✕</button>
                    )}
                    <button disabled={saving || uploading} onClick={salvarOuEditar} className={`${editandoId ? 'bg-orange-600 hover:bg-orange-500' : 'bg-purple-600 hover:bg-purple-500'} flex-1 h-10 rounded-lg text-white flex items-center justify-center text-[10px] md:text-xs font-black tracking-widest gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50`}>
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editandoId ? "SALVAR EDIÇÃO" : <><Plus className="w-4 h-4"/> ADICIONAR AO BANCO</>}
                    </button>
                </div>
            </div>
         </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {patrocinadores.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-gray-800/20 p-3 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all group">
                    <div className="flex items-center gap-3">
                        {p.logo_url ? <img src={p.logo_url} className="w-10 h-10 rounded-lg bg-white object-contain p-1 border border-gray-700" /> : <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center border border-gray-700"><Image className="w-5 h-5 text-gray-600"/></div>}
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{p.nome}</p>
                            {p.link && <p className="text-[9px] text-gray-500 truncate">{p.link.replace('https://', '')}</p>}
                        </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={()=>prepararEdicao(p)} className="text-gray-400 hover:text-orange-400 p-1.5 rounded-lg transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={()=>remover(p.id)} className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            ))}
            {patrocinadores.length === 0 && <p className="col-span-full text-center text-[10px] font-mono text-gray-600 py-6 border border-dashed border-gray-800 rounded-xl">Nenhum parceiro cadastrado no banco global.</p>}
         </div>
      </div>
  )
}
