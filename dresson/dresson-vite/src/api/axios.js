import axios from 'axios';

// Base URL for the Django API
const BASE_URL = 'http://localhost:8000/api/';

const api = axios.create({
    baseURL: BASE_URL,
});

// Request Interceptor: Attach the access token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Handle 401 Unauthorized and refresh token automatically
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        
        // If error is 401 and we haven't retried yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Skip interceptor for login to prevent infinite reload loop when login fails
            if (originalRequest.url.includes('login')) {
                return Promise.reject(error);
            }
            
            originalRequest._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    return Promise.reject(error);
                }
                
                // Call refresh endpoint directly using pure axios (to avoid infinite loop)
                const res = await axios.post(`${BASE_URL}users/token/refresh/`, {
                    refresh: refreshToken
                });
                
                if (res.status === 200) {
                    const newAccess = res.data.access;
                    localStorage.setItem('access_token', newAccess);
                    
                    // If refresh endpoint also returns a new refresh token (Rotate refresh token)
                    if (res.data.refresh) {
                         localStorage.setItem('refresh_token', res.data.refresh);
                    }
                    
                    // Update header and retry the original request
                    api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
                    originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
                    return api(originalRequest);
                }
            } catch (err) {
                // Refresh failed (token expired/invalid). Logout user.
                console.error("Session expired. Logging out.");
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                // Redirect to login page
                window.location.href = '/';
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
);

export default api;
