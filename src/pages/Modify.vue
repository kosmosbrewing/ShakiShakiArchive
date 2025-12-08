<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { updateMyInfo, changeMyPassword, withdrawUser } from "@/lib/api";

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

const form = reactive({
  email: "",
  userName: "",
  phone: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  emailOptIn: false,
  password: "", // 입력받은 비밀번호
  confirmPassword: "",
});

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.replace("/login");
    return;
  }
  if (!authStore.user) await authStore.loadUser();

  if (authStore.user) {
    const user = authStore.user as any;
    form.email = user.email || "";
    form.userName = user.userName || "";
    form.phone = user.phone || "";
    form.zipCode = user.zipCode || "";
    form.address = user.address || "";
    form.detailAddress = user.detailAddress || "";
    form.emailOptIn = user.emailOptIn || false;
  }
});

const openAddressSearch = () => {
  alert("주소 검색 (API 연동 필요)");
  form.zipCode = "12345";
  form.address = "서울시 강남구 테헤란로 123";
};

const handleUpdateProfile = async () => {
  if (!form.userName) return alert("이름을 입력해주세요.");
  if (!form.password)
    return alert("정보를 수정하려면 비밀번호를 입력해주세요.");

  if (form.password !== form.confirmPassword) {
    return alert("비밀번호가 일치하지 않습니다.");
  }

  try {
    isLoading.value = true;

    // 1. 비밀번호 검증 및 변경 (가장 먼저 수행하여 본인 확인)
    // 현재 구조상 입력한 비밀번호를 '현재 비밀번호'이자 '새 비밀번호'로 사용합니다.
    // 즉, 비밀번호를 바꾸지 않더라도 검증 과정을 통과해야 정보가 수정됩니다.
    await changeMyPassword({
      currentPassword: form.password,
      newPassword: form.password,
    });

    // 2. 기본 정보 수정
    await updateMyInfo({
      userName: form.userName,
      phone: form.phone,
      zipCode: form.zipCode,
      address: form.address,
      detailAddress: form.detailAddress,
      emailOptIn: form.emailOptIn,
    });

    await authStore.loadUser();
    alert("회원 정보가 수정되었습니다.");

    // 비밀번호 필드 초기화
    form.password = "";
    form.confirmPassword = "";
  } catch (error: any) {
    // 백엔드에서 401(비밀번호 불일치) 등을 리턴하면 여기서 잡힘
    const msg = error.message || "정보 수정 실패";
    if (msg.includes("401") || msg.includes("비밀번호")) {
      alert("비밀번호가 올바르지 않습니다.");
    } else {
      alert("오류 발생: " + msg);
    }
  } finally {
    isLoading.value = false;
  }
};

const handleWithdraw = async () => {
  if (prompt("탈퇴하려면 '탈퇴'를 입력하세요.") === "탈퇴") {
    try {
      await withdrawUser();
      await authStore.handleLogout();
      alert("탈퇴되었습니다.");
      router.push("/");
    } catch (e: any) {
      alert(e.message);
    }
  }
};
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-16">
    <h1
      class="text-3xl font-bold text-gray-900 mb-8 border-b border-black pb-4"
    >
      정보 수정
    </h1>

    <form @submit.prevent="handleUpdateProfile" class="space-y-8">
      <section>
        <h2 class="text-lg font-bold mb-6 text-gray-800">기본 정보</h2>
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >이메일</label
            >
            <input
              v-model="form.email"
              type="email"
              disabled
              class="w-full px-3 py-3 border bg-gray-100 rounded text-gray-500"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >이름</label
            >
            <input
              v-model="form.userName"
              type="text"
              class="w-full px-3 py-3 border rounded focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >휴대전화</label
            >
            <input
              v-model="form.phone"
              type="tel"
              class="w-full px-3 py-3 border rounded focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >주소</label
            >
            <div class="space-y-2">
              <div class="flex gap-2">
                <input
                  v-model="form.zipCode"
                  type="text"
                  readonly
                  placeholder="우편번호"
                  class="w-32 px-3 py-3 border rounded bg-gray-50"
                />
                <button
                  type="button"
                  @click="openAddressSearch"
                  class="px-4 py-3 border rounded hover:bg-gray-50 text-sm"
                >
                  주소검색
                </button>
              </div>
              <input
                v-model="form.address"
                type="text"
                readonly
                placeholder="기본 주소"
                class="w-full px-3 py-3 border rounded bg-gray-50"
              />
              <input
                v-model="form.detailAddress"
                type="text"
                placeholder="상세 주소 입력"
                class="w-full px-3 py-3 border rounded focus:ring-1 focus:ring-black"
              />
            </div>
          </div>
          <div class="flex items-center">
            <input
              id="opt-in"
              v-model="form.emailOptIn"
              type="checkbox"
              class="accent-black h-4 w-4"
            />
            <label for="opt-in" class="ml-2 text-sm text-gray-900"
              >이메일 수신 동의</label
            >
          </div>
        </div>
      </section>

      <hr class="border-gray-200" />

      <section>
        <h2 class="text-lg font-bold mb-6 text-gray-800">
          비밀번호 확인
          <span class="text-red-500 text-sm font-normal"
            >* 정보 수정을 위해 필수입니다.</span
          >
        </h2>
        <div class="space-y-5 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >비밀번호</label
            >
            <input
              v-model="form.password"
              type="password"
              placeholder="비밀번호 입력"
              class="w-full px-3 py-3 border rounded bg-white focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >비밀번호 확인</label
            >
            <input
              v-model="form.confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              class="w-full px-3 py-3 border rounded bg-white focus:ring-1 focus:ring-black"
            />
          </div>
        </div>
      </section>

      <div class="pt-4 text-right">
        <button
          type="submit"
          :disabled="isLoading"
          class="bg-black text-white px-10 py-4 rounded font-bold hover:bg-gray-800 transition-colors text-lg"
        >
          {{ isLoading ? "처리중..." : "정보 수정 완료" }}
        </button>
      </div>
    </form>

    <div class="mt-16 pt-8 border-t border-gray-200 flex justify-end">
      <button
        @click="handleWithdraw"
        class="text-xs text-gray-400 underline hover:text-red-600"
      >
        회원 탈퇴하기
      </button>
    </div>
  </div>
</template>
