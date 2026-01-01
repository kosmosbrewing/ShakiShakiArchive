<script setup lang="ts">
// src/pages/product/ProductHome.vue
// 홈 히어로 섹션용 상품 목록 컴포넌트

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { Heart } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useAlert } from "@/composables/useAlert";
import { ProductCardSkeleton, EmptyState } from "@/components/common";
import { formatPrice } from "@/lib/formatters";
import { Separator } from "@/components/ui/separator";
import { useOptimizedImage } from "@/composables";

// 1. 데이터 인터페이스
interface ProductItem {
  id: string; // UUID
  imageUrl: string;
  name: string;
  price: number;
}

interface ProductApiResponse {
  id: string; // UUID
  imageUrl: string;
  categoryId: number; // 카테고리는 serial
  name: string;
  price: number;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const { showAlert, showConfirm } = useAlert();
const { card } = useOptimizedImage();

const productList = ref<ProductItem[]>([]);
const loading = ref(false);

// 위시리스트 Set (스토어에서 반응성 유지)
const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);

// [핵심] 상품 데이터 불러오기 (백엔드 필터링 적용)
const fetchProductData = async () => {
  loading.value = true;

  try {
    // 1. URL에서 카테고리 슬러그 추출 (예: 'outerwear')
    const categoryParam = Array.isArray(route.params.category)
      ? route.params.category[0]
      : route.params.category;

    // 'all'이거나 없으면 undefined 처리 (백엔드가 전체 목록 반환)
    const currentSlug =
      !categoryParam || categoryParam === "all"
        ? undefined
        : categoryParam.trim().toLowerCase();

    // 2. 백엔드에 요청 (필터링은 서버가 담당)
    // 요청 URL 예시: GET /api/products?category=outerwear
    const response = await axios.get<ProductApiResponse[]>("/api/products", {
      params: {
        category: currentSlug,
      },
    });

    // 3. 받아온 데이터를 그대로 화면용으로 변환
    productList.value = response.data.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      name: item.name,
      price: Number(item.price),
    }));
  } catch (error) {
    console.error("API Error:", error);
    productList.value = []; // 에러 시 빈 목록
  } finally {
    loading.value = false;
  }
};

// 위시리스트 추가/삭제 토글 (스토어 활용)
const toggleWishlist = async (event: Event, productId: string) => {
  event.stopPropagation();

  if (!authStore.isAuthenticated) {
    const confirmed = await showConfirm(
      "로그인이 필요한 서비스입니다.\n로그인 페이지로 이동하시겠습니까?",
      { confirmText: "로그인", cancelText: "취소" }
    );
    if (confirmed) {
      router.push("/login");
    }
    return;
  }

  try {
    await wishlistStore.toggleItem(productId);
  } catch (error) {
    console.error("위시리스트 처리 실패:", error);
    showAlert("처리 중 오류가 발생했습니다.", { type: "error" });
  }
};

const goToDetail = (id: string) => {
  router.push(`/productDetail/${id}`);
};

onMounted(async () => {
  await fetchProductData();
  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
});

// [중요] 카테고리가 바뀌면(URL 변경) 데이터를 다시 불러옴
watch(
  () => route.params.category,
  () => {
    fetchProductData();
  }
);
</script>

<template>
  <div class="grid grid-cols-2 gap-4 sm:gap-6">
    <!-- 로딩 상태: 스켈레톤 카드 표시 -->
    <ProductCardSkeleton v-if="loading" :count="4" />

    <!-- 빈 상태 -->
    <EmptyState
      v-else-if="productList.length === 0"
      header="상품 없음"
      message="등록된 상품이 없습니다."
      class="col-span-full"
    />

    <!-- 상품 카드 목록 -->
    <Card
      v-else
      v-for="({ id, imageUrl, name, price }, idx) in productList"
      :key="id"
      class="product-card bg-muted/5 flex flex-col h-full overflow-hidden group/hoverimg border-0 shadow-sm hover:shadow-md transition-shadow"
      :style="{ animationDelay: `${idx * 0.05}s` }"
    >
      <CardHeader class="p-0 gap-0">
        <div
          class="h-full overflow-hidden cursor-pointer relative"
          @click="goToDetail(id)"
        >
          <img
            :src="card(imageUrl)"
            :alt="name"
            class="w-full aspect-square object-cover transition-all duration-200 ease-linear size-full group-hover/hoverimg:scale-[1.02]"
            loading="lazy"
            decoding="async"
            draggable="false"
          />

          <!-- 위시리스트 버튼 -->
          <button
            @click="toggleWishlist($event, id)"
            class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-white transition-colors shadow-md shadow-light"
            title="위시리스트 담기"
          >
            <Heart
              class="w-5 h-5 transition-colors duration-200"
              :class="
                wishlistSet.has(id)
                  ? 'fill-primary text-primary'
                  : 'text-muted-foreground group-hover:text-primary'
              "
            />
          </button>
        </div>
        <Separator></Separator>
        <!-- 상품명 -->
        <CardContent
          class="py-3 px-4 cursor-pointer hover:underline line-clamp-2"
          @click="goToDetail(id)"
        >
          <span class="text-caption text-foreground"> {{ name }}</span>
        </CardContent>
        <!-- 가격 -->
        <CardContent class="pb-2 px-4 -translate-y-3">
          <span class="text-caption text-muted-foreground/80">
            {{ formatPrice(price) }}</span
          >
        </CardContent>
      </CardHeader>
    </Card>
  </div>
</template>

<style scoped>
.product-card {
  animation: slideUp 0.3s ease-out both;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
