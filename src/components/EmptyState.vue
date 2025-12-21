<script setup lang="ts">
import { Button } from "@/components/ui/button";

defineProps<{
  title: string;
  description?: string;
  actionText?: string;
  actionTo?: string;
}>();
const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center py-12 text-center"
    data-testid="empty-state"
  >
    <div class="mb-4 text-6xl opacity-50">📦</div>
    <h3 class="mb-2 text-heading" data-testid="text-empty-title">
      {{ title }}
    </h3>
    <p
      v-if="description"
      class="mb-6 text-muted-foreground"
      data-testid="text-empty-description"
    >
      {{ description }}
    </p>

    <router-link
      v-if="actionTo"
      :to="actionTo"
      class="rounded-lg bg-primary px-6 py-2 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      data-testid="link-empty-action"
    >
      {{ actionText || "돌아가기" }}
    </router-link>

    <Button
      v-else-if="actionText"
      @click="emit('action')"
      class="rounded-lg bg-primary px-6 py-2 text-body font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      data-testid="button-empty-action"
    >
      {{ actionText }}
    </Button>
  </div>
</template>
