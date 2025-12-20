<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { Separator, type SeparatorProps } from "radix-vue";
import { cn } from "@/lib/utils";

const props = defineProps<
  SeparatorProps & { class?: HTMLAttributes["class"] }
>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;

  return delegated;
});
</script>

<template>
  <Separator
    v-bind="delegatedProps"
    :class="
      cn(
        'shrink-0',
        props.orientation === 'vertical'
          ? 'w-px h-full bg-zinc-200 shadow-[1px_0_0_rgba(0,0,0,0.05)]' // 세로: 오른쪽으로 미세 단차
          : 'h-px w-full bg-zinc-200 shadow-[0_1px_0_rgba(0,0,0,0.05),0_-0.5px_0_rgba(0,0,0,0.1)]', // 가로: 위아래 이중 그림자
        props.class
      )
    "
  />
</template>
