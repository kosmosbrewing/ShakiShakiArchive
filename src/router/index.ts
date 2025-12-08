import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import Home from "@/components/Home.vue";
import Product from "@/components/Product.vue";
import Login from "@/pages/Login.vue";
import Signup from "@/pages/Signup.vue";
import Admin from "@/pages/Admin.vue";
import Cart from "@/pages/Cart.vue";
import Checkout from "@/pages/Checkout.vue";
import Order from "@/pages/Order.vue";
import OrderDetail from "@/pages/OrderDetail.vue";

import ProductDetail from "@/pages/ProductDetail.vue";
import Contact from "@/pages/Contact.vue";
import About from "@/pages/About.vue";
import Account from "@/pages/Account.vue";

import Modify from "@/pages/Modify.vue";

import ProductAdmin from "@/pages/ProductAdmin.vue";
import CategoryAdmin from "@/pages/CategoryAdmin.vue";

const routes = [
  { path: "/", name: "Home", component: Home },
  { path: "/login", name: "Login", component: Login },
  { path: "/signup", name: "Signup", component: Signup },
  { path: "/admin", name: "Admin", component: Admin },
  { path: "/cart", name: "Cart", component: Cart },
  { path: "/checkout", name: "Checkout", component: Checkout },
  { path: "/order", name: "Order", component: Order },
  { path: "/OrderDetail", name: "OrderDetail", component: OrderDetail },

  { path: "/modify", name: "Modify", component: Modify },
  { path: "/product/:category", name: "Product", component: Product },
  {
    path: "/productDetail/:id",
    name: "ProductDetail",
    component: ProductDetail,
  },
  { path: "/contact", name: "Contact", component: Contact },
  { path: "/about", name: "About", component: About },
  { path: "/account", name: "Account", component: Account },
  {
    path: "/admin/product",
    name: "ProductAdmin",
    component: ProductAdmin,
    meta: { requiresAuth: true, requiresAdmin: true }, // 🔒 철통 보안,
  },
  {
    path: "/admin/categories",
    name: "CategoryAdmin",
    component: CategoryAdmin,
    meta: { requiresAuth: true, requiresAdmin: true }, // 🔒 철통 보안,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();

  // [중요] 새로고침 등으로 유저 정보가 없는데, 로그인이 필요한 페이지라면?
  // 먼저 유저 정보를 로드할 때까지 '기다려야(await)' 합니다.
  if (!authStore.user && (to.meta.requiresAuth || to.meta.requiresAdmin)) {
    try {
      await authStore.loadUser(); // 여기서 로딩 끝날 때까지 대기
    } catch (error) {
      // 로드 실패 시 (세션 만료 등) 로그인 페이지로 보냄
      console.error("유저 정보 로드 실패:", error);
      return next("/login");
    }
  }

  // 1. 로그인 체크 (requiresAuth)
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    alert("로그인이 필요한 서비스입니다.");
    return next("/login");
  }

  // 2. 관리자 권한 체크 (requiresAdmin)
  // user 정보가 확실히 있는 상태에서 체크하므로 안전함
  if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
    alert("🚨 접근 권한이 없습니다. (관리자 전용)");
    return next("/"); // 홈으로 리다이렉트 (로그아웃 안 시킴!)
  }

  // 3. 통과
  next();
});
export default router;
