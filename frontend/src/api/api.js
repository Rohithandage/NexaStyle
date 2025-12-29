import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://nexastyle1.onrender.com"
      : "http://localhost:5000",
  withCredentials: true
});

export default api;
