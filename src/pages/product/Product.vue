<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { Heart } from "lucide-vue-next";
import { useAuthStore } from "@/stores/auth";
import { fetchWishlist, addToWishlist, removeFromWishlist } from "@/lib/api";

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
  categoryId: number; // [변경] 백엔드에서 number로 오므로 타입 수정
  name: string;
  price: number;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const productList = ref<productProps[]>([]);
const loading = ref(false);
const wishlistSet = ref<Set<number>>(new Set());

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
      price: [
        `${Number(item.price).toLocaleString("ko-KR", {
          maximumFractionDigits: 0,
        })}원`,
      ],
    }));
  } catch (error) {
    console.error("API Error:", error);
    productList.value = []; // 에러 시 빈 목록
  } finally {
    loading.value = false;
  }
};

// 위시리스트 목록 불러오기
const loadWishlist = async () => {
  if (!authStore.isAuthenticated) return;

  try {
    const items = await fetchWishlist();
    const ids = items.map((item: any) => item.productId);
    wishlistSet.value = new Set(ids);
  } catch (error) {
    console.error("위시리스트 로드 실패:", error);
  }
};

// 위시리스트 추가/삭제 토글
const toggleWishlist = async (event: Event, productId: number) => {
  event.stopPropagation();

  if (!authStore.isAuthenticated) {
    if (
      confirm("로그인이 필요한 서비스입니다. 로그인 페이지로 이동하시겠습니까?")
    ) {
      router.push("/login");
    }
    return;
  }

  try {
    if (wishlistSet.value.has(productId)) {
      await removeFromWishlist(productId);
      wishlistSet.value.delete(productId);
    } else {
      await addToWishlist(productId);
      wishlistSet.value.add(productId);
    }
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
  if (authStore.isAuthenticated) {
    await loadWishlist();
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
  <section id="team" class="container">
    <div
      class="mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
    >
      <div v-if="loading" class="col-span-full text-center py-20">
        <div
          class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
        ></div>
      </div>

      <div
        v-else-if="productList.length === 0"
        class="col-span-full text-center py-20 text-gray-500"
      >
        등록된 상품이 없습니다.
      </div>

      <Card
        v-else
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
                :class="
                  wishlistSet.has(id)
                    ? 'fill-red-500 text-red-500'
                    : 'text-gray-400 hover:text-gray-600'
                "
              />
            </button>
          </div>

          <CardContent
            class="text-body py-6 pb-1 px-6 font-bold cursor-pointer hover:underline"
            @click="goToDetail(id)"
          >
            {{ name }}
          </CardContent>
        </CardHeader>

        <CardContent
          v-for="(position, index) in price"
          :key="index"
          :class="{
            'pb-0 text-body': true,
            'pb-4': index === price.length - 1,
          }"
        >
          {{ position }}<span v-if="index < price.length - 1">,</span>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
