<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { fetchCart, createOrder } from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();

// --- 상태 관리 ---
const cartItems = ref<any[]>([]);
const loading = ref(false);
const isSameAsMember = ref(true); // '회원 정보와 동일' 체크 여부

// 배송 정보 폼
const shippingForm = reactive({
  recipient: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  phone1: "010",
  phone2: "",
  phone3: "",
  emailId: "",
  emailDomain: "naver.com",
  message: "",
  saveDefault: false,
});

// 결제 수단 선택
const paymentMethod = ref("toss"); // 기본값: 토스

// --- Computed ---
// 총 상품 금액
const totalProductPrice = computed(() => {
  return cartItems.value.reduce((sum, item) => {
    const price = Number(item.product?.price || 0);
    return sum + price * item.quantity;
  }, 0);
});

// 배송비 (임시: 5만원 이상 무료)
const shippingFee = computed(() => {
  return totalProductPrice.value >= 50000 ? 0 : 3000;
});

// 최종 결제 금액
const finalPrice = computed(() => {
  return totalProductPrice.value + shippingFee.value;
});

// --- 메서드 ---

// 1. 데이터 로드
const loadData = async () => {
  loading.value = true;
  try {
    // 유저 정보 확인
    if (!authStore.user) await authStore.loadUser();

    // 장바구니 조회
    const data = await fetchCart();
    cartItems.value = data;

    // 장바구니 비었으면 튕겨내기
    if (cartItems.value.length === 0) {
      alert("주문할 상품이 없습니다.");
      router.replace("/");
    }

    // 초기 '회원 정보와 동일' 적용
    if (isSameAsMember.value) applyMemberInfo();
  } catch (error) {
    console.error(error);
  } finally {
    loading.value = false;
  }
};

// 2. 회원 정보 적용
const applyMemberInfo = () => {
  if (authStore.user) {
    shippingForm.recipient = `${authStore.user.lastName}${authStore.user.firstName}`;
    // 이메일 파싱 (예: user@example.com)
    const emailParts = authStore.user.email.split("@");
    if (emailParts.length === 2) {
      shippingForm.emailId = emailParts[0];
      shippingForm.emailDomain = emailParts[1];
    }
    // 전화번호나 주소는 user 테이블 스키마에 따라 없을 수도 있음 (있다면 연동)
  }
};

// '회원 정보와 동일' 라디오 버튼 감지
watch(isSameAsMember, (newVal) => {
  if (newVal) {
    applyMemberInfo();
  } else {
    // 새로 입력 모드일 때 초기화 (원하면 주석 처리)
    shippingForm.recipient = "";
    shippingForm.phone2 = "";
    shippingForm.phone3 = "";
    shippingForm.address = "";
    shippingForm.detailAddress = "";
    shippingForm.zipCode = "";
  }
});

// 3. 주소 검색 (Daum 주소 API 연동 시뮬레이션)
const openAddressSearch = () => {
  // 실제 구현 시: new daum.Postcode({...}).open();
  alert("주소 검색 창이 열립니다. (실제 구현 시 Daum 우편번호 API 연동 필요)");
  // 테스트용 더미 데이터
  shippingForm.zipCode = "48411";
  shippingForm.address = "부산 남구 전포대로 84-1";
};

