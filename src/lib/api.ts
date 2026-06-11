const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) { this.token = token; if (typeof window !== 'undefined') localStorage.setItem('token', token); }
  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') { this.token = localStorage.getItem('token'); return this.token; }
    return null;
  }
  clearToken() { this.token = null; if (typeof window !== 'undefined') localStorage.removeItem('token'); }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = { ...options.headers as Record<string, string> };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Request failed'); }
    return res.json();
  }

  // Auth
  register(data: { username: string; email: string; password: string; fullName: string }) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(data) }); }
  login(data: { email: string; password: string }) { return this.request<{ user: any; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }); }
  getMe() { return this.request('/auth/me'); }

  // Posts
  getFeed(page = 1, limit = 10) { return this.request<{ posts: any[]; page: number }>(`/posts/feed?page=${page}&limit=${limit}`); }
  createPost(formData: FormData) { return this.request('/posts', { method: 'POST', body: formData }); }
  likePost(postId: string) { return this.request(`/posts/${postId}/like`, { method: 'POST' }); }
  getComments(postId: string) { return this.request(`/posts/${postId}/comments`); }
  addComment(postId: string, text: string) { return this.request(`/posts/${postId}/comments`, { method: 'POST', body: JSON.stringify({ text }) }); }

  // Users
  searchUsers(q: string) { return this.request(`/users/search?q=${encodeURIComponent(q)}`); }
  getProfile(username: string) { return this.request(`/users/${username}`); }
  toggleFollow(userId: string) { return this.request(`/users/${userId}/follow`, { method: 'POST' }); }

  // Messages
  getConversations() { return this.request('/messages/conversations'); }
  getMessages(partnerId: string) { return this.request(`/messages/${partnerId}`); }
  sendMessage(receiverId: string, text: string) { return this.request('/messages', { method: 'POST', body: JSON.stringify({ receiverId, text }) }); }
}

export const api = new ApiClient();
