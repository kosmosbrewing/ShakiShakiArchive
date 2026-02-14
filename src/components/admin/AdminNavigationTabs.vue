<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const route = useRoute();

const adminTabs = [
  { label: "상품 관리", to: "/admin/products" },
  { label: "카테고리 관리", to: "/admin/categories" },
  { label: "주문/배송 관리", to: "/admin/orders" },
  { label: "사이트 이미지 관리", to: "/admin/site-images" },
  { label: "문의 관리", to: "/admin/inquiries" },
  { label: "회원 관리", to: "/admin/users" },
] as const;

const isActiveTab = (path: string) => route.path === path;
</script>

<template>
  <Card class="mb-6">
    <CardContent class="p-3 lg:p-4">
      <nav aria-label="관리자 페이지 네비게이션">
        <ul class="flex flex-wrap gap-2">
          <li v-for="tab in adminTabs" :key="tab.to">
            <Button
              as-child
              size="sm"
              :variant="isActiveTab(tab.to) ? 'default' : 'outline'"
              :class="
                isActiveTab(tab.to)
                  ? 'bg-primary hover:bg-primary/90 text-white font-semibold'
                  : 'text-admin-muted hover:text-admin'
              "
            >
              <RouterLink :to="tab.to">
                {{ tab.label }}
              </RouterLink>
            </Button>
          </li>
        </ul>
      </nav>
    </CardContent>
  </Card>
</template>
