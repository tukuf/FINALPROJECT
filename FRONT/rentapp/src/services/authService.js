import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth service functions
export const authService = {
  // Register user
  async register(userData) {
    try {
      const response = await api.post("/api/register/", userData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: "Registration failed" };
    }
  },

  // Login user
  async login(credentials) {
    try {
      const response = await api.post("/api/login/", credentials);
      // The backend returns { message, user, token }
      if (response.data.token) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { error: "Login failed" };
    }
  },

  // Store token in localStorage
  setToken(token) {
    localStorage.setItem("auth_token", token);
  },

  // Get token from localStorage
  getToken() {
    return localStorage.getItem("auth_token");
  },

  // Remove token from localStorage
  clearToken() {
    localStorage.removeItem("auth_token");
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.getToken();
  },

  // Get stored user data
  getUser() {
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },

  // Store user data
  setUser(user) {
    localStorage.setItem("user", JSON.stringify(user));
  },

  // Clear user data
  clearUser() {
    localStorage.removeItem("user");
  },

  // Logout
  logout() {
    this.clearToken();
    this.clearUser();
  },
};

// Add authorization header to requests if token exists
api.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      // DRF TokenAuthentication expects 'Token <key>'
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for handling 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized, clear tokens and redirect to login
      authService.logout();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
