const API_BASE_URL =
  window.location.protocol === "file:" || window.location.origin === "null"
    ? "http://localhost:5000"
    : window.location.origin;

const api = {
  getToken: () => localStorage.getItem("authToken"),

  login: (token, user) => {
    localStorage.setItem("authToken", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  },

  isAuthenticated: () => !!localStorage.getItem("authToken"),

  fetchAuth: async (endpoint, options = {}) => {
    const token = api.getToken();

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (token) {
      headers["Authorization"] = `skill-swap ${token}`;
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        api.logout();
        return null;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || `Error: ${response.statusText}`);
        }
        return data;
      }

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};

window.api = api;
