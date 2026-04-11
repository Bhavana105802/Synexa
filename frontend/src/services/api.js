import axios from 'axios'

const api = axios.create({
  baseURL: '/',
  timeout: 600000,
})

// ── JWT helpers ───────────────────────────────────────────
const TOKEN_KEY = 'synexa_token'

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
}

// ── Interceptor: attach JWT to every request ─────────────
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
  return config
})

// ── Interceptor: surface backend error messages ───────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const detail = error.response?.data?.detail
    const status = error.response?.status
    console.error(`[API] Error ${status}:`, detail || error.message)
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────

export async function signupUser(email, password) {
  const response = await api.post('/auth/signup', { email, password })
  return response.data
}

export async function loginUser(email, password) {
  const response = await api.post('/auth/login', { email, password })
  if (response.data.access_token) {
    saveToken(response.data.access_token)
  }
  return response.data
}

export async function uploadDocument(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,   // 10 min per-request override
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total))
      }
    },
  })
  return response.data
}

// ── Ask ───────────────────────────────────────────────────

export async function askQuestion(question, mode = 'simple', chatId) {
  const response = await api.post('/ask', {
    question,
    mode,
    chat_id: chatId,
  })
  return response.data
}

// ── Chat management ───────────────────────────────────────

export async function listChats() {
  const response = await api.get('/chats')
  return response.data
}

export async function getChatHistory(chatId) {
  const response = await api.get(`/chat/${encodeURIComponent(chatId)}/history`)
  return response.data
}

export async function deleteChat(chatId) {
  const response = await api.delete(`/chat/${encodeURIComponent(chatId)}`)
  return response.data
}

export async function deleteDocument(documentId) {
  const response = await api.delete(`/document/${encodeURIComponent(documentId)}`)
  return response.data
}

// ── Health ────────────────────────────────────────────────

export async function healthCheck() {
  const response = await api.get('/')
  return response.data
}

export default api
