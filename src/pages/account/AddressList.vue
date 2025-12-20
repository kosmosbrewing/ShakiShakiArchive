<script setup lang="ts">
// src/pages/AddressList.vue
// 배송지 관리 페이지

import { onMounted } from "vue";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useAddresses } from "@/composables/useAddresses";

// 공통 컴포넌트
import { LoadingSpinner, EmptyState, AddressCard } from "@/components/common";

import type { DeliveryAddress } from "@/types/api";

// 인증 체크
useAuthGuard();

// 배송지 목록 로직
const { addresses, loading, loadAddresses, removeAddress } = useAddresses();

// 배송지 수정 (준비 중)
const handleEdit = (address: DeliveryAddress) => {
  alert(`'${address.recipient}'님의 배송지 수정 기능을 준비 중입니다.`);
};

// 배송지 삭제
const handleDelete = (id: string) => {
  removeAddress(id);
};

onMounted(() => {
  loadAddresses();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 타이틀 -->
    <div class="mb-6 border-b pb-3">
      <h3 class="text-heading text-primary tracking-wider">배송지 관리</h3>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <!-- 빈 배송지 목록 -->
    <EmptyState
      v-else-if="addresses.length === 0"
      header="배송지정보"
      message="등록된 배송지가 없습니다."
      button-text="회원정보 가기"
      button-link="/account"
    />

    <!-- 배송지 목록 -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <AddressCard
        v-for="addr in addresses"
        :key="addr.id"
        :address="addr"
        @edit="handleEdit"
        @delete="handleDelete"
      />
    </div>
  </div>
</template>
