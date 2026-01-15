<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-vue-next";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <div :class="cn('flex items-center gap-2 text-caption text-destructive', props.class)">
    <AlertCircle class="w-3 h-3 flex-shrink-0" />
    <span class="flex-1 text-caption">
      <slot />
    </span>
  </div>
</template>
