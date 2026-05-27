import axios from 'axios'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken })
          localStorage.setItem('access_token', data.accessToken)
          error.config.headers.Authorization = `Bearer ${data.accessToken}`
          return api.request(error.config)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  setup: (data: { email: string; password: string; name: string; orgName: string }) =>
    api.post('/auth/setup', data),
}

export const importacoesApi = {
  criar: (data: any) => api.post('/importacoes', data),
  listar: (page = 1, limit = 20) => api.get(`/importacoes?page=${page}&limit=${limit}`),
  buscar: (id: string) => api.get(`/importacoes/${id}`),
  cancelar: (id: string) => api.delete(`/importacoes/${id}`),
  retry: (id: string) => api.post(`/importacoes/${id}/retry`),
}

export const empreendimentosApi = {
  listar: (page = 1, status?: string) => api.get(`/empreendimentos?page=${page}${status ? `&status=${status}` : ''}`),
  buscar: (id: string) => api.get(`/empreendimentos/${id}`),
  criar: (data: any) => api.post('/empreendimentos', data),
  atualizar: (id: string, data: any) => api.put(`/empreendimentos/${id}`, data),
  publicar: (id: string) => api.post(`/empreendimentos/${id}/publish`),
  remover: (id: string) => api.delete(`/empreendimentos/${id}`),
}

export const mediasApi = {
  listar: (empreendimentoId: string, categoria?: string) =>
    api.get(`/empreendimentos/${empreendimentoId}/medias${categoria ? `?categoria=${categoria}` : ''}`),
  atualizar: (id: string, data: any) => api.put(`/medias/${id}`, data),
  remover: (id: string) => api.delete(`/medias/${id}`),
  reordenar: (empreendimentoId: string, ordens: any[]) => api.post('/medias/reorder', { empreendimentoId, ordens }),
  regenerar: (id: string) => api.post(`/medias/${id}/regenerate`),
}

export const uploadApi = {
  getUrl: (filename: string, contentType: string) => api.post('/upload/url', { filename, contentType }),
  confirm: (keys: string[], empreendimentoId?: string) => api.post('/upload/confirm', { keys, empreendimentoId }),
}
