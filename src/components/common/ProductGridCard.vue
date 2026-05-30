<script setup lang="ts">
// src/components/common/ProductGridCard.vue
// 상품 그리드 카드 공통 컴포넌트

import { ref } from "vue";
import { Heart, Trash2 } from "lucide-vue-next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useOptimizedImage } from "@/composables";
import { formatPrice } from "@/lib/formatters";

type CardAction = "wishlist" | "delete" | "none";

const props = withDefaults(
  defineProps<{
    id: string;
    name: string;
    imageUrl: string;
    price: string | number;
    slug?: string | null;
    images?: string[];
    isSoldOut?: boolean;
    isWishlisted?: boolean;
    action?: CardAction;
    animationDelay?: string;
  }>(),
  {
    slug: null,
    images: () => [],
    isSoldOut: false,
    isWishlisted: false,
    action: "wishlist",
    animationDelay: "0s",
  },
);

const emit = defineEmits<{
  open: [slug: string | null | undefined, id: string];
  action: [id: string];
}>();

const { getResponsiveAttrs } = useOptimizedImage();
const hovered = ref(false);

const getProductImageAttrs = (url: string) =>
  getResponsiveAttrs(url, {
    widths: [320, 480, 640],
    sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  });

const openProduct = () => {
  emit("open", props.slug, props.id);
};

const handleAction = () => {
  emit("action", props.id);
};
</script>

<template>
  <Card
    class="product-card rounded-none bg-transparent flex flex-col h-full group/hoverimg border-none !shadow-none relative mt-3"
    :style="{ animationDelay }"
  >
    <CardHeader class="p-0 gap-0">
      <div
        class="aspect-square cursor-pointer relative overflow-hidden rounded-[3px] bg-muted/10 ring-1 ring-primary/10 transition-shadow duration-300 group-hover/hoverimg:ring-primary/20"
        @click="openProduct"
        @mouseenter="hovered = true"
        @mouseleave="hovered = false"
      >
        <img
          v-bind="getProductImageAttrs(imageUrl)"
          :alt="name"
          class="absolute inset-0 w-full aspect-square object-cover size-full transition-[opacity,transform] duration-500 ease-out group-hover/hoverimg:scale-[1.025]"
          :class="hovered && images.length > 0 ? 'opacity-0' : 'opacity-100'"
          draggable="false"
        />
        <img
          v-if="images.length > 0"
          v-bind="getProductImageAttrs(images[0])"
          alt=""
          class="absolute inset-0 w-full aspect-square object-cover size-full transition-[opacity,transform] duration-500 ease-out group-hover/hoverimg:scale-[1.025]"
          :class="hovered ? 'opacity-100' : 'opacity-0'"
          draggable="false"
        />

        <div
          v-if="isSoldOut"
          class="sold-out-chip absolute top-2 right-2 z-10"
        >
          SOLD OUT
        </div>

        <button
          v-if="action !== 'none'"
          @click.stop="handleAction"
          class="absolute bottom-3 right-3 z-10 p-2 rounded-full bg-white/85 hover:bg-white ring-1 ring-primary/10 backdrop-blur-sm transition-colors shadow-sm"
          :title="action === 'delete' ? '위시리스트에서 삭제' : '위시리스트 담기'"
          :aria-label="action === 'delete' ? '위시리스트에서 삭제' : '위시리스트 담기'"
        >
          <Trash2
            v-if="action === 'delete'"
            class="w-5 h-5 text-muted-foreground hover:text-primary transition-colors"
          />
          <Heart
            v-else
            class="w-5 h-5 transition-colors duration-200"
            :class="
              isWishlisted
                ? 'fill-primary text-primary'
                : 'text-muted-foreground group-hover:text-primary'
            "
          />
        </button>
      </div>

      <CardContent
        class="px-1 pt-3 pb-0 cursor-pointer text-center"
        @click="openProduct"
      >
        <span class="text-caption text-foreground leading-snug line-clamp-2 transition-colors group-hover/hoverimg:text-primary">
          {{ name }}
        </span>
      </CardContent>

      <CardContent class="px-1 pt-1 pb-0 text-center">
        <span class="text-caption text-muted-foreground/85">
          {{ formatPrice(price) }}
        </span>
      </CardContent>
    </CardHeader>
  </Card>
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

@media (prefers-reduced-motion: reduce) {
  .product-card {
    animation: none;
  }
}
</style>
