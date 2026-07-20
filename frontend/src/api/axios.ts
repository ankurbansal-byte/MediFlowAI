import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
});

// Flag to track whether we are currently refreshing the access token
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.map((callback) => callback(token));
  refreshSubscribers = [];
};

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mediflow_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const { config, response } = error;
    const originalRequest = config;

    // If the error is 401 (Unauthorized) and we haven't already retried this request
    if (response && response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If refreshing is already in progress, wait for it to complete
        return new Promise((resolve) => {
          subscribeTokenRefresh((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("mediflow_refresh_token");

      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        // Request a new access token using the refresh token
        const refreshResponse = await axios.post("http://localhost:5000/api/auth/refresh", {
          refreshToken,
        });

        if (refreshResponse.data.success) {
          const { token, refreshToken: newRefreshToken } = refreshResponse.data;

          localStorage.setItem("mediflow_token", token);
          if (newRefreshToken) {
            localStorage.setItem("mediflow_refresh_token", newRefreshToken);
          }

          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          onRefreshed(token);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        // Clear tokens and force logout
        localStorage.removeItem("mediflow_token");
        localStorage.removeItem("mediflow_refresh_token");
        localStorage.removeItem("mediflow_user");

        // Trigger page refresh to reset app state if needed or redirect
        window.location.reload();
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
