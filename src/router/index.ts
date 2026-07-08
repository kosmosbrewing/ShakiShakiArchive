// src/router/index.ts
// Vue Router 설정

import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { AUTH_MESSAGES, ADMIN_MESSAGES } from "@/lib/messages";
import { trackPageView } from "@/lib/analytics";
import { fetchProduct } from "@/lib/api";
import {
  isChunkLoadError,
  reloadOnceForStaleChunk,
  clearChunkReloadGuard,
} from "@/lib/chunkReload";

// 전 페이지 lazy import — 정적 import는 index.html에 modulepreload로 포함되어
// 첫 방문자가 admin/payment 청크까지 다운로드하게 되므로 금지 (라우트 진입 시에만 로드)

// 홈/공용 컴포넌트
const Home = () => import("@/components/Home.vue");

// Auth (인증)
const Login = () => import("@/pages/auth/Login.vue");
const Signup = () => import("@/pages/auth/Signup.vue");
const OAuthCallback = () => import("@/pages/auth/OAuthCallback.vue");
const ForgotPassword = () => import("@/pages/auth/ForgotPassword.vue");

// Account (계정)
const Account = () => import("@/pages/account/Account.vue");
const Modify = () => import("@/pages/account/Modify.vue");
const AddressList = () => import("@/pages/account/AddressList.vue");

// Product (상품)
const Product = () => import("@/pages/product/Product.vue");
const ProductDetail = () => import("@/pages/product/ProductDetail.vue");
const Journal = () => import("@/pages/archive/Journal.vue");
const SoldArchive = () => import("@/pages/archive/SoldArchive.vue");

// Order (주문)
const Order = () => import("@/pages/order/Order.vue");
const OrderList = () => import("@/pages/order/OrderList.vue");
const OrderDetail = () => import("@/pages/order/OrderDetail.vue");
// 3개 라우트에서 공유 — 동일 경로 import라 청크는 1개로 dedupe됨
const PaymentCallback = () => import("@/pages/order/PaymentCallback.vue");
const NaverPayBack = () => import("@/pages/order/NaverPayBack.vue");

// Cart (장바구니)
const Cart = () => import("@/pages/cart/Cart.vue");

// Wishlist (위시리스트)
const WishList = () => import("@/pages/wishlist/WishList.vue");

// Inquiry (문의하기)
const InquiryList = () => import("@/pages/inquiry/InquiryList.vue");
const InquiryCreate = () => import("@/pages/inquiry/InquiryCreate.vue");
const InquiryDetail = () => import("@/pages/inquiry/InquiryDetail.vue");
const MyInquiries = () => import("@/pages/inquiry/MyInquiries.vue");
const FAQ = () => import("@/pages/inquiry/FAQ.vue");

// Admin (관리자)
const ProductAdmin = () => import("@/pages/admin/ProductAdmin.vue");
const CategoryAdmin = () => import("@/pages/admin/CategoryAdmin.vue");
const InquiryAdmin = () => import("@/pages/admin/InquiryAdmin.vue");
const OrderAdmin = () => import("@/pages/admin/OrderAdmin.vue");
const SiteImageAdmin = () => import("@/pages/admin/SiteImageAdmin.vue");
const UserAdmin = () => import("@/pages/admin/UserAdmin.vue");
const AnalyticsAdmin = () => import("@/pages/admin/AnalyticsAdmin.vue");

// Static (정적 페이지)
const About = () => import("@/pages/static/About.vue");
const Notice = () => import("@/pages/static/Notice.vue");
const PrivacyPolicy = () => import("@/pages/static/PrivacyPolicy.vue");
const TermsOfService = () => import("@/pages/static/TermsOfService.vue");

// 404 페이지
const NotFound = () => import("@/pages/NotFound.vue");

