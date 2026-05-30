<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ExternalLink } from "lucide-vue-next";
import { EmptyState, LoadingSpinner } from "@/components/common";
import { useOptimizedImage } from "@/composables";
import { fetchJournalImages } from "@/lib/api";
import type { SiteImage } from "@/types/api";

const { getResponsiveAttrs } = useOptimizedImage();

const images = ref<SiteImage[]>([]);
const isLoading = ref(true);
const errorMessage = ref("");

const sortedImages = computed(() =>
  [...images.value].sort((a, b) => a.displayOrder - b.displayOrder),
);

const getJournalImageAttrs = (url: string) =>
  getResponsiveAttrs(url, {
    widths: [480, 640, 960, 1280],
    sizes: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  });

const loadJournalImages = async () => {
  try {
    isLoading.value = true;
    errorMessage.value = "";
    images.value = await fetchJournalImages();
  } catch (error) {
    console.error("Journal 이미지 로드 실패:", error);
    errorMessage.value = "Journal 이미지를 불러오지 못했습니다.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadJournalImages);
</script>

<template>
  <section class="w-[94%] sm:w-11/12 max-w-screen-2xl mx-auto pt-4 pb-12 sm:pt-8 sm:pb-16">
    <nav
      class="hidden sm:flex items-center gap-7 mb-3"
      aria-label="Archive sections"
    >
      <RouterLink
        to="/archive/sold"
        class="inline-flex h-7 items-center border-b-2 border-transparent px-0.5 text-caption font-semibold tracking-wider text-muted-foreground transition-colors hover:text-primary"
      >
        sold archive
      </RouterLink>
      <RouterLink
        to="/archive/journal"
        class="inline-flex h-7 items-center border-b-2 border-primary px-0.5 text-caption font-semibold tracking-wider text-primary transition-colors"
      >
        journal
      </RouterLink>
    </nav>

    <div v-if="isLoading" class="py-16">
      <LoadingSpinner />
    </div>

    <EmptyState
      v-else-if="errorMessage"
      header="journal"
      :message="errorMessage"
      button-text="다시 불러오기"
      @action="loadJournalImages"
    />

    <EmptyState
      v-else-if="sortedImages.length === 0"
      header="journal"
      message="아직 등록된 Journal 이미지가 없습니다."
      button-text="sold archive 보기"
      button-link="/archive/sold"
    />

    <div
      v-else
      class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
    >
      <figure
        v-for="image in sortedImages"
        :key="image.id"
        class="group overflow-hidden bg-muted/10"
      >
        <a
          v-if="image.linkUrl"
          :href="image.linkUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="block"
        >
          <span class="relative block aspect-[4/5] overflow-hidden">
            <img
              v-bind="getJournalImageAttrs(image.imageUrl)"
              alt="journal"
              class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
              decoding="async"
              draggable="false"
            />
            <span
              class="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-primary shadow-sm"
              aria-hidden="true"
            >
              <ExternalLink class="h-4 w-4" />
            </span>
          </span>
        </a>
        <div v-else class="aspect-[4/5] overflow-hidden">
          <img
            v-bind="getJournalImageAttrs(image.imageUrl)"
            alt="journal"
            class="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            draggable="false"
          />
        </div>
      </figure>
    </div>
  </section>
</template>
