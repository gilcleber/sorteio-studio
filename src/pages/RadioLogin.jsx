import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import PinInput from '../components/PinInput'
import { Lock, Radio, AlertCircle, Loader2 } from 'lucide-react'

const RadioLogin = () => {
    const { slug } = useParams()
    const navigate = useNavigate()

    const [pin, setPin] = useState('')
    const [loading, setLoading] = useState(false)
    const [radioData, setRadioData] = useState(null)
    const [radioBrand, setRadioBrand] = useState(null)
    const [error, setError] = useState('')
    const [loadingRadio, setLoadingRadio] = useState(true)

    useEffect(() => {
        const checkSessionAndAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            
            // 1. Busca perfil para validar role real (não confia apenas no email hardcoded)
            let isMaster = false
            if (session?.user) {
                const { data: prof } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
                isMaster = prof?.role === 'admin' || session.user.email === 'gilcleberlocutor@gmail.com'
            }
            
            if (isMaster) {
                // Impersonate mode: Master becomes the radio (TAB-ONLY)
                const { data: p } = await supabase.from('profiles').select('id').eq('slug', slug).single()
                if (p) {
                    sessionStorage.setItem('impersonate_user_id', p.id)
                    sessionStorage.setItem('impersonate_slug', slug)
                    // Redireciona para o painel principal preservando a sessão Master
                    window.location.href = '#/'
                    return
                }
            }

            // Se NÃO for Master e estiver tentando acessar outra rádio, limpa impersonação
            // Mas NÃO desloga o usuário real (independência de sessões)
            sessionStorage.removeItem('impersonate_user_id')
            sessionStorage.removeItem('impersonate_slug')
            fetchRadioData()
        }
        checkSessionAndAuth()
    }, [slug])

    const fetchRadioData = async () => {
        setLoadingRadio(true)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nome_completo, slug, email')
                .eq('slug', slug)
                .single()

            if (error || !data) {
                setError('Rádio não encontrada. Verifique o link.')
                return
            }

            setRadioData(data)

            // FASE 3: Busca White Label Branding
            const { data: brand } = await supabase.from('app_radios').select('*').eq('slug', slug).maybeSingle()
            if (brand) setRadioBrand(brand)
            
        } catch (err) {
            setError('Erro ao carregar dados da rádio.')
        } finally {
            setLoadingRadio(false)
        }
    }

    const handleLogin = async () => {
        if (pin.length !== 4) {
            setError('Digite o PIN completo (4 dígitos)')
            return
        }

        setLoading(true)
        setError('')

        try {
            console.log('Tentando login com slug:', slug, 'PIN:', pin)

            // 1. Busca perfil pelo slug e PIN
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('slug', slug)
                .eq('pin', pin)
                .single()

            if (profileError || !profile) {
                console.error('Perfil não encontrado ou PIN incorreto:', profileError)
                setError('PIN incorreto. Tente novamente.')
                setLoading(false)
                return
            }

            console.log('Perfil encontrado:', profile)

            // 2. Busca licença explicitamente 
            const { data: license, error: licenseError } = await supabase
                .from('licenses')
                .select('*')
                .eq('user_id', profile.id)
                .maybeSingle()

            if (licenseError) {
                console.error('Erro ao buscar licença:', licenseError)
                setError('Erro ao verificar licença. Tente novamente.')
                setLoading(false)
                return
            }

            if (!license || license.status !== 'active') {
                console.warn('Licença inválida ou inativa:', license)
                setError('Acesso bloqueado. Licença inativa. Contate o suporte.')
                setLoading(false)
                return
            }

            // Verifica se expirou
            if (license.expires_at) {
                const now = new Date()
                const expiry = new Date(license.expires_at)
                if (now > expiry) {
                    setError('Sua licença expirou. Entre em contato para renovar.')
                    setLoading(false)
                    return
                }
            }

            // 3. Login via Supabase Auth
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: profile.email,
                password: pin
            })

            if (authError) {
                console.error('Erro de autenticação (Auth):', authError)
                if (authError.message.includes('Invalid login credentials')) {
                    setError('Erro de credenciais. A senha do sistema pode estar diferente do PIN.')
                } else {
                    setError(`Erro ao logar: ${authError.message}`)
                }
                setLoading(false)
                return
            }

            // Se PIN não foi alterado e não é admin...
            if (!profile.pin_changed) {
                navigate('/trocar-pin', {
                    state: {
                        userId: profile.id,
                        firstLogin: true,
                        radioName: radioData?.nome_completo,
                        radioSlug: slug
                    }
                })
            } else {
                // CORREÇÃO ROBUSTA DE LOOP
                // Verifica a sessão ativamente em loop antes de redirecionar
                let attempts = 0
                const checkSessionInterval = setInterval(async () => {
                    attempts++
                    const { data: { session: activeSession } } = await supabase.auth.getSession()

                    if (activeSession) {
                        clearInterval(checkSessionInterval)
                        // Delay extra para propagação no Context
                        setTimeout(() => {
                            // Redirecionamento forçado para limpar estado
                            window.location.href = '#/'
                            window.location.reload()
                        }, 500)
                    } else if (attempts > 10) {
                        clearInterval(checkSessionInterval)
                        setError('Erro: Login demorou muito. Tente recarregar a página.')
                        setLoading(false)
                    }
                }, 500)
            }

        } catch (err) {
            console.error('Erro inesperado no login:', err)
            setError('Erro inesperado. Tente novamente.')
            setLoading(false)
        }
    }

    useEffect(() => {
        if (pin.length === 4) {
            handleLogin()
        }
    }, [pin])

    if (loadingRadio) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
            </div>
        )
    }

    if (error && !radioData) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
                <div className="bg-gray-900 rounded-2xl border border-red-500/50 p-8 max-w-md w-full text-center">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Ops!</h1>
                    <p className="text-gray-400">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors" style={{ backgroundColor: radioBrand?.cor_padrao ? `${radioBrand.cor_padrao}15` : '#030712' }}>
            <div className="bg-gray-900/90 backdrop-blur-xl rounded-3xl border border-gray-800 shadow-2xl p-8 max-w-md w-full relative overflow-hidden">
                
                {/* Efeito Glow da cor da Rádio */}
                {radioBrand?.cor_padrao && (
                    <div className="absolute -top-20 -left-20 w-64 h-64 blur-[100px] opacity-20 pointer-events-none" style={{ backgroundColor: radioBrand.cor_padrao }} />
                )}

                {/* Logo/Ícone da Rádio */}
                <div className="flex justify-center mb-6">
                    {radioBrand?.logo_radio ? (
                        <div className="p-2 bg-white/5 rounded-2xl border border-gray-800 shadow-lg">
                            <img src={radioBrand.logo_radio} alt={radioBrand.nome || radioData?.nome_completo} className="h-20 object-contain" />
                        </div>
                    ) : (
                        <div className="bg-purple-600/20 p-4 rounded-full" style={radioBrand?.cor_padrao ? { backgroundColor: `${radioBrand.cor_padrao}33` } : {}}>
                            <Radio className="w-12 h-12 text-purple-400" style={radioBrand?.cor_padrao ? { color: radioBrand.cor_padrao } : {}} />
                        </div>
                    )}
                </div>

                {/* Nome da Rádio */}
                <h1 className="text-2xl font-bold text-white text-center mb-2 drop-shadow-md">
                    {radioBrand?.nome || radioData?.nome_completo || 'Rádio'}
                </h1>
                <p className="text-gray-500 text-center mb-8 text-sm font-medium">
                    Digite seu PIN de acesso
                </p>

                {/* Input de PIN */}
                <div className="mb-6">
                    <PinInput
                        value={pin}
                        onChange={setPin}
                        disabled={loading}
                    />
                </div>

                {/* Mensagem de Erro */}
                {error && radioData && (
                    <div className="bg-red-900/20 border border-red-500/50 rounded-xl p-3 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center gap-2 text-purple-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Verificando...</span>
                    </div>
                )}

                {/* Ícone de Segurança */}
                <div className="mt-8 flex items-center justify-center gap-2 text-gray-600 text-xs">
                    <Lock className="w-3 h-3" />
                    <span>Acesso seguro e criptografado</span>
                </div>
            </div>
        </div>
    )
}

export default RadioLogin
