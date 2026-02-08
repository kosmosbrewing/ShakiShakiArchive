<script setup lang="ts">
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ref, onMounted } from "vue";
import { fetchAllProducts } from "@/lib/api";

// 상품 표시용 타입
interface productProps {
  imageUrl: string;
  name: string;
  price: string[];
}

const productList = ref<productProps[]>([]);
const loading = ref(false);

const fetchProductData = async () => {
  loading.value = true;

  try {
    const rawData = await fetchAllProducts();

    // 데이터 변환 후 productList에 할당
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
              crossorigin="anonymous"
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
