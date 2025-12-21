<script setup lang="ts">
// src/components/common/AddressSearchModal.vue
// 주소 검색 모달 컴포넌트

import { watch } from "vue";
import { useAddressSearch } from "@/composables/useAddressSearch";
import { Search, MapPin, Loader2 } from "lucide-vue-next";
import type { AddressSearchResult } from "@/types/api";

// UI 컴포넌트
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  open: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", address: { zonecode: string; address: string }): void;
}>();

// 주소 검색 로직
const addressSearch = useAddressSearch();

// 모달이 열릴 때 초기화
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      addressSearch.reset();
    }
  }
);

// 주소 선택 핸들러
const handleSelect = (result: AddressSearchResult) => {
  // 도로명 주소 우선, 없으면 지번 주소 사용
  const address = result.roadAddress || result.jibunAddress || result.addressName;

  emit("select", {
    zonecode: result.zonecode,
    address: address,
  });
  emit("close");
};

// 검색 실행
const handleSearch = () => {
  addressSearch.search();
};

// Enter 키 처리
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    handleSearch();
  }
};
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    @click.self="emit('close')"
  >
    <Card
      class="w-full max-w-lg max-h-[80vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200"
    >
      <CardHeader
        class="flex flex-row items-center justify-between border-b py-4"
      >
        <CardTitle class="text-heading flex items-center gap-2">
          <MapPin class="w-5 h-5" />
          주소 검색
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          @click="emit('close')"
          class="h-8 w-8 rounded-full"
        >
          ✕
        </Button>
      </CardHeader>

      <CardContent class="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
        <!-- 검색 입력 -->
        <div class="flex gap-2">
          <Input
            v-model="addressSearch.query.value"
            type="text"
            placeholder="도로명, 건물명, 지번 검색"
            class="flex-1"
            @keydown="handleKeydown"
          />
          <Button
            @click="handleSearch"
            :disabled="addressSearch.loading.value || !addressSearch.hasQuery.value"
          >
            <Loader2
              v-if="addressSearch.loading.value"
              class="w-4 h-4 animate-spin"
            />
            <Search v-else class="w-4 h-4" />
          </Button>
        </div>

        <!-- 에러 메시지 -->
        <p v-if="addressSearch.error.value" class="text-caption text-destructive">
          {{ addressSearch.error.value }}
        </p>

        <!-- 검색 결과 -->
        <div class="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
          <!-- 로딩 -->
          <div
            v-if="addressSearch.loading.value && !addressSearch.hasResults.value"
            class="flex items-center justify-center py-8"
          >
            <Loader2 class="w-6 h-6 animate-spin text-muted-foreground" />
          </div>

          <!-- 결과 없음 -->
          <div
            v-else-if="!addressSearch.hasResults.value && addressSearch.hasQuery.value && !addressSearch.loading.value"
            class="text-center py-8 text-muted-foreground"
          >
            <p>검색 결과가 없습니다.</p>
            <p class="text-caption mt-1">다른 검색어로 다시 시도해주세요.</p>
          </div>

          <!-- 초기 상태 -->
          <div
            v-else-if="!addressSearch.hasResults.value"
            class="text-center py-8 text-muted-foreground"
          >
            <MapPin class="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>도로명, 건물명 또는 지번으로 검색해주세요.</p>
            <p class="text-caption mt-1">예: 테헤란로 123, 강남역, 역삼동 123-45</p>
          </div>

          <!-- 검색 결과 목록 -->
          <button
            v-for="(result, idx) in addressSearch.results.value"
            :key="idx"
            @click="handleSelect(result)"
            class="w-full text-left p-3 rounded-lg border border-border hover:bg-accent hover:border-primary/50 transition-colors"
          >
            <div class="flex items-start gap-2">
              <span
                class="shrink-0 px-1.5 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded"
              >
                {{ result.zonecode }}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-body font-medium text-foreground truncate">
                  {{ result.roadAddress || result.addressName }}
                </p>
                <p
                  v-if="result.jibunAddress && result.roadAddress"
                  class="text-caption text-muted-foreground truncate"
                >
                  (지번) {{ result.jibunAddress }}
                </p>
                <p
                  v-if="result.buildingName"
                  class="text-caption text-muted-foreground"
                >
                  {{ result.buildingName }}
                </p>
              </div>
            </div>
          </button>

          <!-- 더 보기 버튼 -->
          <div
            v-if="addressSearch.hasResults.value && !addressSearch.isEnd.value"
            class="pt-2"
          >
            <Button
              variant="outline"
              class="w-full"
              size="sm"
              @click="addressSearch.loadMore"
              :disabled="addressSearch.loading.value"
            >
              <Loader2
                v-if="addressSearch.loading.value"
                class="w-4 h-4 mr-2 animate-spin"
              />
              더 보기
            </Button>
          </div>
        </div>

        <!-- 검색 결과 개수 -->
        <p
          v-if="addressSearch.hasResults.value"
          class="text-caption text-muted-foreground text-center"
        >
          총 {{ addressSearch.totalCount.value }}건의 결과
        </p>
      </CardContent>
    </Card>
  </div>
</template>
