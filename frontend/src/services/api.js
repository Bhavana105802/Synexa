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

export async function askQuestionStream(question, mode = 'simple', chatId, onToken, onMeta, onComplete, onError) {
  try {
    const token = getToken()
    const response = await fetch('/ask/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ question, mode, chat_id: chatId }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.replace('data: ', '').trim()
          if (payload === '[DONE]') {
            if (onComplete) onComplete()
            return
          }
          try {
            const data = JSON.parse(payload)
            if (data.type === 'meta' && onMeta) onMeta(data)
            if (data.type === 'token' && onToken) onToken(data.content)
          } catch (err) {
            // Ignore parse errors for raw frames
          }
        }
      }
    }
    if (onComplete) onComplete()
  } catch (err) {
    if (onError) onError(err)
  }
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
