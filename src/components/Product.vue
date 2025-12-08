<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router"; // useRouter 추가

import axios from "axios";

// 1. 사용자가 요청한 최종 데이터 형태 (Target Interface)
interface productProps {
  id: number; // [수정] 상세 페이지 이동을 위해 ID 필수 추가
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
const router = useRouter(); // [수정] 라우터 인스턴스 생성
const productList = ref<productProps[]>([]);
const loading = ref(false);

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

    // 데이터 변환 후 teamList에 할당
    productList.value = rawData.map((item) => ({
      id: item.id, // [수정] ID 매핑 추가
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

// [수정] 상세 페이지 이동 함수
const goToDetail = (id: number) => {
  router.push(`/productDetail/${id}`);
};

// 초기 진입 시 실행
onMounted(() => {
  fetchProductData();
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
            class="h-full overflow-hidden cursor-pointer"
            @click="goToDetail(id)"
          >
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />
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
