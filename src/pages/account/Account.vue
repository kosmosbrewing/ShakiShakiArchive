<script setup lang="ts">
// src/pages/Account.vue
// 마이페이지

import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useOrderStats } from "@/composables/useOrders";
import { useWishlistCount } from "@/composables/useWishlist";
import { Separator } from "@/components/ui/separator";
// 아이콘
import {
  Package,
  Heart,
  User,
  MapPin,
  ChevronRight,
  Settings,
  ShoppingBag,
  Truck,
  CheckCircle,
  Image,
  MessageCircle,
} from "lucide-vue-next";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const router = useRouter();
const authStore = useAuthStore();

// 주문 현황 통계
const { orderCounts, loadOrderStats } = useOrderStats();

// 위시리스트 개수
const { count: wishlistCount, loadCount: loadWishlistCount } =
  useWishlistCount();

// 유저 이름 표시
const userName = computed(() => {
  return authStore.user?.userName || "고객";
});

// 페이지 이동 함수들
const goToModify = () => router.push("/modify");
const goToOrderList = (status?: string) => {
  if (status) {
    router.push({ path: "/orderlist", query: { status } });
  } else {
    router.push("/orderlist");
  }
};
const goToWishlist = () => router.push("/wishlist");
const goToAddress = () => router.push("/addresslist");
const goToMyInquiries = () => router.push("/my-inquiries");

// 관리자용 페이지 이동
const goToCategoryAdmin = () => router.push("/admin/categories");
const goToInquiryAdmin = () => router.push("/admin/inquiries"); // 관리자는 전체 문의 목록으로
const goToProductAdmin = () => router.push("/admin/products");
const goToOrderAdmin = () => router.push("/admin/orders");
const goToSiteImageAdmin = () => router.push("/admin/site-images");
const goToUserAdmin = () => router.push("/admin/users");

// 메뉴 아이템 정의
const menuItems = [
  {
    label: "주문 내역",
    description: "주문 및 배송 현황 확인",
    icon: Package,
    action: () => goToOrderList(), // 전체 주문 목록 (필터 없음)
  },
  {
    label: "위시리스트",
    description: "관심 상품 목록",
    icon: Heart,
    action: goToWishlist,
    badge: wishlistCount,
  },
  {
    label: "회원정보 수정",
    description: "개인정보 및 비밀번호 변경",
    icon: User,
    action: goToModify,
  },
  {
    label: "배송지 관리",
    description: "배송지 수정 및 삭제",
    icon: MapPin,
    action: goToAddress,
  },
  {
    label: "내 문의 내역",
    description: "Q&A 문의 및 답변 확인",
    icon: MessageCircle,
    action: goToMyInquiries,
  },
];

onMounted(async () => {
  // 사용자 정보 로드
  if (!authStore.user) {
    await authStore.loadUser();
  }

  // 인증된 경우 통계 로드
  if (authStore.isAuthenticated) {
    loadOrderStats();
    loadWishlistCount();
  }
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">마이페이지</h3>
      <Separator></Separator>
    </div>

    <!-- 사용자 인사 -->
    <Card class="mb-6">
      <CardContent class="py-6">
        <div class="flex items-center gap-4">
          <div
            class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <User class="w-7 h-7 text-primary" />
          </div>
          <div>
            <p class="text-heading font-bold text-foreground">
              {{ userName }}님, 안녕하세요!
            </p>
            <p class="text-body text-muted-foreground">일반회원</p>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 관리자 메뉴 -->
    <Card v-if="authStore.user?.isAdmin" class="mb-6">
      <CardHeader class="pb-2">
        <CardTitle class="text-heading flex items-center gap-2">
          관리자 메뉴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <Button
            variant="outline"
            @click="goToCategoryAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-gray-900 flex items-center justify-center"
            >
              <Settings class="w-4 h-4 text-white" />
            </div>
            카테고리 관리
          </Button>

          <Button
            variant="outline"
            @click="goToProductAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-primary flex items-center justify-center"
            >
              <Package class="w-4 h-4 text-primary-foreground" />
            </div>
            상품 관리
          </Button>

          <Button
            variant="outline"
            @click="goToOrderAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-blue-600 flex items-center justify-center"
            >
              <ShoppingBag class="w-4 h-4 text-white" />
            </div>
            주문/배송 관리
          </Button>

          <Button
            variant="outline"
            @click="goToSiteImageAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-purple-600 flex items-center justify-center"
            >
              <Image class="w-4 h-4 text-white" />
            </div>
            사이트 이미지 관리
          </Button>

          <Button
            variant="outline"
            @click="goToInquiryAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-teal-600 flex items-center justify-center"
            >
              <MessageCircle class="w-4 h-4 text-white" />
            </div>
            문의 관리
          </Button>

          <Button
            variant="outline"
            @click="goToUserAdmin"
            class="h-12 justify-start gap-3"
          >
            <div
              class="w-8 h-8 rounded bg-orange-600 flex items-center justify-center"
            >
              <User class="w-4 h-4 text-white" />
            </div>
            회원 관리
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 주문 현황 -->
    <Card class="mb-6">
      <CardHeader class="pb-2">
        <CardTitle class="text-heading flex items-center gap-2">
          주문 현황
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-4 gap-2">
          <button
            @click="goToOrderList('payment_confirmed')"
            class="flex flex-col items-center py-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"
            >
              <CheckCircle class="w-5 h-5 text-primary" />
            </div>
            <span class="text-caption mb-1">결제완료</span>
            <span class="text-body font-bold text-foreground">
              {{ orderCounts.payment_confirmed }}
            </span>
          </button>

          <button
            @click="goToOrderList('preparing')"
            class="flex flex-col items-center py-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"
            >
              <Settings class="w-5 h-5 text-primary" />
            </div>
            <span class="text-caption mb-1">배송준비중</span>
            <span class="text-body font-bold text-foreground">
              {{ orderCounts.preparing }}
            </span>
          </button>

          <button
            @click="goToOrderList('shipped')"
            class="flex flex-col items-center py-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"
            >
              <Truck class="w-5 h-5 text-primary" />
            </div>
            <span class="text-caption mb-1">배송중</span>
            <span class="text-body font-bold text-foreground">
              {{ orderCounts.shipped }}
            </span>
          </button>

          <button
            @click="goToOrderList('delivered')"
            class="flex flex-col items-center py-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
          >
            <div
              class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2"
            >
              <Package class="w-5 h-5 text-primary" />
            </div>
            <span class="text-caption mb-1">배송완료</span>
            <span class="text-body font-bold text-foreground">
              {{ orderCounts.delivered }}
            </span>
          </button>
        </div>
      </CardContent>
    </Card>

    <!-- 메뉴 목록 -->
    <Card class="mb-6">
      <CardHeader class="pb-2">
        <CardTitle class="text-heading">나의 쇼핑</CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <div class="divide-y divide-border">
          <button
            v-for="item in menuItems"
            :key="item.label"
            @click="item.action"
            class="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
          >
            <div class="flex items-center gap-4 pl-2">
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-body font-medium text-foreground">
                    {{ item.label }}
                  </span>
                  <span
                    v-if="item.badge && item.badge.value > 0"
                    class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground"
                  >
                    {{ item.badge.value }}
                  </span>
                </div>
                <p class="text-caption text-muted-foreground">
                  {{ item.description }}
                </p>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
