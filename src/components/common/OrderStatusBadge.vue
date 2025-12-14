<script setup lang="ts">
// src/components/common/OrderStatusBadge.vue
// 주문 상태 뱃지 컴포넌트

import { Badge } from "@/components/ui/badge";
import { formatOrderStatus } from "@/lib/formatters";
import { getStatusVariant, getStatusClass } from "@/composables/useOrders";
import type { OrderStatus } from "@/types/api";

interface Props {
  status: OrderStatus;
}

const props = defineProps<Props>();
</script>

<template>
  <Badge
    :variant="getStatusVariant(props.status)"
    :class="getStatusClass(props.status)"
  >
    {{ formatOrderStatus(props.status) }}
  </Badge>
</template>
