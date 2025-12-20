<script setup lang="ts">
// src/components/common/EmptyState.vue
// 빈 상태 표시 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-vue-next";

interface Props {
  header: string;
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
      <!-- 메시지 -->
      <h3 class="text-heading mb-2">{{ header }}</h3>
      <p class="text-body text-muted-foreground mb-6">{{ message }}</p>

      <!-- 버튼 (링크 또는 이벤트) -->
      <router-link v-if="buttonLink" :to="buttonLink">
        <Button size="lg"
          >{{ buttonText }} <ArrowRight class="ml-2 w-4 h-4"
        /></Button>
      </router-link>
      <Button v-else-if="buttonText" size="lg" @click="emit('action')">
        {{ buttonText }}
      </Button>

      <!-- 커스텀 슬롯 -->
      <slot />
    </CardContent>
  </Card>
</template>
