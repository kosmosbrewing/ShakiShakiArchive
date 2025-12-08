<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();

// 1. 회원가입 폼 데이터 (백엔드 스키마 반영)
const formData = reactive({
  email: "",
  password: "",
  confirmPassword: "",
  userName: "", // [변경] 이름 통합
  phone: "",
  zipCode: "", // [추가] 우편번호
  address: "", // [추가] 기본주소
  detailAddress: "", // [추가] 상세주소
  emailOptIn: false, // [추가] 이메일 수신 동의
});

// 2. 이메일 인증 상태 (시뮬레이션)
const verificationState = reactive({
  isSent: false,
  isVerified: false,
  code: "",
  isLoading: false,
  serverCode: "123456",
});

// 3. UI 상태
const isSubmitting = ref(false);
const errorMessage = ref("");

// [인증번호 발송]
const sendVerificationCode = async () => {
  if (!formData.email || !formData.email.includes("@")) {
    alert("유효한 이메일을 입력해주세요.");
    return;
  }
  verificationState.isLoading = true;
  // 백엔드 API 호출 시뮬레이션
  setTimeout(() => {
    verificationState.isLoading = false;
    verificationState.isSent = true;
    alert(`[개발용] 인증번호: ${verificationState.serverCode}`);
  }, 1000);
};

// [인증번호 확인]
const verifyCode = () => {
  if (verificationState.code === verificationState.serverCode) {
    verificationState.isVerified = true;
    errorMessage.value = "";
  } else {
    alert("인증번호가 일치하지 않습니다.");
  }
};

// [주소 검색 시뮬레이션]
const openAddressSearch = () => {
  alert("주소 검색 창이 열립니다. (실제 구현 시 Daum 우편번호 API 연동)");
  // 테스트 데이터 입력
  formData.zipCode = "12345";
  formData.address = "서울시 강남구 테헤란로 123";
};

// [회원가입 요청]
const handleSignup = async () => {
  errorMessage.value = "";

  // 유효성 검사
  if (!verificationState.isVerified) {
    errorMessage.value = "이메일 인증을 완료해주세요.";
    return;
  }
  if (!formData.userName) {
    errorMessage.value = "이름을 입력해주세요.";
    return;
  }
  if (!formData.phone) {
    errorMessage.value = "휴대전화 번호를 입력해주세요.";
    return;
  }
  if (formData.password.length < 8) {
    // 백엔드 제약조건(min 8) 반영
    errorMessage.value = "비밀번호는 최소 8자 이상이어야 합니다.";
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    errorMessage.value = "비밀번호가 일치하지 않습니다.";
    return;
  }

  try {
    isSubmitting.value = true;

    // Pinia Store 호출
    await authStore.register({
      email: formData.email,
      password: formData.password,
      userName: formData.userName, // [변경] 통합된 이름
      phone: formData.phone,
      zipCode: formData.zipCode,
      address: formData.address,
      detailAddress: formData.detailAddress,
      emailOptIn: formData.emailOptIn,
    });

    alert("회원가입이 완료되었습니다!");
    router.push("/login");
  } catch (error: any) {
    console.error(error);
    errorMessage.value = error.message || "회원가입 중 오류가 발생했습니다.";
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div
    class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8"
  >
    <div
      class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100"
    >
      <div class="text-center">
        <h2 class="mt-2 text-3xl font-extrabold text-gray-900">회원가입</h2>
        <p class="mt-2 text-sm text-gray-600">
          이미 계정이 있으신가요?
          <router-link
            to="/login"
            class="font-medium text-blue-600 hover:text-blue-500"
          >
            로그인하기
          </router-link>
        </p>
      </div>

      <div
        v-if="errorMessage"
        class="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-center text-sm"
      >
        <AlertCircle class="w-4 h-4 mr-2" />
        {{ errorMessage }}
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="handleSignup">
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >이메일 <span class="text-red-500">*</span></label
          >
          <div class="flex gap-2">
            <input
              v-model="formData.email"
              type="email"
              required
              :disabled="verificationState.isVerified"
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm disabled:bg-gray-100"
              placeholder="example@email.com"
            />
            <button
              type="button"
              @click="sendVerificationCode"
              :disabled="
                verificationState.isVerified ||
                verificationState.isLoading ||
                !formData.email
              "
              class="w-28 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800 disabled:bg-gray-400 whitespace-nowrap"
            >
              <span v-if="verificationState.isLoading"
                ><Loader2 class="animate-spin h-4 w-4"
              /></span>
              <span v-else-if="verificationState.isVerified">완료</span>
              <span v-else>인증요청</span>
            </button>
          </div>
        </div>

        <div
          v-if="verificationState.isSent && !verificationState.isVerified"
          class="animate-fade-in-down"
        >
          <div class="flex gap-2">
            <input
              v-model="verificationState.code"
              type="text"
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="인증번호 6자리"
            />
            <button
              type="button"
              @click="verifyCode"
              class="w-20 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              확인
            </button>
          </div>
          <p class="mt-1 text-xs text-blue-600">※ 테스트용 인증번호: 123456</p>
        </div>

        <div
          v-if="verificationState.isVerified"
          class="flex items-center text-sm text-green-600 bg-green-50 p-2 rounded"
        >
          <CheckCircle2 class="w-4 h-4 mr-2" />
          이메일 인증이 완료되었습니다.
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >비밀번호 <span class="text-red-500">*</span></label
            >
            <input
              v-model="formData.password"
              type="password"
              required
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="8자 이상"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >비밀번호 확인 <span class="text-red-500">*</span></label
            >
            <input
              v-model="formData.confirmPassword"
              type="password"
              required
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
              placeholder="재입력"
            />
          </div>
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >이름 <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.userName"
            type="text"
            required
            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            placeholder="실명을 입력해주세요"
          />
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1"
            >휴대전화 <span class="text-red-500">*</span></label
          >
          <input
            v-model="formData.phone"
            type="tel"
            required
            class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            placeholder="010-1234-5678"
          />
        </div>

        <div>
          <label class="block text-sm font-bold text-gray-700 mb-1">주소</label>
          <div class="space-y-2">
            <div class="flex gap-2">
              <input
                v-model="formData.zipCode"
                type="text"
                placeholder="우편번호"
                readonly
                class="block w-24 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 sm:text-sm"
              />
              <button
                type="button"
                @click="openAddressSearch"
                class="px-3 py-2 border border-gray-300 rounded-md text-xs font-medium hover:bg-gray-50"
              >
                주소검색
              </button>
            </div>
            <input
              v-model="formData.address"
              type="text"
              placeholder="기본 주소"
              readonly
              class="block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 sm:text-sm"
            />
            <input
              v-model="formData.detailAddress"
              type="text"
              placeholder="상세 주소를 입력해주세요 (선택)"
              class="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm"
            />
          </div>
        </div>

        <div class="flex items-center">
          <input
            id="email-opt-in"
            v-model="formData.emailOptIn"
            type="checkbox"
            class="h-4 w-4 text-black focus:ring-black border-gray-300 rounded accent-black"
          />
          <label for="email-opt-in" class="ml-2 block text-sm text-gray-900">
            [선택] 이벤트 및 할인 소식 이메일 수신 동의
          </label>
        </div>

        <div>
          <button
            type="submit"
            :disabled="isSubmitting || !verificationState.isVerified"
            class="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="isSubmitting" class="flex items-center">
              <Loader2 class="animate-spin -ml-1 mr-2 h-4 w-4" />
              처리 중...
            </span>
            <span v-else>회원가입 완료</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-down {
  animation: fadeInDown 0.3s ease-out;
}
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
