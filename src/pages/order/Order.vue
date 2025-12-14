<script setup lang="ts">
// src/pages/Order.vue
// 주문/결제 페이지

import { ref, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useCart } from "@/composables/useCart";
import { useAddresses, useShippingForm } from "@/composables/useAddresses";
import { useCreateOrder } from "@/composables/useOrders";
import { formatPrice } from "@/lib/formatters";
import { createDeliveryAddress } from "@/lib/api";

// 공통 컴포넌트
import { LoadingSpinner, AddressCard, AddressForm } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import type { DeliveryAddress, User } from "@/types/api";

const router = useRouter();
const authStore = useAuthStore();

// Composables
const { cartItems, shippingFee, totalAmount, loadCart } = useCart();
const { addresses, hasDefaultAddress, loadAddresses } = useAddresses();
const shippingForm = useShippingForm();
const { submitOrder } = useCreateOrder();

// 상태
const loading = ref(false);
const isAddressModalOpen = ref(false);
const deliveryMode = ref<"new" | "member" | "saved">("new");
const paymentMethod = ref("toss");

// 결제 수단 옵션
const paymentMethods = ["토스", "신용카드", "계좌이체", "카카오페이"];

// 배송지 모드 변경 감시
watch(deliveryMode, (newMode) => {
  if (newMode === "member" && authStore.user) {
    shippingForm.fillFromUser(authStore.user as User);
    shippingForm.form.saveDefault = false;
  } else if (newMode === "new") {
    shippingForm.clearForm();
  } else if (newMode === "saved") {
    const defaultAddr = addresses.value.find((a) => a.isDefault) || addresses.value[0];
    if (defaultAddr) shippingForm.fillFromAddress(defaultAddr);
  }
});

