<script setup lang="ts">
// src/pages/AddressList.vue
// 배송지 관리 페이지

import { ref, onMounted } from "vue";
import { useAuthGuard } from "@/composables/useAuthGuard";
import { useAddresses, useShippingForm } from "@/composables/useAddresses";
import { useAlert } from "@/composables/useAlert";

// 공통 컴포넌트
import {
  LoadingSpinner,
  EmptyState,
  AddressCard,
  AddressForm,
  AddressSearchModal,
} from "@/components/common";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DeliveryAddress } from "@/types/api";

// 인증 체크
useAuthGuard();

const { showAlert } = useAlert();

// 배송지 목록 로직
const { addresses, loading, loadAddresses, editAddress, removeAddress } =
  useAddresses();

// 수정 폼 관리
const shippingForm = useShippingForm();

// 수정 모달 상태
const isEditModalOpen = ref(false);
const isAddressSearchOpen = ref(false);
const editingAddress = ref<DeliveryAddress | null>(null);
const isSaving = ref(false);

// 배송지 수정 모달 열기
const handleEdit = (address: DeliveryAddress) => {
  editingAddress.value = address;
  shippingForm.fillFromAddress(address);
  isEditModalOpen.value = true;
};

// 모달 닫기
const closeEditModal = () => {
  isEditModalOpen.value = false;
  editingAddress.value = null;
  shippingForm.clearForm();
};

// 주소 검색 모달 열기
const openAddressSearch = () => {
  isAddressSearchOpen.value = true;
};

// 주소 선택 핸들러
const handleAddressSelect = (address: { zonecode: string; address: string }) => {
  shippingForm.form.zipCode = address.zonecode;
  shippingForm.form.address = address.address;
  shippingForm.form.detailAddress = ""; // 상세 주소 초기화
};

// 배송지 수정 저장
const handleSaveEdit = async () => {
  if (!editingAddress.value) return;

  if (!shippingForm.isValid.value) {
    showAlert("필수 항목을 모두 입력해주세요.", { type: "error" });
    return;
  }

  isSaving.value = true;

  const success = await editAddress(editingAddress.value.id, {
    recipient: shippingForm.form.recipient,
    phone: shippingForm.fullPhone.value,
    zipCode: shippingForm.form.zipCode,
    address: shippingForm.form.address,
    detailAddress: shippingForm.form.detailAddress,
    requestNote:
      shippingForm.form.message === "self"
        ? shippingForm.form.customMessage
        : shippingForm.form.message,
    isDefault: shippingForm.form.saveDefault,
  });

  isSaving.value = false;

  if (success) {
    showAlert("배송지가 수정되었습니다.");
    closeEditModal();
  } else {
    showAlert("배송지 수정에 실패했습니다.", { type: "error" });
  }
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
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">배송지 관리</h3>
      <Separator></Separator>
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

    <!-- 배송지 수정 모달 -->
    <div
      v-if="isEditModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4 backdrop-blur-sm"
      @click.self="closeEditModal"
    >
      <Card
        class="w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-xl animate-in fade-in zoom-in-95 duration-200"
      >
        <CardHeader
          class="flex flex-row items-center justify-between border-b py-3 px-4 sm:py-4 sm:px-6 shrink-0"
        >
          <CardTitle class="text-heading">배송지 수정</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            @click="closeEditModal"
            class="h-8 w-8 rounded-full shrink-0"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent class="overflow-y-auto p-4 sm:p-6 flex-1">
          <AddressForm
            :form="shippingForm.form"
            :show-save-default="true"
            :show-delivery-message="true"
            @update:form="Object.assign(shippingForm.form, $event)"
            @search-address="openAddressSearch"
          />

          <div class="flex gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 border-t">
            <Button
              variant="outline"
              class="flex-1 h-10 sm:h-11"
              @click="closeEditModal"
              :disabled="isSaving"
            >
              취소
            </Button>
            <Button
              class="flex-1 h-10 sm:h-11"
              @click="handleSaveEdit"
              :disabled="isSaving || !shippingForm.isValid.value"
            >
              {{ isSaving ? "저장 중..." : "저장" }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- 주소 검색 모달 -->
    <AddressSearchModal
      :open="isAddressSearchOpen"
      @close="isAddressSearchOpen = false"
      @select="handleAddressSelect"
    />
  </div>
</template>
