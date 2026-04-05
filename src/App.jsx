import React, { Component } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import AdminPanel from './components/AdminPanel'
import PublicDisplay from './components/PublicDisplay'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import Login from './pages/Login'
import Register from './pages/Register'
import PrivateRoute from './components/PrivateRoute'
import SuperAdmin from './pages/SuperAdmin'
import RadioLogin from './pages/RadioLogin'
import ChangePinPage from './pages/ChangePinPage'
import ClientSettings from './pages/ClientSettings'
import FinancePanel from './pages/FinancePanel'
import Layout from './components/Layout'
import PaginaParticipacao from './components/PaginaParticipacao' // ROTA DA FASE 2

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-10 text-center text-white">
          <h1 className="text-3xl font-bold text-red-500 mb-4">Ops! Algo deu errado.</h1>
          <p className="text-gray-300 mb-4">Infelizmente o app crashou. Erro técnico:</p>
          <pre className="bg-gray-900 p-4 rounded text-left overflow-auto max-w-2xl mx-auto border border-red-900">
            {this.state.error && this.state.error.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-primary px-6 py-2 rounded hover:bg-primary/80"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/telao" element={<PublicDisplay />} />
              <Route path="/telao/:evento_id" element={<PublicDisplay />} />
              <Route path="/participar/:slug" element={<PaginaParticipacao />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/radio/:slug" element={<RadioLogin />} />
              <Route path="/trocar-pin" element={<ChangePinPage />} />

              {/* Rotas Protegidas (Logado - Rádio) */}
              <Route
                path="/"
                element={
                  <PrivateRoute requiredRole="radio_admin">
                    <Layout>
                      <AdminPanel initialView="sorteio" />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/configuracoes-sorteio"
                element={
                  <PrivateRoute requiredRole="radio_admin">
                    <Layout>
                      <AdminPanel initialView="config" />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/formulario"
                element={
                  <PrivateRoute requiredRole="radio_admin">
                    <Layout>
                      <AdminPanel initialView="forms" />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/relatorios"
                element={
                  <PrivateRoute requiredRole="radio_admin">
                    <Layout>
                      <AdminPanel initialView="relatorios" />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/configuracoes"
                element={
                  <PrivateRoute requiredRole="radio_admin">
                    <Layout>
                      <ClientSettings />
                    </Layout>
                  </PrivateRoute>
                }
              />

              {/* Rotas Protegidas (Logado - Super Admin) */}
              <Route
                path="/super-admin"
                element={
                  <PrivateRoute requiredRole="super_admin">
                    <Layout>
                      <SuperAdmin />
                    </Layout>
                  </PrivateRoute>
                }
              />
              <Route
                path="/financeiro"
                element={
                  <PrivateRoute requiredRole="super_admin">
                    <Layout>
                      <FinancePanel />
                    </Layout>
                  </PrivateRoute>
                }
              />
            </Routes>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