const routes = [
  // 홈
  { path: "/", name: "Home", component: Home, meta: { title: "샤키샤키 아카이브(ShakiShaki Archive)" } },

  // 인증 관련
  { path: "/login", name: "Login", component: Login, meta: { title: "로그인" } },
  { path: "/signup", name: "Signup", component: Signup, meta: { title: "회원가입" } },
  {
    path: "/forgot-password",
    name: "ForgotPassword",
    component: ForgotPassword,
    meta: { title: "비밀번호 찾기" },
  },
  { path: "/oauth/callback", name: "OAuthCallback", component: OAuthCallback, meta: { title: "소셜 로그인" } },

  // 계정 관련
  {
    path: "/account",
    name: "Account",
    component: Account,
    meta: { requiresAuth: true, title: "마이페이지" },
  },
  {
    path: "/modify",
    name: "Modify",
    component: Modify,
    meta: { requiresAuth: true, title: "회원정보 수정" },
  },
  {
    path: "/addresslist",
    name: "AddressList",
    component: AddressList,
    meta: { requiresAuth: true, title: "배송지 관리" },
  },

  // 상품 관련
  { path: "/product/:category", name: "Product", component: Product, meta: { title: "상품 목록" } },
  {
    path: "/productDetail/:slug",
    name: "ProductDetail",
    component: ProductDetail,
    meta: { title: "상품 상세" },
  },

  // Archive
  { path: "/archive", redirect: "/archive/sold" },
  {
    path: "/archive/sold",
    name: "SoldArchive",
    component: SoldArchive,
    meta: { title: "Sold Archive" },
  },
  {
    path: "/archive/journal",
    name: "Journal",
    component: Journal,
    meta: { title: "Journal" },
  },

  {
    path: "/about",
    name: "About",
    component: About,
    meta: { title: "About" },
  },

  {
    path: "/notice",
    name: "Notice",
    component: Notice,
    meta: { title: "Notice" },
  },

  // 장바구니
  { path: "/cart", name: "Cart", component: Cart, meta: { title: "장바구니" } },

  // 주문 관련
  {
    path: "/order",
    name: "Order",
    component: Order,
    meta: { requiresAuth: true, title: "주문하기" },
  },
  {
    path: "/orderlist",
    name: "OrderList",
    component: OrderList,
    meta: { requiresAuth: true, title: "주문 내역" },
  },
  {
    path: "/orderdetail/:id?",
    name: "OrderDetail",
    component: OrderDetail,
    meta: { requiresAuth: true, title: "주문 상세" },
  },
  {
    path: "/payment/callback",
    name: "PaymentCallback",
    component: PaymentCallback,
    meta: { title: "결제 처리 중" },
  },
  {
    path: "/checkout/fail",
    name: "CheckoutFail",
    component: PaymentCallback,
    meta: { title: "결제 실패" },
  },
  {
    path: "/checkout/success",
    name: "CheckoutSuccess",
    component: PaymentCallback,
    meta: { title: "결제 완료" },
  },
  {
    path: "/naverpay/back",
    name: "NaverPayBack",
    component: NaverPayBack,
    meta: { title: "네이버페이" },
  },

  // 위시리스트
  {
    path: "/wishlist",
    name: "Wishlist",
    component: WishList,
    meta: { requiresAuth: true, title: "위시리스트" },
  },

  // FAQ 및 문의하기 (Q&A)
  { path: "/faq", name: "FAQ", component: FAQ, meta: { title: "자주 묻는 질문" } },
  { path: "/inquiry", name: "InquiryList", component: InquiryList, meta: { title: "문의 내역" } },
  {
    path: "/inquiry/create",
    name: "InquiryCreate",
    component: InquiryCreate,
    meta: { requiresAuth: true, title: "문의하기" },
  },
  { path: "/inquiry/:id", name: "InquiryDetail", component: InquiryDetail, meta: { title: "문의 상세" } },
  {
    path: "/my-inquiries",
    name: "MyInquiries",
    component: MyInquiries,
    meta: { requiresAuth: true, title: "내 문의 내역" },
  },

  // 관리자 페이지
  {
    path: "/admin/products",
    name: "ProductAdmin",
    component: ProductAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 상품 관리" },
  },
  {
    path: "/admin/categories",
    name: "CategoryAdmin",
    component: CategoryAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 카테고리 관리" },
  },
  {
    path: "/admin/inquiries",
    name: "InquiryAdmin",
    component: InquiryAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 문의 관리" },
  },
  {
    path: "/admin/orders",
    name: "OrderAdmin",
    component: OrderAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 주문 관리" },
  },
  {
    path: "/admin/site-images",
    name: "SiteImageAdmin",
    component: SiteImageAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 사이트 이미지 관리" },
  },
  {
    path: "/admin/users",
    name: "UserAdmin",
    component: UserAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 회원 관리" },
  },
  {
    path: "/admin/analytics",
    name: "AnalyticsAdmin",
    component: AnalyticsAdmin,
    meta: { requiresAuth: true, requiresAdmin: true, title: "[ADMIN] 통계 관리" },
  },

  // 정적 페이지
  {
    path: "/privacy",
    name: "PrivacyPolicy",
    component: PrivacyPolicy,
    meta: { title: "개인정보 처리방침" },
  },
  {
    path: "/terms",
    name: "TermsOfService",
    component: TermsOfService,
    meta: { title: "이용약관" },
  },

  // 404 페이지
  { path: "/:pathMatch(.*)*", name: "NotFound", component: NotFound, meta: { title: "페이지를 찾을 수 없습니다" } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to: any, _from: any, savedPosition: any) {
    // 뒤로가기 시 스크롤 위치 복원
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0, behavior: 'auto' };
  },
});

