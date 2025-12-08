<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchCart, updateCartItem, deleteCartItem } from "@/lib/api"; // [수정] createOrder 제거 (Order.vue에서 수행함)

const router = useRouter();
const authStore = useAuthStore();

// 상태 관리
const cartItems = ref<any[]>([]);
const loading = ref(false);

// [삭제됨] 배송 정보 폼 및 모달 상태 제거 (Order.vue로 이관됨)

// 계산된 속성 (총 결제 금액)
const totalAmount = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const price = Number(item.product?.price || 0);
    return sum + price * item.quantity;
  }, 0);
});

// 장바구니 데이터 로드
const loadCart = async () => {
  loading.value = true;
  try {
    const data = await fetchCart();
    cartItems.value = data;
  } catch (error) {
    console.error("장바구니 로드 실패:", error);
  } finally {
    loading.value = false;
  }
};

// 수량 변경 핸들러
const handleQuantityChange = async (item: any, change: number) => {
  const newQuantity = item.quantity + change;
  if (newQuantity < 1) return;

  try {
    item.quantity = newQuantity;
    await updateCartItem(item.id, newQuantity);
  } catch (error) {
    console.error("수량 변경 실패:", error);
    loadCart();
  }
};

// 삭제 핸들러
const handleRemoveItem = async (itemId: number | string) => {
  if (!confirm("장바구니에서 삭제하시겠습니까?")) return;

  try {
    await deleteCartItem(itemId);
    cartItems.value = cartItems.value.filter((item) => item.id !== itemId);
  } catch (error) {
    console.error("삭제 실패:", error);
  }
};

// [수정] 주문하기 버튼 클릭 시 Order 페이지로 이동
const goToOrder = () => {
  if (cartItems.value.length === 0) {
    alert("장바구니가 비어있습니다.");
    return;
  }
  // 주문 페이지로 이동
  router.push("/order");
};

onMounted(() => {
  if (!authStore.isAuthenticated) {
    alert("로그인이 필요합니다.");
    router.replace("/login");
    return;
  }
  loadCart();
});
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-12">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

    <div v-if="loading" class="flex justify-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"
      ></div>
    </div>

    <div
      v-else-if="cartItems.length === 0"
      class="text-center py-20 bg-gray-50 rounded-lg"
    >
      <p class="text-gray-500 mb-6">장바구니에 담긴 상품이 없습니다.</p>
      <router-link
        to="/product/all"
        class="text-black underline font-medium hover:text-gray-600"
      >
        쇼핑하러 가기
      </router-link>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-12">
      <div class="lg:col-span-2 space-y-6">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="flex gap-6 p-4 bg-white border rounded-lg shadow-sm"
        >
          <div
            class="w-24 h-24 bg-gray-100 rounded-md overflow-hidden flex-shrink-0 cursor-pointer"
            @click="router.push(`/product/${item.productId}`)"
          >
            <img
              v-if="item.product?.imageUrl"
              :src="item.product.imageUrl"
              class="w-full h-full object-cover"
              alt="Product"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400 text-xs"
            >
              No Img
            </div>
          </div>

          <div class="flex-1 flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-start">
                <h3
                  class="font-bold text-gray-900 cursor-pointer hover:underline"
                  @click="router.push(`/product/${item.productId}`)"
                >
                  {{ item.product?.name }}
                </h3>
                <button
                  @click="handleRemoveItem(item.id)"
                  class="text-gray-400 hover:text-red-500 text-sm"
                >
                  삭제
                </button>
              </div>

              <p v-if="item.variant" class="text-sm text-gray-500 mt-1">
                옵션: {{ item.variant.size }}
                <span v-if="item.variant.color"
                  >/ {{ item.variant.color }}</span
                >
              </p>
            </div>

            <div class="flex justify-between items-end">
              <div
                class="flex items-center border border-gray-300 rounded w-24 h-8"
              >
                <button
                  @click="handleQuantityChange(item, -1)"
                  class="w-8 h-full flex items-center justify-center hover:bg-gray-100"
                >
                  -
                </button>
                <span class="flex-1 text-center text-sm font-medium">{{
                  item.quantity
                }}</span>
                <button
                  @click="handleQuantityChange(item, 1)"
                  class="w-8 h-full flex items-center justify-center hover:bg-gray-100"
                >
                  +
                </button>
              </div>

              <div class="font-bold text-gray-900">
                {{
                  (
                    Number(item.product?.price) * item.quantity
                  ).toLocaleString()
                }}원
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-1">
        <div class="bg-gray-50 p-6 rounded-lg sticky top-24">
          <h2 class="text-lg font-bold mb-4">Order Summary</h2>

          <div class="flex justify-between mb-2 text-sm">
            <span class="text-gray-600">상품 금액</span>
            <span>{{ totalAmount.toLocaleString() }}원</span>
          </div>
          <div class="flex justify-between mb-4 text-sm">
            <span class="text-gray-600">배송비</span>
            <span>0원 (무료배송)</span>
          </div>

          <hr class="border-gray-200 mb-4" />

          <div class="flex justify-between mb-6 text-lg font-bold">
            <span>총 결제 금액</span>
            <span>{{ totalAmount.toLocaleString() }}원</span>
          </div>

          <button
            @click="goToOrder"
            class="w-full bg-black text-white py-3 rounded-md font-bold hover:bg-gray-800 transition-colors"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
