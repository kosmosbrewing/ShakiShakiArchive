<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  BarChart3,
  Image,
  MessageCircle,
  Package,
  ShoppingBag,
  Settings,
  User,
} from "lucide-vue-next";

const route = useRoute();

const adminTabs = [
  {
    label: "상품 관리",
    to: "/admin/products",
    icon: Package,
    iconClass: "bg-primary text-primary-foreground",
  },
  {
    label: "카테고리 관리",
    to: "/admin/categories",
    icon: Settings,
    iconClass: "bg-slate-900 text-white",
  },
  {
    label: "주문/배송 관리",
    to: "/admin/orders",
    icon: ShoppingBag,
    iconClass: "bg-blue-600 text-white",
  },
  {
    label: "사이트 이미지 관리",
    to: "/admin/site-images",
    icon: Image,
    iconClass: "bg-purple-600 text-white",
  },
  {
    label: "문의 관리",
    to: "/admin/inquiries",
    icon: MessageCircle,
    iconClass: "bg-teal-600 text-white",
  },
  {
    label: "회원 관리",
    to: "/admin/users",
    icon: User,
    iconClass: "bg-orange-600 text-white",
  },
  {
    label: "통계 관리",
    to: "/admin/analytics",
    icon: BarChart3,
    iconClass: "bg-emerald-600 text-white",
  },
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
              variant="outline"
              :class="
                isActiveTab(tab.to)
                  ? 'bg-transparent border-transparent outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ring-2 ring-ring ring-offset-2 ring-offset-background text-admin-muted hover:bg-transparent active:bg-transparent'
                  : 'bg-transparent text-admin-muted hover:bg-transparent hover:border-border/80 hover:text-admin-muted active:bg-transparent'
              "
            >
              <RouterLink :to="tab.to">
                <span class="flex items-center gap-2">
                  <span class="w-6 h-6 rounded-md flex items-center justify-center" :class="tab.iconClass">
                    <component
                      :is="tab.icon"
                      class="w-3.5 h-3.5 text-white"
                    />
                  </span>
                  <span>{{ tab.label }}</span>
                </span>
              </RouterLink>
            </Button>
          </li>
        </ul>
      </nav>
    </CardContent>
  </Card>
</template>
