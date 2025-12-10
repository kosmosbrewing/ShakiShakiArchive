<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import {
  fetchCart,
  createOrder,
  fetchDeliveryAddresses,
  createDeliveryAddress,
} from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();

const cartItems = ref<any[]>([]);
const addressList = ref<any[]>([]);
const loading = ref(false);
const isAddressModalOpen = ref(false);

const deliveryMode = ref<string>("new");

const shippingForm = reactive({
  recipient: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  phone1: "010",
  phone2: "",
  phone3: "",
  message: "",
  customMessage: "",
  saveDefault: false,
});

const paymentMethod = ref("toss");

const totalProductPrice = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const price = Number(item.product?.price || 0);
    return sum + price * item.quantity;
  }, 0);
});

const shippingFee = computed(() => {
  return totalProductPrice.value >= 50000 ? 0 : 3000;
});

const finalPrice = computed(() => {
  return totalProductPrice.value + shippingFee.value;
});

const hasDefaultAddress = computed(() => {
  return addressList.value.some((addr) => addr.isDefault);
});

const parsePhoneToForm = (fullPhone: string) => {
  if (!fullPhone) return;
  if (fullPhone.includes("-")) {
    const parts = fullPhone.split("-");
    if (parts.length === 3) {
      shippingForm.phone1 = parts[0];
      shippingForm.phone2 = parts[1];
      shippingForm.phone3 = parts[2];
    }
  } else {
    if (fullPhone.length >= 10) {
      shippingForm.phone1 = fullPhone.substring(0, 3);
      shippingForm.phone2 = fullPhone.substring(3, 7);
      shippingForm.phone3 = fullPhone.substring(7);
    }
  }
};

const fillForm = (data: any) => {
  shippingForm.recipient = data.recipient || data.userName || "";
  shippingForm.zipCode = data.zipCode || "";
  shippingForm.address = data.address || "";
  shippingForm.detailAddress = data.detailAddress || "";
  parsePhoneToForm(data.phone || "");

  // [수정] 저장된 주소의 isDefault 값을 폼에 반영
  // (data에 isDefault 속성이 있다면 사용, 없으면 false)
  shippingForm.saveDefault = !!data.isDefault;

  const note = data.requestNote || "";
  const predefinedOptions = [
    "부재 시 문 앞에 놓아주세요",
    "배송 전 연락바랍니다",
    "경비실에 맡겨주세요",
  ];

  if (note && !predefinedOptions.includes(note)) {
    shippingForm.message = "self";
    shippingForm.customMessage = note;
  } else {
    shippingForm.message = note;
    shippingForm.customMessage = "";
  }
};

const clearForm = () => {
  shippingForm.recipient = "";
  shippingForm.zipCode = "";
  shippingForm.address = "";
  shippingForm.detailAddress = "";
  shippingForm.phone1 = "010";
  shippingForm.phone2 = "";
  shippingForm.phone3 = "";
  shippingForm.message = "";
  shippingForm.customMessage = "";
  shippingForm.saveDefault = false; // 초기화
};

watch(deliveryMode, (newMode) => {
  if (newMode === "member") {
    if (authStore.user) {
      fillForm(authStore.user);
      shippingForm.saveDefault = false; // 회원 정보 불러오기는 기본적으로 체크 해제
    }
  } else if (newMode === "new") {
    clearForm();
  } else if (newMode === "saved") {
    const defaultAddr =
      addressList.value.find((a) => a.isDefault) || addressList.value[0];
    if (defaultAddr) fillForm(defaultAddr);
  }
});

