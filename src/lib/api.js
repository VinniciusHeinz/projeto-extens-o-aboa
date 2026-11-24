import axios from 'axios';

// Em produção na Vercel usa rotas relativas (/api/...)
// Em dev local ainda pode apontar para o backend separado se quiser
const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({ baseURL });

api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
