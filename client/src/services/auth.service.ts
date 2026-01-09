import api from './api';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  segment: string;
  target_exam?: string;
  age?: number;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    access_token: string;
    refresh_token: string;
  };
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  age: number;
  segment: string;
  target_exam?: string;
}

export const authService = {
  async register(data: RegisterData) {
    const response = await api.post<LoginResponse>('/auth/register', data);
    return response.data;
  },

  async login(credentials: { email: string; password: string }) {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout() {
    await api.post('/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  async getCurrentUser() {
    const response = await api.get<{ success: boolean; data: { user: User } }>('/auth/me');
    return response.data.data.user;
  },
};
