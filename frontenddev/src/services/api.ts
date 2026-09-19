import axios from 'axios';
import { User, CreateUserDTO, UpdateUserDTO, ApiResponse } from '../types';

// Use relative path when using proxy
const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Add logging
api.interceptors.request.use(request => {
    return request;
});

api.interceptors.response.use(
    response => {
        return response;
    },
    error => {
        console.error('❌ API Error:', error.message);
        return Promise.reject(error);
    }
);

export const userApi = {
    getAll: async (): Promise<User[]> => {
        try {
            const response = await api.get<ApiResponse<User[]>>('/users');
            return response.data.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    getById: async (id: number): Promise<User> => {
        const response = await api.get<ApiResponse<User>>(`/users/${id}`);
        return response.data.data;
    },

    create: async (userData: CreateUserDTO): Promise<User> => {
        const response = await api.post<ApiResponse<User>>('/users', userData);
        return response.data.data;
    },

    update: async (id: number, userData: UpdateUserDTO): Promise<User> => {
        const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
        return response.data.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/users/${id}`);
    },

    search: async (query: string): Promise<User[]> => {
        const response = await api.get<ApiResponse<User[]>>(`/users/search?q=${query}`);
        return response.data.data;
    },
};

export default api;