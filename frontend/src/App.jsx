import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import Landing   from './pages/Landing'
import Upload    from './pages/Upload'
import Chat      from './pages/Chat'
import Signup    from './pages/Signup'
import Signin    from './pages/Signin'
import Documents from './pages/Documents'

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/"           element={<Landing />} />
            <Route path="/upload"     element={<Upload />} />
            <Route path="/chat"       element={<Chat />} />
            <Route path="/documents"  element={<Documents />} />
            <Route path="/signup"     element={<Signup />} />
            <Route path="/signin"     element={<Signin />} />
            <Route path="*"           element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  )
}
