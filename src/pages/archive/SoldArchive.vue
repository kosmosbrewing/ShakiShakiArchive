<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import {
  ProductCardSkeleton,
  ProductGridCard,
  EmptyState,
  LoadingSpinner,
} from "@/components/common";
import { useAuthStore } from "@/stores/auth";
import { useWishlistStore } from "@/stores/wishlist";
import { useAlert } from "@/composables/useAlert";
import { useProductList } from "@/composables/useProduct";

const router = useRouter();
const authStore = useAuthStore();
const wishlistStore = useWishlistStore();
const { showAlert, showConfirm } = useAlert();

const {
  products,
  loading,
  loadingMore,
  hasMore,
  loadProducts,
  loadMoreProducts,
} = useProductList({ soldOutOnly: true });

const { productIdSet: wishlistSet } = storeToRefs(wishlistStore);
const loadMoreTrigger = ref<HTMLDivElement | null>(null);
const showLoadingSpinner = ref(false);

let observer: IntersectionObserver | null = null;
let loadingDelayTimer: ReturnType<typeof setTimeout> | null = null;

const goToDetail = (slug: string | null | undefined, id: string) => {
  router.push(`/productDetail/${slug || id}`);
};

const toggleWishlist = async (productId: string) => {
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

const setupIntersectionObserver = () => {
  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (
        entry.isIntersecting &&
        !loadingMore.value &&
        hasMore.value &&
        !loading.value
      ) {
        loadMoreProducts();
      }
    },
    {
      rootMargin: "200px",
      threshold: 0.1,
    }
  );

  if (loadMoreTrigger.value) {
    observer.observe(loadMoreTrigger.value);
  }
};

const cleanupObserver = () => {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
};

watch(loadMoreTrigger, (newEl) => {
  cleanupObserver();
  if (newEl) {
    setupIntersectionObserver();
  }
});

watch(loadingMore, (newValue) => {
  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }

  if (newValue) {
    loadingDelayTimer = setTimeout(() => {
      showLoadingSpinner.value = true;
    }, 150);
  } else {
    showLoadingSpinner.value = false;
  }
});

onMounted(async () => {
  await loadProducts();

  if (loadMoreTrigger.value) {
    setupIntersectionObserver();
  }

  if (authStore.isAuthenticated) {
    await wishlistStore.loadWishlist();
  }
});

onUnmounted(() => {
  cleanupObserver();

  if (loadingDelayTimer) {
    clearTimeout(loadingDelayTimer);
    loadingDelayTimer = null;
  }
});
</script>

<template>
  <section class="w-[94%] sm:w-11/12 max-w-screen-2xl mx-auto pt-4 pb-12 sm:pt-8 sm:pb-16">
    <nav
      class="hidden sm:flex items-center gap-7 mb-3"
      aria-label="Archive sections"
    >
      <RouterLink
        to="/archive/sold"
        class="inline-flex h-7 items-center border-b-2 border-primary px-0.5 text-caption font-semibold tracking-wider text-primary transition-colors"
      >
        sold archive
      </RouterLink>
      <RouterLink
        to="/archive/journal"
        class="inline-flex h-7 items-center border-b-2 border-transparent px-0.5 text-caption font-semibold tracking-wider text-muted-foreground transition-colors hover:text-primary"
      >
        journal
      </RouterLink>
    </nav>

    <div
      class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-x-3 gap-y-6 sm:gap-x-6 sm:gap-y-8"
    >
      <ProductCardSkeleton v-if="loading" :count="8" />

      <EmptyState
        v-else-if="products.length === 0"
        header="sold archive"
        message="아직 판매 완료된 상품이 없습니다."
        button-text="shop 보기"
        button-link="/product/all"
        class="col-span-full"
      />

      <ProductGridCard
        v-else
        v-for="({ id, slug, imageUrl, images, name, price }, idx) in products"
        :id="id"
        :key="id"
        :slug="slug"
        :image-url="imageUrl"
        :images="images"
        :name="name"
        :price="price"
        is-sold-out
        :is-wishlisted="wishlistSet.has(id)"
        :animation-delay="`${Math.min(idx % 8, 7) * 0.05}s`"
        @open="goToDetail"
        @action="toggleWishlist"
      />
    </div>

    <div
      v-if="products.length > 0 || hasMore"
      ref="loadMoreTrigger"
      class="py-8 flex justify-center"
    >
      <div v-if="showLoadingSpinner" class="flex flex-col items-center gap-3">
        <LoadingSpinner size="md" variant="dots" :center="false" />
        <span class="text-body text-muted-foreground">
          상품을 불러오는 중...
        </span>
      </div>
      <div
        v-else-if="!hasMore && products.length > 0"
        class="text-caption text-muted-foreground"
      >
        모든 상품을 불러왔습니다
      </div>
    </div>
  </section>
</template>
