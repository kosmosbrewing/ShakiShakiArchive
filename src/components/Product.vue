<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { Heart } from "lucide-vue-next"; // [신규] 하트 아이콘 추가
import { useAuthStore } from "@/stores/auth"; // [신규] 인증 스토어
import { fetchWishlist, addToWishlist, removeFromWishlist } from "@/lib/api"; // [신규] API 함수

// 1. 데이터 인터페이스
interface productProps {
  id: number;
  imageUrl: string;
  name: string;
  price: string[];
}

interface ProductApiResponse {
  id: number;
  imageUrl: string;
  categoryId: string;
  name: string;
  price: number;
}

const CATEGORY_MAP: Record<string, string> = {
  outerwear: "e49b9124-af34-4c39-a9a0-24aac250f50e",
  topwear: "9433bfeb-4597-4e18-a132-96765faa2c71",
  bottomwear: "995c4d3b-4d65-4bc4-aca0-7a09ceae0d0a",
  accessories: "e34c8fcd-6b4b-42f2-905c-0dae5ee39480",
};

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const productList = ref<productProps[]>([]);
const loading = ref(false);

// [신규] 위시리스트에 담긴 상품 ID 목록 (빠른 조회를 위해 Set 사용)
const wishlistSet = ref<Set<number>>(new Set());

// 상품 데이터 불러오기
const fetchProductData = async () => {
  loading.value = true;

  const categoryParam = Array.isArray(route.params.category)
    ? route.params.category[0]
    : route.params.category;

  const currentCategory = categoryParam
    ? categoryParam.trim().toLowerCase()
    : "all";

  try {
    const response = await axios.get<ProductApiResponse[]>("/api/products");
    let rawData = response.data;

    if (currentCategory !== "all") {
      const targetUUID = CATEGORY_MAP[currentCategory];
      rawData = rawData.filter((item) => item.categoryId === targetUUID);
    }

    productList.value = rawData.map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      name: item.name,
      price: [
        `${Number(item.price).toLocaleString("ko-KR", {
          maximumFractionDigits: 0,
        })}원`,
      ],
    }));
  } catch (error) {
    console.error("API Error:", error);
  } finally {
    loading.value = false;
  }
};

// [신규] 위시리스트 목록 불러오기 (로그인 시)
const loadWishlist = async () => {
  if (!authStore.isAuthenticated) return;
  
  try {
    const items = await fetchWishlist();
    // items는 [{ productId: 1, ... }, ...] 형태라고 가정
    const ids = items.map((item: any) => item.productId);
    wishlistSet.value = new Set(ids);
  } catch (error) {
    console.error("위시리스트 로드 실패:", error);
  }
};

// [신규] 위시리스트 추가/삭제 토글
const toggleWishlist = async (event: Event, productId: number) => {
  event.stopPropagation(); // [중요] 상세 페이지 이동 방지

  if (!authStore.isAuthenticated) {
    if (confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")) {
      router.push("/login");
    }
    return;
  }

  try {
    if (wishlistSet.value.has(productId)) {
      // 이미 있으면 삭제
      await removeFromWishlist(productId);
      wishlistSet.value.delete(productId);
    } else {
      // 없으면 추가
      await addToWishlist(productId);
      wishlistSet.value.add(productId);
    }
    // 반응성을 위해 Set 재할당 (Vue 3 ref 특성)
    wishlistSet.value = new Set(wishlistSet.value);
  } catch (error) {
    console.error("위시리스트 처리 실패:", error);
    alert("처리 중 오류가 발생했습니다.");
  }
};

const goToDetail = (id: number) => {
  router.push(`/productDetail/${id}`);
};

onMounted(async () => {
  await fetchProductData();
  // 상품 로드 후 위시리스트 상태 확인
  if (authStore.isAuthenticated) {
    await loadWishlist();
  }
});
</script>

<template>
  <section id="team" class="container">
    <div
      class="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      <Card
        v-for="{ id, imageUrl, name, price } in productList"
        :key="id"
        class="bg-muted/5 flex flex-col h-full overflow-hidden group/hoverimg"
      >
        <CardHeader class="p-0 gap-0">
          <div
            class="h-full overflow-hidden cursor-pointer relative"
            @click="goToDetail(id)"
          >
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />

            <button
              @click="toggleWishlist($event, id)"
              class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white transition-colors shadow-sm"
              title="위시리스트 담기"
            >
              <Heart
                class="w-5 h-5 transition-colors duration-200"
                :class="wishlistSet.has(id) ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-gray-600'"
              />
            </button>
          </div>

          <CardContent
            class="text-sm py-6 pb-1 px-6 font-bold cursor-pointer hover:underline"
            @click="goToDetail(id)"
          >
            {{ name }}
          </CardContent>
        </CardHeader>

        <CardContent
          v-for="(position, index) in price"
          :key="index"
          :class="{
            'pb-0 text-sm text-muted-foreground ': true,
            'pb-4': index === price.length - 1,
          }"
        >
          {{ position }}<span v-if="index < price.length - 1">,</span>
        </CardContent>
      </Card>
    </div>
  </section>
</template>