// 데이터 로드
const loadData = async () => {
  loading.value = true;
  try {
    // 사용자 정보 로드
    if (authStore.isAuthenticated && !authStore.user) {
      await authStore.loadUser();
    }

    // 장바구니 로드
    await loadCart();
    if (cartItems.value.length === 0) {
      alert("주문할 상품이 없습니다.");
      router.replace("/");
      return;
    }

    // 배송지 목록 로드
    await loadAddresses();

    // 초기 배송지 모드 설정
    const defaultAddr = addresses.value.find((a) => a.isDefault);
    if (defaultAddr) {
      deliveryMode.value = "saved";
      shippingForm.fillFromAddress(defaultAddr);
    } else if (authStore.user) {
      deliveryMode.value = "member";
      shippingForm.fillFromUser(authStore.user as User);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 배송지 선택 (모달에서)
const selectAddressFromModal = (addr: DeliveryAddress) => {
  deliveryMode.value = "saved";
  shippingForm.fillFromAddress(addr);
  isAddressModalOpen.value = false;
};

// 주소 검색 (API 연동 필요)
const openAddressSearch = () => {
  alert("주소 검색 API 연동이 필요합니다.");
  shippingForm.form.zipCode = "12345";
  shippingForm.form.address = "서울시 강남구 테헤란로 123";
};

// 결제 처리
const handlePayment = async () => {
  // 유효성 검사
  if (!shippingForm.isValid.value) {
    alert("배송 정보를 모두 입력해주세요.");
    return;
  }

  if (!confirm(`${formatPrice(totalAmount.value)}을 결제하시겠습니까?`)) return;

  try {
    // 주문 생성
    const success = await submitOrder({
      shippingName: shippingForm.form.recipient,
      shippingPhone: shippingForm.fullPhone.value,
      shippingAddress: shippingForm.fullAddress.value,
      shippingPostalCode: shippingForm.form.zipCode,
    });

    if (!success) {
      alert("주문 실패");
      return;
    }

    // 기본 배송지 저장 (새 주소이고 체크된 경우)
    if (shippingForm.form.saveDefault && deliveryMode.value !== "saved") {
      try {
        await createDeliveryAddress({
          recipient: shippingForm.form.recipient,
          phone: shippingForm.fullPhone.value,
          zipCode: shippingForm.form.zipCode,
          address: shippingForm.form.address,
          detailAddress: shippingForm.form.detailAddress,
          requestNote: shippingForm.finalRequestNote.value,
          isDefault: true,
        });
      } catch (addrError) {
        console.error("배송지 저장 실패:", addrError);
      }
    }

    alert("주문이 완료되었습니다.");
    router.push("/account");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "주문 실패";
    alert("주문 실패: " + errorMessage);
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 타이틀 -->
    <div class="mb-8">
      <h1 class="text-sm font-bold uppercase tracking-widest text-foreground">
        Order / Payment
      </h1>
    </div>

    <!-- 로딩 스피너 -->
    <LoadingSpinner v-if="loading" />

    <div v-else class="space-y-8">
      <!-- 배송지 정보 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">배송지 정보</CardTitle>
        </CardHeader>
        <CardContent class="space-y-6">
          <!-- 배송지 선택 라디오 -->
          <div class="flex flex-wrap items-center gap-6 p-4 bg-muted/50 rounded-lg text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="deliveryMode"
                value="saved"
                :disabled="addresses.length === 0"
                class="accent-primary"
              />
              <span :class="{ 'text-muted-foreground': addresses.length === 0 }">
                기본/최근 배송지
              </span>
            </label>

            <label v-if="!hasDefaultAddress" class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="deliveryMode"
                value="member"
                class="accent-primary"
              />
              회원 정보와 동일
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                v-model="deliveryMode"
                value="new"
                class="accent-primary"
              />
              직접 입력 (신규)
            </label>

            <Button
              v-if="addresses.length > 0"
              variant="outline"
              size="sm"
              @click="isAddressModalOpen = true"
              class="ml-auto"
            >
              배송지 목록
            </Button>
          </div>

          <!-- 배송지 입력 폼 -->
          <AddressForm
            :form="shippingForm.form"
            :show-save-default="deliveryMode !== 'saved'"
            @update:form="Object.assign(shippingForm.form, $event)"
            @search-address="openAddressSearch"
          />
        </CardContent>
      </Card>

      <!-- 주문 상품 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">주문상품</CardTitle>
        </CardHeader>
        <CardContent class="p-0">
          <div class="divide-y divide-border">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="flex gap-4 p-4 items-center"
            >
              <div class="w-20 h-24 bg-muted flex-shrink-0 rounded overflow-hidden">
                <img
                  :src="item.product?.imageUrl"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="flex-1">
                <div class="text-sm font-bold text-foreground">
                  {{ item.product?.name }}
                </div>
                <div class="text-xs text-muted-foreground mt-1">
                  [옵션: {{ item.variant?.size }}
                  <span v-if="item.variant?.color">/ {{ item.variant?.color }}</span>]
                </div>
                <div class="text-sm text-muted-foreground mt-2">
                  수량: {{ item.quantity }}개
                </div>
                <div class="font-bold text-foreground mt-1">
                  {{ formatPrice(Number(item.product?.price) * item.quantity) }}
                </div>
              </div>
            </div>
          </div>
          <div class="bg-muted/50 p-3 text-right text-sm border-t border-border">
            배송비:
            <span class="font-bold text-foreground">{{ formatPrice(shippingFee) }}</span>
            (5만원 이상 무료)
          </div>
        </CardContent>
      </Card>

      <!-- 결제 정보 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">결제정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <span class="font-bold text-foreground">최종 결제 금액</span>
            <span class="text-2xl font-bold text-foreground">
              {{ formatPrice(totalAmount) }}
            </span>
          </div>
        </CardContent>
      </Card>

      <!-- 결제 수단 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-lg">결제수단 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="grid grid-cols-4 gap-2">
            <Button
              v-for="method in paymentMethods"
              :key="method"
              @click="paymentMethod = method"
              :variant="paymentMethod === method ? 'default' : 'outline'"
              class="py-6"
            >
              {{ method }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <!-- 결제 버튼 -->
      <div class="pt-4 pb-8">
        <Button @click="handlePayment" class="w-full h-14 text-xl font-bold" size="lg">
          {{ formatPrice(totalAmount) }} 결제하기
        </Button>
      </div>
    </div>

    <!-- 배송지 선택 모달 -->
    <div
      v-if="isAddressModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <Card class="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader class="flex flex-row items-center justify-between bg-muted/50">
          <CardTitle class="text-lg">배송지 목록</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            @click="isAddressModalOpen = false"
            class="h-auto p-1"
          >
            ✕
          </Button>
        </CardHeader>
        <CardContent class="overflow-y-auto p-4 space-y-4">
          <AddressCard
            v-for="addr in addresses"
            :key="addr.id"
            :address="addr"
            :show-actions="false"
            :selectable="true"
            @select="selectAddressFromModal"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