// 4. 결제 요청 (주문 생성)
const handlePayment = async () => {
  // 유효성 검사
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

  if (!confirm(`${finalPrice.value.toLocaleString()}원을 결제하시겠습니까?`))
    return;

  try {
    // 백엔드 API 호출 (주문 생성)
    // 참고: 백엔드 명세에 결제 로직이 없다면, 주문 생성 후 '입금 대기' 상태가 됨
    await createOrder({
      shippingName: shippingForm.recipient,
      shippingPhone: fullPhone,
      shippingAddress: fullAddress,
      shippingPostalCode: shippingForm.zipCode,
    });

    alert("주문이 완료되었습니다.");
    router.push("/account"); // 주문 내역으로 이동
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

    <div v-if="loading" class="text-center py-20">로딩 중...</div>

    <div v-else class="space-y-12">
      <section>
        <h2 class="text-lg font-bold mb-3">배송지</h2>

        <div class="flex border border-gray-300 mb-4 text-center text-sm">
          <div
            class="flex-1 py-3 bg-white font-bold border-b-2 border-black cursor-pointer"
          >
            직접입력
          </div>
          <div
            class="flex-1 py-3 bg-gray-50 text-gray-500 border-b border-gray-300 cursor-pointer"
          >
            최근 배송지
          </div>
        </div>

        <div class="flex gap-6 mb-4 text-sm">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              v-model="isSameAsMember"
              :value="true"
              class="accent-black"
            />
            회원 정보와 동일
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              v-model="isSameAsMember"
              :value="false"
              class="accent-black"
            />
            새로운 배송지
          </label>
        </div>

        <div class="border-t border-gray-900">
          <div
            class="grid grid-cols-[120px_1fr] border-b border-gray-200 text-sm"
          >
            <div class="bg-gray-50 p-4 flex items-center font-medium">
              받는사람 <span class="text-blue-600 ml-1">*</span>
            </div>
            <div class="p-3">
              <input
                v-model="shippingForm.recipient"
                type="text"
                class="border border-gray-300 px-3 py-2 w-full max-w-xs focus:outline-none focus:border-black"
              />
            </div>

            <div class="bg-gray-50 p-4 flex items-center font-medium">
              주소 <span class="text-blue-600 ml-1">*</span>
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
                  class="border border-gray-300 px-4 py-2 bg-white hover:bg-gray-50 text-xs"
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
                class="border border-gray-300 px-3 py-2 w-full"
                placeholder="나머지 주소(선택 입력 가능)"
              />
            </div>

            <div class="bg-gray-50 p-4 flex items-center font-medium">
              휴대전화 <span class="text-blue-600 ml-1">*</span>
            </div>
            <div class="p-3">
              <div class="flex items-center gap-2 max-w-sm">
                <select
                  v-model="shippingForm.phone1"
                  class="border border-gray-300 px-2 py-2 w-full outline-none"
                >
                  <option>010</option>
                  <option>011</option>
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

            <div class="bg-gray-50 p-4 flex items-center font-medium">
              이메일 <span class="text-blue-600 ml-1">*</span>
            </div>
            <div class="p-3">
              <div class="flex items-center gap-2 max-w-md">
                <input
                  v-model="shippingForm.emailId"
                  type="text"
                  class="border border-gray-300 px-3 py-2 w-full outline-none"
                />
                <span>@</span>
                <select
                  v-model="shippingForm.emailDomain"
                  class="border border-gray-300 px-2 py-2 w-full outline-none"
                >
                  <option value="naver.com">naver.com</option>
                  <option value="gmail.com">gmail.com</option>
                  <option value="daum.net">daum.net</option>
                  <option value="self">직접입력</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-2">
          <select
            v-model="shippingForm.message"
            class="w-full border border-gray-300 p-3 text-sm outline-none"
          >
            <option value="">-- 메시지 선택 (선택사항) --</option>
            <option value="부재 시 문 앞에 놓아주세요">
              부재 시 문 앞에 놓아주세요
            </option>
            <option value="배송 전 미리 연락주세요">
              배송 전 미리 연락주세요
            </option>
            <option value="경비실에 맡겨주세요">경비실에 맡겨주세요</option>
          </select>
        </div>

        <div class="mt-3">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              v-model="shippingForm.saveDefault"
              class="accent-black"
            />
            <span class="text-gray-600">기본 배송지로 저장</span>
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
            <button class="text-gray-400 hover:text-black">✕</button>
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
          <div class="flex justify-between p-3 border-b border-gray-100">
            <span class="text-gray-600">주문상품</span>
            <span class="font-bold"
              >{{ totalProductPrice.toLocaleString() }}원</span
            >
          </div>
          <div class="flex justify-between p-3 border-b border-gray-100">
            <span class="text-gray-600">배송비</span>
            <span class="font-bold">+{{ shippingFee.toLocaleString() }}원</span>
          </div>
          <div class="flex justify-between p-3 border-b border-gray-100">
            <span class="text-gray-600">할인/부가결제</span>
            <span class="font-bold">-0원</span>
          </div>
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

          <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-4 rounded">
            <p v-if="paymentMethod === '토스'">
              - 토스는 간편하게 지문 또는 비밀번호만으로 결제할 수 있는 빠르고
              편리한 간편 결제 서비스입니다.
            </p>
            <p v-if="paymentMethod === '신용카드'">
              - 카드사별 무이자 할부 혜택을 확인해주세요.
            </p>
            <p>
              - 결제 후 취소/반품 등이 발생할 경우 해당 결제 수단으로 환불이
              이루어집니다.
            </p>
          </div>
        </div>

        <div class="mt-4">
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" class="accent-black" />
            <span class="text-gray-600"
              >결제수단과 입력정보를 다음에도 사용</span
            >
          </label>
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
  </div>
</template>