const loadData = async () => {
  loading.value = true;
  try {
    if (authStore.isAuthenticated) {
      await authStore.loadUser();
    }

    cartItems.value = await fetchCart();
    if (cartItems.value.length === 0) {
      alert("주문할 상품이 없습니다.");
      router.replace("/");
      return;
    }

    addressList.value = await fetchDeliveryAddresses();

    const defaultAddr = addressList.value.find((a) => a.isDefault);

    if (defaultAddr) {
      deliveryMode.value = "saved";
      fillForm(defaultAddr);
    } else {
      deliveryMode.value = "member";
      if (authStore.user) fillForm(authStore.user);
    }
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

const selectAddressFromModal = (addr: any) => {
  deliveryMode.value = "saved";
  fillForm(addr);
  isAddressModalOpen.value = false;
};

const openAddressSearch = () => {
  alert("주소 검색 API 연동이 필요합니다.");
  shippingForm.zipCode = "12345";
  shippingForm.address = "서울시 강남구 테헤란로 123";
};

const handlePayment = async () => {
  if (
    !shippingForm.recipient ||
    !shippingForm.phone2 ||
    !shippingForm.phone3 ||
    !shippingForm.address
  ) {
    alert("배송 정보를 모두 입력해주세요.");
    return;
  }

  const fullPhone = `${shippingForm.phone1}-${shippingForm.phone2}-${shippingForm.phone3}`;
  const fullAddress =
    `${shippingForm.address} ${shippingForm.detailAddress}`.trim();

  const finalRequestNote =
    shippingForm.message === "self"
      ? shippingForm.customMessage
      : shippingForm.message;

  if (!confirm(`${finalPrice.value.toLocaleString()}원을 결제하시겠습니까?`))
    return;

  try {
    await createOrder({
      shippingName: shippingForm.recipient,
      shippingPhone: fullPhone,
      shippingAddress: fullAddress,
      shippingPostalCode: shippingForm.zipCode,
      // requestNote: finalRequestNote
    });

    if (shippingForm.saveDefault && deliveryMode.value !== "saved") {
      try {
        await createDeliveryAddress({
          recipient: shippingForm.recipient,
          phone: fullPhone,
          zipCode: shippingForm.zipCode,
          address: shippingForm.address,
          detailAddress: shippingForm.detailAddress,
          requestNote: finalRequestNote,
          isDefault: true,
        });
      } catch (addrError) {
        console.error("배송지 저장 실패:", addrError);
      }
    }

    alert("주문이 완료되었습니다.");
    router.push("/account");
  } catch (error: any) {
    console.error(error);
    alert("주문 실패: " + error.message);
  }
};

onMounted(() => {
  loadData();
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12">
    <div class="border-b border-gray-900 pb-4 mb-8">
      <h1 class="text-2xl font-bold text-gray-900">ORDER / PAYMENT</h1>
    </div>

    <div v-if="loading" class="text-center py-20">
      <div
        class="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"
      ></div>
    </div>

    <div v-else class="space-y-12">
      <section>
        <h2 class="text-lg font-bold mb-3">배송지 정보</h2>

        <div
          class="flex flex-wrap items-center gap-6 mb-6 p-4 bg-gray-50 rounded border border-gray-200 text-sm"
        >
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              v-model="deliveryMode"
              value="saved"
              :disabled="addressList.length === 0"
              class="accent-black"
            />
            <span :class="{ 'text-gray-400': addressList.length === 0 }">
              기본/최근 배송지
            </span>
          </label>

          <label
            v-if="!hasDefaultAddress"
            class="flex items-center gap-2 cursor-pointer"
          >
            <input
              type="radio"
              v-model="deliveryMode"
              value="member"
              class="accent-black"
            />
            회원 정보와 동일
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              v-model="deliveryMode"
              value="new"
              class="accent-black"
            />
            직접 입력 (신규)
          </label>

          <button
            v-if="addressList.length > 0"
            @click="isAddressModalOpen = true"
            class="ml-auto text-xs border border-gray-400 bg-white px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
          >
            배송지 목록 >
          </button>
        </div>

        <div class="border-t border-gray-900">
          <div
            class="grid grid-cols-[120px_1fr] border-b border-gray-200 text-sm"
          >
            <div class="bg-gray-50 p-4 flex items-center font-medium">
              받는사람 <span class="text-red-500 ml-1">*</span>
            </div>
            <div class="p-3 flex items-center gap-2">
              <input
                v-model="shippingForm.recipient"
                type="text"
                class="border border-gray-300 px-3 py-2 w-full max-w-xs focus:outline-none focus:border-black"
              />

              <span
                v-if="shippingForm.saveDefault"
                class="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold border border-blue-200"
              >
                기본 배송지
              </span>
            </div>

            <div class="bg-gray-50 p-4 flex items-center font-medium">
              주소 <span class="text-red-500 ml-1">*</span>
            </div>
            <div class="p-3 space-y-2">
              <div class="flex gap-2">
                <input
                  v-model="shippingForm.zipCode"
                  type="text"
                  class="border border-gray-300 px-3 py-2 w-24 bg-gray-50"
                  readonly
                  placeholder="우편번호"
                />
                <button
                  @click="openAddressSearch"
                  class="border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50 text-xs font-medium"
                >
                  주소검색
                </button>
              </div>
              <input
                v-model="shippingForm.address"
                type="text"
                class="border border-gray-300 px-3 py-2 w-full"
                readonly
                placeholder="기본 주소"
              />
              <input
                v-model="shippingForm.detailAddress"
                type="text"
                class="border border-gray-300 px-3 py-2 w-full focus:outline-none focus:border-black"
                placeholder="상세 주소를 입력하세요"
              />
            </div>

            <div class="bg-gray-50 p-4 flex items-center font-medium">
              휴대전화 <span class="text-red-500 ml-1">*</span>
            </div>
            <div class="p-3">
              <div class="flex items-center gap-2 max-w-sm">
                <select
                  v-model="shippingForm.phone1"
                  class="border border-gray-300 px-2 py-2 w-24 outline-none"
                >
                  <option>010</option>
                  <option>011</option>
                  <option>016</option>
                </select>
                <span>-</span>
                <input
                  v-model="shippingForm.phone2"
                  type="text"
                  maxlength="4"
                  class="border border-gray-300 px-3 py-2 w-full outline-none text-center"
                />
                <span>-</span>
                <input
                  v-model="shippingForm.phone3"
                  type="text"
                  maxlength="4"
                  class="border border-gray-300 px-3 py-2 w-full outline-none text-center"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <select
            v-model="shippingForm.message"
            class="w-full border border-gray-300 p-3 text-sm outline-none focus:border-black"
          >
            <option value="">-- 배송 메시지 선택 (선택사항) --</option>
            <option value="부재 시 문 앞에 놓아주세요">
              부재 시 문 앞에 놓아주세요
            </option>
            <option value="배송 전 연락바랍니다">배송 전 연락바랍니다</option>
            <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
            <option value="self">직접 입력</option>
          </select>

          <input
            v-if="shippingForm.message === 'self'"
            v-model="shippingForm.customMessage"
            type="text"
            placeholder="배송 기사님께 전달할 메시지를 입력해주세요."
            class="w-full border border-gray-300 p-3 text-sm outline-none focus:border-black"
            maxlength="50"
          />
        </div>

        <div class="mt-3" v-if="deliveryMode !== 'saved'">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              v-model="shippingForm.saveDefault"
              class="accent-black h-4 w-4"
            />
            <span class="text-gray-600">이 배송지를 기본 배송지로 저장</span>
          </label>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-bold mb-3">주문상품</h2>
        <div class="border-t border-gray-900">
          <div
            v-for="item in cartItems"
            :key="item.id"
            class="flex gap-4 p-4 border-b border-gray-200 items-center"
          >
            <div class="w-20 h-24 bg-gray-100 flex-shrink-0">
              <img
                :src="item.product?.imageUrl"
                class="w-full h-full object-cover"
              />
            </div>
            <div class="flex-1">
              <div class="text-sm font-bold text-gray-900">
                {{ item.product?.name }}
              </div>
              <div class="text-xs text-gray-500 mt-1">
                [옵션: {{ item.variant?.size }}
                <span v-if="item.variant?.color"
                  >/ {{ item.variant?.color }}</span
                >]
              </div>
              <div class="text-sm text-gray-600 mt-2">
                수량: {{ item.quantity }}개
              </div>
              <div class="font-bold mt-1">
                {{
                  (
                    Number(item.product?.price) * item.quantity
                  ).toLocaleString()
                }}원
              </div>
            </div>
          </div>
        </div>
        <div class="bg-gray-50 p-3 text-right text-sm border-b border-gray-200">
          배송비:
          <span class="font-bold">{{ shippingFee.toLocaleString() }}원</span>
          (5만원 이상 무료)
        </div>
      </section>

      <section>
        <h2 class="text-lg font-bold mb-3">결제정보</h2>
        <div class="border-t border-gray-900 text-sm">
          <div class="flex justify-between p-4 bg-gray-50 items-center">
            <span class="font-bold">최종 결제 금액</span>
            <span class="text-2xl font-bold text-black"
              >{{ finalPrice.toLocaleString() }}원</span
            >
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-bold mb-3">결제수단 선택</h2>
        <div class="border-t border-gray-900 p-6 border-b border-gray-200">
          <div class="grid grid-cols-4 gap-2 mb-6">
            <button
              v-for="method in ['토스', '신용카드', '계좌이체', '카카오페이']"
              :key="method"
              @click="paymentMethod = method"
              :class="[
                'py-4 border text-sm font-bold transition-all',
                paymentMethod === method
                  ? 'border-black bg-black text-white'
                  : 'border-gray-300 bg-white text-gray-500 hover:border-gray-400',
              ]"
            >
              {{ method }}
            </button>
          </div>
        </div>
      </section>

      <div class="pt-4 pb-12">
        <button
          @click="handlePayment"
          class="w-full bg-black text-white py-5 text-xl font-bold hover:bg-gray-800 transition-colors"
        >
          {{ finalPrice.toLocaleString() }}원 결제하기
        </button>
      </div>
    </div>

    <div
      v-if="isAddressModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div
        class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div class="p-5 border-b flex justify-between items-center bg-gray-50">
          <h3 class="font-bold text-lg">배송지 목록</h3>
          <button
            @click="isAddressModalOpen = false"
            class="text-gray-500 hover:text-black"
          >
            ✕
          </button>
        </div>
        <div class="overflow-y-auto p-5 space-y-4">
          <div
            v-for="addr in addressList"
            :key="addr.id"
            class="border rounded p-4 hover:border-black cursor-pointer transition-colors relative"
            @click="selectAddressFromModal(addr)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="font-bold">{{ addr.recipient }}</span>
              <span
                v-if="addr.isDefault"
                class="bg-black text-white text-[10px] px-1.5 py-0.5 rounded"
                >기본</span
              >
            </div>
            <p class="text-sm text-gray-600 mb-1">{{ addr.phone }}</p>
            <p class="text-sm text-gray-800">
              ({{ addr.zipCode }}) {{ addr.address }} {{ addr.detailAddress }}
            </p>
            <p v-if="addr.requestNote" class="text-xs text-blue-600 mt-1">
              "{{ addr.requestNote }}"
            </p>
            <button
              class="absolute top-4 right-4 text-xs border px-2 py-1 rounded hover:bg-gray-100"
            >
              선택
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
