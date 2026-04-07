import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { Palette, Upload, Type, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

const ClientSettings = () => {
    const { user } = useAuth()

    const [settings, setSettings] = useState({
        slogan: '',
        logo_url: '',
        primary_color: '#3f197f',
        secondary_color: '#ffffff'
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState({ type: '', text: '' })
    const [logoFile, setLogoFile] = useState(null)
    const [logoPreview, setLogoPreview] = useState('')

    useEffect(() => {
        if (user) {
            fetchSettings()
        }
    }, [user])

    const fetchSettings = async () => {
        try {
            // Primeiro busca o slug do perfil vinculado ao usuário
            const { data: profile } = await supabase.from('profiles').select('slug').eq('id', user.id).single()
            
            if (profile?.slug) {
                const { data, error } = await supabase
                    .from('app_radios')
                    .select('*')
                    .eq('slug', profile.slug)
                    .maybeSingle()

                if (error) throw error

                if (data) {
                    setSettings({
                        nome: data.nome || '',
                        slogan: '', // app_radios não tem slogan
                        logo_url: data.logo_radio || '',
                        primary_color: data.cor_padrao || '#3f197f',
                        secondary_color: '#ffffff'
                    })
                    setLogoPreview(data.logo_radio || '')
                }
            }
        } catch (err) {
            console.error('Erro ao carregar configurações:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleLogoChange = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Apenas imagens são permitidas' })
            return
        }

        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Imagem muito grande. Máximo 2MB' })
            return
        }

        setLogoFile(file)
        const reader = new FileReader()
        reader.onloadend = () => {
            setLogoPreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const uploadLogo = async () => {
        if (!logoFile) return settings.logo_url

        setUploading(true)
        try {
            const fileExt = logoFile.name.split('.').pop()
            const fileName = `${user.id}/logo-${Date.now()}.${fileExt}`

            const { error } = await supabase.storage
                .from('radio-logos')
                .upload(fileName, logoFile, {
                    cacheControl: '3600',
                    upsert: true
                })

            if (error) throw error

            const { data: { publicUrl } } = supabase.storage
                .from('radio-logos')
                .getPublicUrl(fileName)

            return publicUrl
        } catch (err) {
            console.error('Erro ao fazer upload:', err)
            return settings.logo_url
        } finally {
            setUploading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage({ type: '', text: '' })

        try {
            const { data: profile } = await supabase.from('profiles').select('slug').eq('id', user.id).single()
            if (!profile?.slug) throw new Error("Slug da rádio não encontrado")

            let logoUrl = settings.logo_url
            if (logoFile) {
                logoUrl = await uploadLogo()
            }

            const dataToSave = {
                nome: settings.nome,
                logo_radio: logoUrl || null,
                cor_padrao: settings.primary_color,
                slug: profile.slug,
                owner: user.id
            }

            const { error } = await supabase
                .from('app_radios')
                .upsert(dataToSave, { onConflict: 'slug' })

            if (error) throw error

            setLogoFile(null)
            setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
            setTimeout(() => setMessage({ type: '', text: '' }), 3000)

        } catch (err) {
            console.error('Erro ao salvar:', err)
            setMessage({ type: 'error', text: `Erro ao salvar: ${err.message}` })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-950 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Personalização</h1>
                    <p className="text-gray-400">Customize a aparência da sua rádio</p>
                </div>

                {/* Mensagem de Feedback */}
                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-900/20 border-green-500/50 text-green-400'
                        : 'bg-red-900/20 border-red-500/50 text-red-400'
                        }`}>
                        {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <span>{message.text}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Formulário */}
                    <div className="space-y-6">
                        {/* Logo */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Upload className="w-5 h-5 text-purple-400" />
                                <h2 className="text-lg font-bold text-white">Logo</h2>
                            </div>

                            <div className="space-y-4">
                                {logoPreview && (
                                    <div className="bg-gray-800 rounded-xl p-4 flex items-center justify-center">
                                        <img src={logoPreview} alt="Logo preview" className="max-h-32 object-contain" />
                                    </div>
                                )}

                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoChange}
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                                />
                                <p className="text-xs text-gray-500">PNG, JPG ou GIF. Máximo 2MB.</p>
                            </div>
                        </div>

                        {/* Nome da Rádio */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Type className="w-5 h-5 text-purple-400" />
                                <h2 className="text-lg font-bold text-white">Nome da Rádio</h2>
                            </div>

                            <input
                                type="text"
                                value={settings.nome}
                                onChange={(e) => setSettings({ ...settings, nome: e.target.value })}
                                placeholder="Ex: Rádio Top FM"
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                            />
                        </div>

                        {/* Cores */}
                        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Palette className="w-5 h-5 text-purple-400" />
                                <h2 className="text-lg font-bold text-white">Cores</h2>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Cor Primária</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={settings.primary_color}
                                            onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                            className="w-16 h-12 rounded-lg cursor-pointer border-2 border-gray-700"
                                        />
                                        <input
                                            type="text"
                                            value={settings.primary_color}
                                            onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm text-gray-400 mb-2 block">Cor Secundária</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={settings.secondary_color}
                                            onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                            className="w-16 h-12 rounded-lg cursor-pointer border-2 border-gray-700"
                                        />
                                        <input
                                            type="text"
                                            value={settings.secondary_color}
                                            onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botão Salvar */}
                        <button
                            onClick={handleSave}
                            disabled={saving || uploading}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {(saving || uploading) ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {uploading ? 'Fazendo upload...' : 'Salvando...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 sticky top-6">
                        <h2 className="text-lg font-bold text-white mb-4">Preview</h2>

                        <div
                            className="rounded-xl p-8 min-h-[400px] flex flex-col items-center justify-center text-center"
                            style={{
                                background: `linear-gradient(135deg, ${settings.primary_color} 0%, ${settings.primary_color}dd 100%)`,
                                color: settings.secondary_color
                            }}
                        >
                            {logoPreview && (
                                <img src={logoPreview} alt="Logo" className="max-h-24 mb-6 object-contain" />
                            )}

                            <h3 className="text-2xl font-bold mb-2">Sua Rádio</h3>

                            {settings.slogan && (
                                <p className="text-sm opacity-90">{settings.slogan}</p>
                            )}

                            <div className="mt-8 flex gap-2">
                                <div
                                    className="w-12 h-12 rounded-full"
                                    style={{ backgroundColor: settings.secondary_color, opacity: 0.2 }}
                                />
                                <div
                                    className="w-12 h-12 rounded-full"
                                    style={{ backgroundColor: settings.secondary_color, opacity: 0.4 }}
                                />
                                <div
                                    className="w-12 h-12 rounded-full"
                                    style={{ backgroundColor: settings.secondary_color, opacity: 0.6 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ClientSettings
