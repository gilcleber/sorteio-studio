import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [license, setLicense] = useState(null)

    useEffect(() => {
        // 1. Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleSession(session)
        })

        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            handleSession(session)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleSession = async (session) => {
        setSession(session)
        if (session?.user) {
            // Busca Perfil para saber se é Admin
            const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
            const { data: licenseData } = await supabase.from('licenses').select('*').eq('user_id', session.user.id).single()

            setLicense(licenseData)

            // Injeta isAdmin e Slug no usuário
            const userWithRole = {
                ...session.user,
                isAdmin: profile?.role === 'admin' || session.user.email === 'gilcleberlocutor@gmail.com', // Fallback de segurança
                slug: profile?.slug // Usado como radio_id na app_eventos
            }
            setUser(userWithRole)
        } else {
            setUser(null)
            setLicense(null)
        }
        setLoading(false)
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setLicense(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, session, license, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthContext
