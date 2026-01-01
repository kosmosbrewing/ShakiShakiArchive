import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/index.css";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
axios.defaults.baseURL = API_BASE;

const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true, // 🔴 쿠키 포함 필수!
  headers: {
    "Content-Type": "application/json",
  },
});
// 응답 인터셉터 (에러 처리)
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message;
    return Promise.reject(new Error(message));
  }
);
export default apiClient;

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.mount("#app");
