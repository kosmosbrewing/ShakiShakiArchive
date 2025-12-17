<script setup lang="ts">
// src/components/common/AddressCard.vue
// 배송지 정보 카드 컴포넌트

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DeliveryAddress } from "@/types/api";

interface Props {
  address: DeliveryAddress;
  showActions?: boolean;
  selectable?: boolean;
}

withDefaults(defineProps<Props>(), {
  showActions: true,
  selectable: false,
});

const emit = defineEmits<{
  (e: "edit", address: DeliveryAddress): void;
  (e: "delete", id: number): void;
  (e: "select", address: DeliveryAddress): void;
}>();
</script>

<template>
  <Card
    :class="[
      'hover:border-primary/50 transition-colors',
      selectable ? 'cursor-pointer' : '',
    ]"
    @click="selectable && emit('select', address)"
  >
    <CardContent class="p-6 flex flex-col justify-between h-full">
      <!-- 헤더: 이름 + 기본배송지 뱃지 + 수정/삭제 -->
      <div class="flex justify-between items-start mb-4">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2">
            <span class="text-heading text-foreground">
              {{ address.recipient }}
            </span>
            <Badge v-if="address.isDefault" variant="default" class="text-[10px]">
              기본 배송지
            </Badge>
          </div>
          <span class="text-body text-muted-foreground">{{ address.phone }}</span>
        </div>

        <div v-if="showActions" class="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            @click.stop="emit('edit', address)"
            class="text-caption text-muted-foreground hover:text-primary h-auto p-1"
          >
            수정
          </Button>
          <span class="text-border">|</span>
          <Button
            variant="ghost"
            size="sm"
            @click.stop="emit('delete', address.id)"
            class="text-caption text-muted-foreground hover:text-destructive h-auto p-1"
          >
            삭제
          </Button>
        </div>

        <!-- 선택 버튼 (selectable 모드) -->
        <Button
          v-if="selectable"
          variant="outline"
          size="sm"
          @click.stop="emit('select', address)"
        >
          선택
        </Button>
      </div>

      <!-- 주소 정보 -->
      <div class="text-body space-y-1 mb-4 min-h-[60px]">
        <p class="text-muted-foreground">({{ address.zipCode }})</p>
        <p class="text-foreground">{{ address.address }}</p>
        <p class="text-foreground">{{ address.detailAddress }}</p>
      </div>

      <!-- 배송 메모 -->
      <div v-if="address.requestNote" class="mt-auto">
        <p class="text-caption text-primary bg-primary/10 p-2 rounded truncate">
          "{{ address.requestNote }}"
        </p>
      </div>
    </CardContent>
  </Card>
</template>
