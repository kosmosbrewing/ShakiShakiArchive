<script setup lang="ts">
// src/components/common/OrderStatusBadge.vue
// 주문 상태 뱃지 컴포넌트 (반품 상태 포함)

import { Badge } from "@/components/ui/badge";
import { formatOrderStatus } from "@/lib/formatters";
import { getStatusVariant, getStatusClass } from "@/composables/useOrders";
import type { OrderStatus, OrderItemStatus } from "@/types/api";

interface Props {
  status: OrderStatus | OrderItemStatus;
}

const props = defineProps<Props>();
</script>

<template>
  <Badge
    :variant="getStatusVariant(props.status)"
    :class="['text-xs px-2 py-0.5', getStatusClass(props.status)]"
  >
    {{ formatOrderStatus(props.status) }}
  </Badge>
</template>
