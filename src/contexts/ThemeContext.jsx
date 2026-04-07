import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabaseClient'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({})

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth()
    const [theme, setTheme] = useState({
        logo_url: '',
        slogan: '',
        primary_color: '#3f197f',
        secondary_color: '#ffffff'
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) {
            fetchTheme()
        } else {
            setLoading(false)
        }
    }, [user])

    const fetchTheme = async (slugOrId = null) => {
        try {
            let targetSlug = null;
            let targetUserId = slugOrId || user?.id;

            if (typeof slugOrId === 'string' && !slugOrId.includes('-')) {
                // Provavelmente é um slug
                targetSlug = slugOrId;
            } else if (targetUserId) {
                const { data: profile } = await supabase.from('profiles').select('slug').eq('id', targetUserId).single()
                targetSlug = profile?.slug;
            }
            
            if (targetSlug) {
                const { data, error } = await supabase
                    .from('app_radios')
                    .select('*')
                    .eq('slug', targetSlug)
                    .maybeSingle()

                if (error) throw error

                if (data) {
                    setTheme({
                        logo_url: data.logo_radio || '/static/default-logo.png',
                        slogan: '', 
                        primary_color: data.cor_padrao || '#1d244a',
                        secondary_color: '#ffffff'
                    })
                } else {
                    setTheme({
                        logo_url: '/static/default-logo.png',
                        slogan: '',
                        primary_color: '#1d244a',
                        secondary_color: '#ffffff'
                    })
                }
            } else {
                 setTheme({
                    logo_url: '/static/default-logo.png',
                    slogan: '',
                    primary_color: '#1d244a',
                    secondary_color: '#ffffff'
                })
            }
        } catch (err) {
            console.error('Erro ao carregar tema:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateTheme = (newTheme) => {
        setTheme({ ...theme, ...newTheme })
    }

    // Aplicar cores CSS customizadas
    useEffect(() => {
        if (!loading) {
            document.documentElement.style.setProperty('--color-primary', theme.primary_color)
            document.documentElement.style.setProperty('--color-secondary', theme.secondary_color)
        }
    }, [theme, loading])

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, loading, refreshTheme: fetchTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export default ThemeContext
