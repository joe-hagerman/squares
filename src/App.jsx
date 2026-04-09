import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import LoginPage from './pages/LoginPage'
import MyBoards from './pages/MyBoards'
import AuthCallback from './pages/AuthCallback'
import CreateBoard from './pages/CreateBoard'
import BoardView from './pages/BoardView'
import AdminDashboard from './pages/AdminDashboard'
import JoinFlow from './pages/JoinFlow'
import PlayerView from './pages/PlayerView'
import PrintableBoard from './pages/PrintableBoard'
import ResetPassword from './pages/ResetPassword'
import ThemeToggle from './components/ThemeToggle'

function AppRoutes() {
  const location = useLocation()
  const isPrint = location.pathname.endsWith('/print')
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/boards" element={<ProtectedRoute><MyBoards /></ProtectedRoute>} />
        <Route path="/create" element={<ProtectedRoute><CreateBoard /></ProtectedRoute>} />
        <Route path="/board/:boardId" element={<BoardView />} />
        <Route path="/board/:boardId/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/board/:boardId/join" element={<JoinFlow />} />
        <Route path="/player/:playerToken" element={<PlayerView />} />
        <Route path="/board/:boardId/print" element={<PrintableBoard />} />
      </Routes>
      {!isPrint && <ThemeToggle />}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-gray-950">
          <AppRoutes />
        </div>
      </AuthProvider>
    </BrowserRouter>
  )
}
