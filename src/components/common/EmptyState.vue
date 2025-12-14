<script setup lang="ts">
// src/components/common/EmptyState.vue
// 빈 상태 표시 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  message: string;
  buttonText?: string;
  buttonLink?: string;
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  buttonText: "",
  buttonLink: "",
  icon: "",
});

const emit = defineEmits<{
  (e: "action"): void;
}>();
</script>

<template>
  <Card class="text-center py-16">
    <CardContent>
      <!-- 아이콘 슬롯 -->
      <div v-if="$slots.icon" class="mb-4 flex justify-center">
        <slot name="icon" />
      </div>

      <!-- 메시지 -->
      <p class="text-muted-foreground mb-6">{{ message }}</p>

      <!-- 버튼 (링크 또는 이벤트) -->
      <router-link v-if="buttonLink" :to="buttonLink">
        <Button variant="outline">{{ buttonText }}</Button>
      </router-link>
      <Button v-else-if="buttonText" variant="outline" @click="emit('action')">
        {{ buttonText }}
      </Button>

      <!-- 커스텀 슬롯 -->
      <slot />
    </CardContent>
  </Card>
</template>