// 네비게이션 가드
// eslint-disable-next-line @typescript-eslint/no-explicit-any
router.beforeEach(async (to: any, _from: any, next: any) => {
  const authStore = useAuthStore();
  const { showAlert } = useAlert();
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // 0. 페이지 타이틀 업데이트
  const defaultTitle = "샤키샤키 아카이브(ShakiShaki Archive)";
  const pageTitle = to.meta.title || defaultTitle;
  document.title = pageTitle === defaultTitle ? pageTitle : `${pageTitle} | ${defaultTitle}`;

  // 0-1. 상품 상세 URL canonical 유지: UUID 진입 시 slug URL로 교체
  if (to.name === "ProductDetail") {
    const routeSlug = String(to.params.slug || "");
    if (uuidRegex.test(routeSlug)) {
      try {
        const product = await fetchProduct(routeSlug);
        const canonicalSlug = product?.slug;
        if (canonicalSlug && canonicalSlug !== routeSlug) {
          return next({
            name: "ProductDetail",
            params: { slug: canonicalSlug },
            query: to.query,
            hash: to.hash,
            replace: true,
          });
        }
      } catch (error) {
        // 상세 페이지 컴포넌트에서 404/에러를 처리하도록 여기서는 통과
        console.warn("상품 canonical URL 확인 실패:", error);
      }
    }
  }

  // 로그인이 필요한 페이지인 경우, 먼저 유저 정보 로드
  if (!authStore.user && (to.meta.requiresAuth || to.meta.requiresAdmin)) {
    try {
      await authStore.loadUser({ throwOnError: true });
    } catch (error) {
      console.error("유저 정보 로드 실패:", error);
      const isNetworkError = error instanceof TypeError;
      showAlert(
        isNetworkError
          ? "서버 연결 실패. 네트워크 상태를 확인 후 다시 시도해주세요."
          : "사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        { type: "error" },
      );
      return next(false);
    }
  }

  // 1. 로그인 체크 (requiresAuth)
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    showAlert(AUTH_MESSAGES.loginRequired, { type: "error" });
    return next("/login");
  }

  // 2. 관리자 권한 체크 (requiresAdmin)
  if (to.meta.requiresAdmin && !authStore.user?.isAdmin) {
    showAlert(ADMIN_MESSAGES.accessDenied, { type: "error" });
    return next("/");
  }

  // 3. 통과
  next();
});

/**
 * soft 404 완화: 존재하지 않는 경로(NotFound)는 robots noindex 처리
 * 정적 호스팅 특성상 HTTP 404를 반환할 수 없으므로 메타 태그로 색인 오염 방지
 */
function setRobotsNoindex(enabled: boolean) {
  let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (enabled) {
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "robots";
      document.head.appendChild(meta);
    }
    meta.content = "noindex, nofollow";
  } else if (meta) {
    meta.remove();
  }
}

router.afterEach((to) => {
  trackPageView(to.fullPath);
  setRobotsNoindex(to.name === "NotFound");
  // 내비게이션 성공 시 청크 리로드 가드 해제 (아래 onError 참조)
  clearChunkReloadGuard();
});

// 배포 직후 옛 index.html을 든 사용자가 삭제/교체된 lazy 청크를 요청하면 404가 남.
// 이때 전체 리로드로 새 index.html을 받아 복구 (가드 상세는 lib/chunkReload.ts)
router.onError((error, to) => {
  if (isChunkLoadError(error)) {
    reloadOnceForStaleChunk(to.fullPath);
  }
});

export default router;
