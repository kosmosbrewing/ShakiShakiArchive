// src/router/index.ts
// Vue Router 설정

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

// 홈/공용 컴포넌트
import Home from "@/components/Home.vue";
import Product from "@/components/Product.vue";

// Auth (인증)
import { Login, Signup } from "@/pages/auth";

// Account (계정)
import { Account, Modify, AddressList } from "@/pages/account";

// Product (상품)
import { ProductDetail } from "@/pages/product";

// Order (주문)
import { Order, OrderList, OrderDetail, Checkout } from "@/pages/order";

// Cart (장바구니)
import { Cart } from "@/pages/cart";

// Wishlist (위시리스트)
import { WishList } from "@/pages/wishlist";

// Admin (관리자)
import { Admin, ProductAdmin, CategoryAdmin, OrderAdmin } from "@/pages/admin";

// Static (정적 페이지)
import { About, Contact } from "@/pages/static";

// 404 페이지
import NotFound from "@/pages/NotFound.vue";

const routes = [
  // 홈
  { path: "/", name: "Home", component: Home },

  // 인증 관련
  { path: "/login", name: "Login", component: Login },
  { path: "/signup", name: "Signup", component: Signup },

  // 계정 관련
  {
    path: "/account",
    name: "Account",
    component: Account,
    meta: { requiresAuth: true },
  },
  {
    path: "/modify",
    name: "Modify",
    component: Modify,
    meta: { requiresAuth: true },
  },
  {
    path: "/addresslist",
    name: "AddressList",
    component: AddressList,
    meta: { requiresAuth: true },
  },

  // 상품 관련
  { path: "/product/:category", name: "Product", component: Product },
  { path: "/productDetail/:id", name: "ProductDetail", component: ProductDetail },

  // 장바구니
  { path: "/cart", name: "Cart", component: Cart },

  // 주문 관련
  {
    path: "/order",
    name: "Order",
    component: Order,
    meta: { requiresAuth: true },
  },
  {
    path: "/orderlist",
    name: "OrderList",
    component: OrderList,
    meta: { requiresAuth: true },
  },
  {
    path: "/orderdetail/:id?",
    name: "OrderDetail",
    component: OrderDetail,
    meta: { requiresAuth: true },
  },
  { path: "/checkout", name: "Checkout", component: Checkout },

  // 위시리스트
  {
    path: "/wishlist",
    name: "Wishlist",
    component: WishList,
    meta: { requiresAuth: true },
  },

  // 정적 페이지
  { path: "/contact", name: "Contact", component: Contact },
  { path: "/about", name: "About", component: About },

  // 관리자 페이지
  {
    path: "/admin",
    name: "Admin",
    component: Admin,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/admin/products",
    name: "ProductAdmin",
    component: ProductAdmin,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/admin/categories",
    name: "CategoryAdmin",
    component: CategoryAdmin,
    meta: { requiresAuth: true, requiresAdmin: true },
  },
  {
    path: "/admin/orders",
    name: "OrderAdmin",
    component: OrderAdmin,
    meta: { requiresAuth: true, requiresAdmin: true },
  },

  // 404 페이지
  { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to: any, _from: any, savedPosition: any) {
    // 뒤로가기 시 스크롤 위치 복원
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  },
});

// 네비게이션 가드
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.beforeEach(async (to: any, _from: any, next: any) => {
  const authStore = useAuthStore();

  // 로그인이 필요한 페이지인 경우, 먼저 유저 정보 로드
  if (!authStore.user && (to.meta.requiresAuth || to.meta.requiresAdmin)) {
    try {
      await authStore.loadUser();
    } catch (error) {
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
  if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
    alert("접근 권한이 없습니다. (관리자 전용)");
    return next("/");
  }

  // 3. 통과
  next();
});

export default router;
