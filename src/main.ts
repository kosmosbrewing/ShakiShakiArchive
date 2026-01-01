import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/index.css";
import axios from "axios";

axios.defaults.baseURL = "http://localhost:8080";

const apiClient = axios.create({
  baseURL: axios.defaults.baseURL,
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
