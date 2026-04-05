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

            // Role Source of Truth (Database)
            const role = profile?.role === 'admin' || session.user.email === 'gilcleberlocutor@gmail.com' 
                ? 'super_admin' 
                : 'radio_admin'

            const isAdmin = role === 'super_admin'
            
            let finalUserId = session.user.id
            let finalSlug = profile?.slug

            // Master Impersonation Bypass
            if (isAdmin) {
                const impId = sessionStorage.getItem('impersonate_user_id')
                const impSlug = sessionStorage.getItem('impersonate_slug')
                if (impId) {
                    finalUserId = impId
                    finalSlug = impSlug
                }
            }

            // Persistência de Contexto (Radio)
            if (finalSlug) {
                localStorage.setItem('radioSlug', finalSlug)
            }

            // Injeta Role, Slug e ID real/impersonado
            const userWithRole = {
                ...session.user,
                id: finalUserId,
                role: role,
                isAdmin: isAdmin,
                slug: finalSlug,
                nome_completo: profile?.nome_completo,
                realId: session.user.id
            }
            setUser(userWithRole)
        } else {
            setUser(null)
            setLicense(null)
            sessionStorage.removeItem('impersonate_user_id')
            sessionStorage.removeItem('impersonate_slug')
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
