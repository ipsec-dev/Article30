import { api } from './api/client';
import type { UserDto } from '@article30/shared';

export async function getMe(): Promise<UserDto | null> {
  try {
    return await api.get<UserDto>('/auth/me');
  } catch (err) {
    if (err instanceof Error) {
      console.info('[Auth] getMe failed:', err.message);
    }
    return null;
  }
}

export async function login(email: string, password: string) {
  return api.post<UserDto>('/auth/login', { email, password });
}

export async function signup(firstName: string, lastName: string, email: string, password: string) {
  return api.post<UserDto>('/auth/signup', { firstName, lastName, email, password });
}

export async function logout() {
  return api.post('/auth/logout');
}
