import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { supabase } from '../services/supabaseClient'
import { Home, Settings, DollarSign, Shield, LogOut, Radio, MonitorPlay, PenTool, List, Gift } from 'lucide-react'

const Sidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { user, signOut } = useAuth()
    const { theme } = useTheme()
    const [userSlug, setUserSlug] = useState('')
    const [radioName, setRadioName] = useState('')

    useEffect(() => {
        if (user) {
            fetchUserProfile()
        }
    }, [user])

    const fetchUserProfile = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('slug, nome_completo')
                .eq('id', user.id)
                .single()

            if (data) {
                if (data.slug) {
                    setUserSlug(data.slug)
                    localStorage.setItem('radioSlug', data.slug)
                }
                if (data.nome_completo) {
                    setRadioName(data.nome_completo)
                }
            }
        } catch (err) {
            console.error('Erro ao buscar perfil:', err)
        }
    }

    const menuItems = user?.role === 'super_admin' ? [
        {
            name: 'Super Admin',
            icon: Shield,
            path: '/super-admin',
            show: true
        },
        {
            name: 'Financeiro',
            icon: DollarSign,
            path: '/financeiro',
            show: true
        },
        {
            name: 'Gestão de Rádios',
            icon: Radio,
            path: '/super-admin',
            show: true
        }
    ] : [
        {
            name: '🎯 Painel Ao Vivo',
            icon: Home,
            path: '/',
            show: true
        },
        {
            name: '🎁 Criar Sorteios',
            icon: Gift,
            path: '/configuracoes-sorteio',
            show: true
        },
        {
            name: '📄 Link e Forms',
            icon: PenTool,
            path: '/formulario',
            show: true
        },
        {
            name: '📺 Modo Telão',
            icon: MonitorPlay,
            path: '/telao',
            show: true,
            external: true
        },
        {
            name: '🧾 Relatórios',
            icon: List,
            path: '/relatorios',
            show: true
        },
        {
            name: '⚙️ Perfil e Cores',
            icon: Settings,
            path: '/configuracoes',
            show: true
        }
    ]

    const handleLogout = async () => {
        try {
            // Tenta pegar do state ou localStorage
            const slugToRedirect = userSlug || localStorage.getItem('radioSlug')

            await signOut()

            // Redirecionar para login via PIN se tiver slug, senão para login normal
            if (slugToRedirect) {
                window.location.href = `#/radio/${slugToRedirect}` // Força redirect via window
            } else {
                navigate('/login')
            }
        } catch (err) {
            console.error('Erro ao fazer logout:', err)
            await signOut()
            navigate('/login')
        }
    }

    return (
        <div className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
            {/* Logo/Header */}
            <div className="p-6 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: theme.primary_color || '#3f197f' }}
                    >
                        {theme.logo_url ? (
                            <img src={theme.logo_url} alt="Logo" className="w-6 h-6 object-contain" />
                        ) : (
                            <Radio className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-white font-bold text-lg line-clamp-1" title={radioName || 'Sorteio Studio'}>
                            {radioName || 'Sorteio Studio'}
                        </h1>
                        <p className="text-gray-400 text-xs">{theme.slogan || 'Gestão de Sorteios'}</p>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-800">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: theme.primary_color || '#3f197f' }}
                    >
                        {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">
                            {user?.email}
                        </p>
                        {user?.isAdmin && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: `${theme.primary_color}33` || '#3f197f33',
                                    color: theme.primary_color || '#a78bfa'
                                }}
                            >
                                Admin
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {menuItems.filter(item => item.show).map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.path

                    return (
                        <button
                            key={item.name}
                            onClick={() => {
                                if (item.external) {
                                    // Pega o último evento_id se existir
                                    const eventId = localStorage.getItem('last_evento_id')
                                    const path = eventId ? `${item.path}/${eventId}` : item.path
                                    // Adiciona o /# para compatibilidade com HashRouter na Vercel
                                    window.open(`${window.location.origin}/#${path}`, '_blank')
                                } else {
                                    navigate(item.path)
                                }
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'text-white shadow-lg'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            style={isActive ? {
                                backgroundColor: theme.primary_color || '#3f197f',
                                boxShadow: `0 10px 15px -3px ${theme.primary_color}50` || '0 10px 15px -3px #3f197f50'
                            } : {}}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.name}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-900/20 transition-all"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Sair</span>
                </button>
            </div>
        </div>
    )
}

export default Sidebar
