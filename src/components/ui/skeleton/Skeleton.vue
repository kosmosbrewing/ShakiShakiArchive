<script setup lang="ts">
// src/components/ui/skeleton/Skeleton.vue
// Shadcn/Vue 패턴을 따르는 스켈레톤 컴포넌트

import { cn } from "@/lib/utils";

interface Props {
  class?: string;
}

const props = defineProps<Props>();
</script>

<template>
  <div :class="cn('animate-pulse rounded-md bg-muted', props.class)" />
</template>
