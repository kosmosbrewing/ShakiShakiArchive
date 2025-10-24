import { createRouter, createWebHistory } from "vue-router";
import ClothingPost from "@/component/ClothingPost.vue";

const routes = [
  { path: "/ClothingPost", name: "ClothingPost", component: ClothingPost },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
