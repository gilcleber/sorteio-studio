import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { Save, Plus, Trash2 } from 'lucide-react'

export default function FormularioConfig({ user }) {
  const [campos, setCampos] = useState([
     { id: 'nome', label: 'Nome Completo', required: true, fixed: true, active: true },
     { id: 'telefone', label: 'WhatsApp', required: true, fixed: true, active: true },
     { id: 'cidade', label: 'Cidade', required: true, fixed: true, active: true },
     { id: 'cpf', label: 'CPF', required: false, fixed: false, active: true },
     { id: 'email', label: 'E-mail', required: false, fixed: false, active: false },
     { id: 'instagram', label: 'Instagram', required: false, fixed: false, active: true }
  ])
  const [mensagemBase, setMensagemBase] = useState("Sua participação foi confirmada. Fique ligado ao vivo!")
  const [linkInsta, setLinkInsta] = useState("")
  const [linkSite, setLinkSite] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
      if(user) carregarConfig()
  }, [user])

  const carregarConfig = async () => {
      // Pega o id do evento rodando
      const { data: evData } = await supabase.from('app_eventos').select('id').eq('radio_id', user.slug).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single()
      if (!evData) return;

      const { data } = await supabase.from('app_formulario_config').select('*').eq('evento_id', evData.id).single()
      if (data) {
          if (data.campos?.length > 0) setCampos(data.campos)
          if (data.acao_pos_participacao) {
              setMensagemBase(data.acao_pos_participacao.mensagem || "")
              setLinkInsta(data.acao_pos_participacao.instagram_url || "")
              setLinkSite(data.acao_pos_participacao.link_externo || "")
          }
      }
  }

  const salvar = async () => {
      setLoading(true)

      const { data: evData } = await supabase.from('app_eventos').select('id').eq('radio_id', user.slug).eq('ativo', true).order('created_at', { ascending: false }).limit(1).single()
      if (!evData) {
          setLoading(false)
          return alert("Erro: Você não possui um Sorteio Ativo. Por favor, crie/salve um novo Sorteio primeiro na tela anterior.")
      }

      const payload = {
          radio_id: user.id,
          evento_id: evData.id,
          campos,
          acao_pos_participacao: { mensagem: mensagemBase, instagram_url: linkInsta, link_externo: linkSite }
      }
      
      const { data } = await supabase.from('app_formulario_config').select('id').eq('evento_id', evData.id).single()
      let dbError = null;
      if (data) {
          const { error } = await supabase.from('app_formulario_config').update(payload).eq('evento_id', evData.id)
          dbError = error;
      } else {
          const { error } = await supabase.from('app_formulario_config').insert(payload)
          dbError = error;
      }
      setLoading(false)

      if (dbError) {
          alert("Erro de permissão no Banco (RLS): " + dbError.message);
          return;
      }

      const btn = document.getElementById('btn-salvar-form');
      if (btn) {
          const old = btn.innerHTML;
          btn.innerHTML = '✅ Formulário salvo no Supabase!';
          btn.classList.add('bg-green-600');
          setTimeout(() => { btn.innerHTML = old; btn.classList.remove('bg-green-600') }, 3000);
      }
  }

  const addCustomCampo = () => {
      const nome = prompt("Criar Campo Extra. Digite o Título (ex: 'Idade', 'Bairro', 'Qual seu Time?'):")
      if (nome) {
          setCampos([...campos, { id: 'custom_'+Date.now(), label: nome, required: false, fixed: false, active: true }])
      }
  }

  return (
      <div className="space-y-6">
          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800">
             <h3 className="text-lg font-bold text-blue-400 mb-4">Campos da Landing Page do Sorteio</h3>
             <p className="text-xs text-gray-500 mb-4">Marque quais caixas de formulário os participantes verão ao escancear seu QR Code.</p>
             
             <div className="space-y-3 mb-4">
                 {campos.map((c, i) => (
                     <div key={c.id} className="flex justify-between items-center bg-gray-950 p-3 rounded-lg border border-gray-800">
                         <div className="flex gap-3 items-center">
                             <input type="checkbox" checked={c.active} disabled={c.fixed} onChange={(e) => {
                                 const n = [...campos]; n[i].active = e.target.checked; setCampos(n)
                             }} className="w-5 h-5 accent-blue-500 rounded cursor-pointer" />
                             <span className="font-medium text-sm text-gray-200">{c.label} {c.fixed && <span className="text-[10px] bg-red-900/30 text-red-400 px-2 ml-2 rounded font-bold">Essencial/Obrigatório</span>}</span>
                         </div>
                         {!c.fixed && (
                             <button onClick={() => setCampos(campos.filter(x => x.id !== c.id))} className="text-gray-600 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                         )}
                     </div>
                 ))}
             </div>
             <button onClick={addCustomCampo} className="text-sm bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-lg text-white flex items-center justify-center w-full gap-2 transition-all"><Plus className="w-4 h-4"/> Adicionar Campo Personalizado</button>
          </div>

          <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 space-y-4 shadow-xl">
             <h3 className="text-lg font-bold text-yellow-400 mb-2">Ação Pós-Inscrição (Marketing)</h3>
             <p className="text-xs text-gray-500 mb-4">O que seu público verá na tela verde ao finalizar o envio da participação.</p>
             <div>
                <label className="text-xs text-gray-400 uppercase block mb-1">Frase Central de Sucesso</label>
                <input value={mensagemBase} onChange={e=>setMensagemBase(e.target.value)} type="text" className="w-full bg-black border border-gray-800 rounded-lg p-3 outline-none focus:border-yellow-500 text-sm text-white" placeholder="Boa Sorte! Ouça o resultado ao vivo as 18h..." />
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-pink-500 uppercase block mb-1">Botão Perfil Instagram (URL)</label>
                    <input value={linkInsta} onChange={e=>setLinkInsta(e.target.value)} type="url" className="w-full bg-black border border-gray-800 rounded-lg p-3 outline-none focus:border-pink-500 text-sm text-white" placeholder="https://instagram.com/..." />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-blue-500 uppercase block mb-1">Botão Site / Patrocinador</label>
                    <input value={linkSite} onChange={e=>setLinkSite(e.target.value)} type="url" className="w-full bg-black border border-gray-800 rounded-lg p-3 outline-none focus:border-blue-500 text-sm text-white" placeholder="https://..." />
                 </div>
             </div>
          </div>

          <button id="btn-salvar-form" disabled={loading} onClick={salvar} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-green-900/20 active:scale-95 transition-all"><Save className="w-5 h-5"/> SALVAR REGRAS DO BOTÃO E FORMULÁRIO</button>
      </div>
  )
}
