import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Lock, AlertOctagon } from 'lucide-react'

const PrivateRoute = ({ children, requiredRole }) => {
    const { user, loading, license } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                <p className="mt-4 text-gray-500 animate-pulse">Verificando Credenciais...</p>
            </div>
        )
    }

    if (!user) {
        return <Navigate to="/login" />
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'super_admin') {
        return <Navigate to={user.role === 'super_admin' ? '/super-admin' : '/'} />
    }

    // Opcional: Bloqueio estrito de licença
    // Se quiser permitir acesso 'read-only' ou limitado, removeríamos esse bloco
    if (license && license.status === 'blocked') {
        return (
            <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-white p-6 text-center">
                <AlertOctagon className="w-16 h-16 text-red-500 mb-4" />
                <h1 className="text-3xl font-bold mb-2">Conta Bloqueada</h1>
                <p className="text-gray-400 max-w-md">
                    Sua licença foi suspensa ou bloqueada pelo administrador.
                    Entre em contato com o suporte para regularizar.
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-6 text-purple-400 hover:text-purple-300 underline"
                >
                    Tentar Novamente
                </button>
            </div>
        )
    }

    return children
}

export default PrivateRoute
