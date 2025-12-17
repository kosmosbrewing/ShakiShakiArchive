<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

import axios from "axios";

// 1. 사용자가 요청한 최종 데이터 형태 (Target Interface)
interface productProps {
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
  outerwear: "7e747dbf-e9f8-49a8-a502-8a899cace813",
  topwear: "b0040b04-9112-42ec-9ddd-4ee8c14f6151",
  bottomwear: "2d210390-36aa-4796-af92-8d88987021f3",
  accessories: "03eaedae-c230-42ff-a79e-2a2b67bd438d",
};

const route = useRoute(); // URL 정보를 가져오는 훅
const productList = ref<productProps[]>([]);
const loading = ref(false);

const fetchProductData = async () => {
  loading.value = true;

  // URL에서 현재 카테고리 값을 가져옴 (예: 'all', 'outerwear')
  // URL 파라미터 안전하게 가져오기
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

      rawData = rawData.filter(
        // categoryId와 currentCategory를 비교하는 부분에 사용됨
        (item) => item.categoryId === targetUUID
      );
    }

    // 데이터 변환 후 teamList에 할당
    productList.value = rawData.map((item) => ({
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
        v-for="{ imageUrl, name, price } in productList"
        :key="imageUrl"
        class="bg-muted/5 flex flex-col h-full overflow-hidden group/hoverimg"
      >
        <CardHeader class="p-0 gap-0">
          <div class="h-full overflow-hidden">
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />
          </div>
          <CardContent class="text-body py-6 pb-1 px-6">{{ name }} </CardContent>
        </CardHeader>

        <CardContent
          v-for="(position, index) in price"
          :key="index"
          :class="{
            'pb-0 text-body text-muted-foreground ': true,
            'pb-4': index === price.length - 1,
          }"
        >
          {{ position }}<span v-if="index < price.length - 1">,</span>
        </CardContent>
      </Card>
    </div>
  </section>
</template>
