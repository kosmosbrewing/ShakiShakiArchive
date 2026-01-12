<script setup lang="ts">
// src/pages/Modify.vue
// 회원정보 수정 페이지

import { ref, reactive, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { updateMyInfo, changeMyPassword, withdrawUser } from "@/lib/api";
import { parsePhone } from "@/lib/formatters";

// 공통 컴포넌트
import { PhoneInput, AddressSearchModal } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

// Input refs - 기본 정보
const userNameInputRef = ref<InstanceType<typeof Input> | null>(null);
const phoneInputRef = ref<InstanceType<typeof PhoneInput> | null>(null);
const addressSearchButtonRef = ref<InstanceType<typeof Button> | null>(null);
const detailAddressInputRef = ref<InstanceType<typeof Input> | null>(null);
const currentPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const emailOptInCheckboxRef = ref<HTMLInputElement | null>(null);
const updateProfileButtonRef = ref<InstanceType<typeof Button> | null>(null);

// Input refs - 비밀번호 변경
const pwCurrentPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const newPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const confirmNewPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const changePasswordButtonRef = ref<InstanceType<typeof Button> | null>(null);

const router = useRouter();
const authStore = useAuthStore();
const { showAlert, showDestructiveConfirm, showPromptConfirm } = useAlert();
const isLoading = ref(false);
const isAddressSearchOpen = ref(false);

// 이름 필드 Enter 키 처리 (1자 이상일 때만 이동)
const handleUserNameEnter = () => {
  if (form.userName.trim().length >= 1) {
    phoneInputRef.value?.focusFirst();
  }
};

// 휴대전화 마지막 입력 후 처리 (우편번호 유무에 따라 분기)
const handlePhoneEnter = () => {
  if (form.zipCode) {
    // 우편번호가 있으면 상세주소로 이동
    detailAddressInputRef.value?.$el?.focus();
  } else {
    // 우편번호가 없으면 주소검색 버튼으로 이동
    addressSearchButtonRef.value?.$el?.focus();
  }
};

// 상세주소 필드 Enter 키 처리 (1자 이상일 때만 이동)
const handleDetailAddressEnter = () => {
  if (form.detailAddress.trim().length >= 1) {
    currentPasswordInputRef.value?.$el?.focus();
  }
};

// 비밀번호 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handlePwCurrentPasswordEnter = () => {
  if (passwordForm.currentPassword.length >= 8) {
    newPasswordInputRef.value?.$el?.focus();
  }
};

const handleNewPasswordEnter = () => {
  if (passwordForm.newPassword.length >= 8) {
    confirmNewPasswordInputRef.value?.$el?.focus();
  }
};

// 기본정보 현재 비밀번호 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handleCurrentPasswordEnter = () => {
  if (form.currentPassword.length >= 8) {
    emailOptInCheckboxRef.value?.focus();
  }
};

// 이메일 수신동의 체크박스 Enter 키 처리
const handleEmailOptInEnter = () => {
  updateProfileButtonRef.value?.$el?.focus();
};

// 새 비밀번호 확인 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handleConfirmNewPasswordEnter = () => {
  if (passwordForm.confirmNewPassword.length >= 8) {
    changePasswordButtonRef.value?.$el?.focus();
  }
};

// 폼 데이터
const form = reactive({
  email: "",
  userName: "",
  phone1: "010",
  phone2: "",
  phone3: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  emailOptIn: false,
  currentPassword: "", // 정보 수정용 현재 비밀번호
});

// 비밀번호 변경 폼
const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmNewPassword: "",
});

const isPasswordLoading = ref(false);

// 사용자 정보로 폼 초기화
const initializeForm = () => {
  if (authStore.user) {
    const user = authStore.user;
    form.email = user.email || "";
    form.userName = user.userName || "";
    form.zipCode = user.zipCode || "";
    form.address = user.address || "";
    form.detailAddress = user.detailAddress || "";
    form.emailOptIn = user.emailOptIn || false;

    // 전화번호 파싱
    const phoneParts = parsePhone(user.phone || "");
    form.phone1 = phoneParts.part1;
    form.phone2 = phoneParts.part2;
    form.phone3 = phoneParts.part3;
  }
};

// 주소 검색 모달 열기
const openAddressSearch = () => {
  isAddressSearchOpen.value = true;
};

// 주소 선택 핸들러
const handleAddressSelect = (address: {
  zonecode: string;
  address: string;
}) => {
  form.zipCode = address.zonecode;
  form.address = address.address;
  form.detailAddress = ""; // 상세 주소 초기화

  // 주소 선택 후 상세주소 입력 필드로 focus
  nextTick(() => {
    detailAddressInputRef.value?.$el?.focus();
  });
};

// 유효성 검사 및 Alert 표시 헬퍼
const showValidationError = (message: string, focusRef?: any) => {
  showAlert(message, { type: "error" });

  if (focusRef) {
    // Alert가 표시된 후 해당 필드에 focus
    setTimeout(() => {
      if (focusRef.value?.$el) {
        focusRef.value.$el.focus();
      } else if (focusRef.value?.focus) {
        focusRef.value.focus();
      }
    }, 100);
  }
};

// 프로필 업데이트
const handleUpdateProfile = async () => {
  if (!form.userName.trim()) {
    showValidationError("이름을 입력해주세요.", userNameInputRef);
    return;
  }
  if (!form.currentPassword) {
    showValidationError(
      "정보를 수정하려면 현재 비밀번호를 입력해주세요.",
      currentPasswordInputRef
    );
    return;
  }

  try {
    isLoading.value = true;

    // 비밀번호 확인 (현재 비밀번호를 동일하게 전송하여 검증)
    await changeMyPassword({
      currentPassword: form.currentPassword,
      newPassword: form.currentPassword,
    });

    // 정보 업데이트
    const fullPhone = `${form.phone1}-${form.phone2}-${form.phone3}`;
    await updateMyInfo({
      userName: form.userName,
      phone: fullPhone,
      zipCode: form.zipCode,
      address: form.address,
      detailAddress: form.detailAddress,
      emailOptIn: form.emailOptIn,
    });

    await authStore.loadUser();

    // Account 페이지로 이동 후 성공 Alert 표시
    await router.push("/account");
    showAlert("회원 정보가 수정되었습니다.", { type: "success" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "정보 수정 실패";
    if (errMsg.includes("401") || errMsg.includes("비밀번호")) {
      showAlert("비밀번호가 올바르지 않습니다.", { type: "error" });
    } else {
      showAlert("오류 발생: " + errMsg, { type: "error" });
    }
  } finally {
    isLoading.value = false;
  }
};

// 비밀번호 변경
const handleChangePassword = async () => {
  if (!passwordForm.currentPassword) {
    showValidationError(
      "현재 비밀번호를 입력해주세요.",
      pwCurrentPasswordInputRef
    );
    return;
  }
  if (!passwordForm.newPassword) {
    showValidationError("새 비밀번호를 입력해주세요.", newPasswordInputRef);
    return;
  }
  if (passwordForm.newPassword.length < 8) {
    showValidationError(
      "새 비밀번호는 8자 이상이어야 합니다.",
      newPasswordInputRef
    );
    return;
  }
  if (!passwordForm.confirmNewPassword) {
    showValidationError(
      "새 비밀번호 확인을 입력해주세요.",
      confirmNewPasswordInputRef
    );
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
    showValidationError(
      "새 비밀번호가 일치하지 않습니다.",
      confirmNewPasswordInputRef
    );
    return;
  }
  if (passwordForm.currentPassword === passwordForm.newPassword) {
    showValidationError(
      "현재 비밀번호와 다른 비밀번호를 입력해주세요.",
      newPasswordInputRef
    );
    return;
  }

  try {
    isPasswordLoading.value = true;

    await changeMyPassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });

    // Account 페이지로 이동 후 성공 Alert 표시
    await router.push("/account");
    showAlert("비밀번호가 변경되었습니다.", { type: "success" });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : "비밀번호 변경 실패";
    if (errMsg.includes("401") || errMsg.includes("비밀번호")) {
      showAlert("현재 비밀번호가 올바르지 않습니다.", { type: "error" });
    } else {
      showAlert("오류 발생: " + errMsg, { type: "error" });
    }
  } finally {
    isPasswordLoading.value = false;
  }
};

// 회원 탈퇴
const handleWithdraw = async () => {
  // 1단계: Confirm으로 탈퇴 의사 확인
  const confirmed = await showDestructiveConfirm(
    "샤키샤키 아카이브를 떠나시겠습니까?\n떠나시면 모든 정보가 즉시 파기되며,\n다시는 복구할 수 없습니다.",
    {
      confirmText: "다음",
      cancelText: "취소",
    }
  );

  if (!confirmed) {
    return;
  }

  // Alert transition이 완료될 시간을 줌 (150ms transition + 여유 50ms)
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 2단계: '탈퇴' 직접 입력 확인 (PromptConfirm 사용)
  const input = await showPromptConfirm(
    "샤키샤키 아카이브를 떠나시려면 \n 아래에 '탈퇴'를 입력해주세요.",
    {
      variant: "destructive",
      confirmText: "확인",
      cancelText: "취소",
      placeholder: "탈퇴",
      //required: "탈퇴",
    }
  );

  // null이면 취소하거나 입력이 일치하지 않은 경우
  if (input === null) {
    return;
  }

  // 탈퇴 실행
  try {
    await withdrawUser();

    // 로그아웃 처리 후 성공 Alert 표시
    await authStore.handleLogout();
    showAlert("탈퇴되었습니다.", { type: "success" });
  } catch (e: unknown) {
    const errMsg = e instanceof Error ? e.message : "탈퇴 실패";
    showAlert(errMsg, { type: "error" });
  }
};

onMounted(async () => {
  if (!authStore.isAuthenticated) {
    router.replace("/login");
    return;
  }
  if (!authStore.user) await authStore.loadUser();
  initializeForm();
});
</script>

<template>
  <div class="max-w-md mx-auto px-3 sm:px-4 py-8 sm:py-12 md:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-4 sm:mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">
        회원정보 수정
      </h3>
      <Separator></Separator>
    </div>

    <form @submit.prevent="handleUpdateProfile" class="space-y-6 sm:space-y-8">
      <!-- 기본 정보 섹션 -->
      <Card>
        <CardHeader class="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle class="text-heading">기본 정보</CardTitle>
        </CardHeader>

        <CardContent class="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-5 sm:pb-6">
          <div class="space-y-2">
            <Label for="email">이메일</Label>
            <Input
              id="email"
              v-model="form.email"
              type="email"
              disabled
              class="bg-muted"
            />
          </div>

          <div class="space-y-2">
            <Label for="userName">이름</Label>
            <Input
              ref="userNameInputRef"
              id="userName"
              v-model="form.userName"
              type="text"
              @keydown.enter.prevent="handleUserNameEnter"
            />
          </div>

          <div class="space-y-2">
            <Label>휴대전화</Label>
            <PhoneInput
              ref="phoneInputRef"
              v-model:phone1="form.phone1"
              v-model:phone2="form.phone2"
              v-model:phone3="form.phone3"
              @enter="handlePhoneEnter"
            />
          </div>

          <div class="space-y-2">
            <Label class="text-body">주소</Label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <Input
                  v-model="form.zipCode"
                  type="text"
                  readonly
                  placeholder="우편번호"
                  class="w-20 sm:w-28 bg-muted text-caption sm:text-body"
                />
                <Button
                  ref="addressSearchButtonRef"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="h-10 px-3 sm:px-4 text-caption sm:text-body shrink-0"
                  @click="openAddressSearch"
                >
                  주소검색
                </Button>
              </div>
              <Input
                v-model="form.address"
                type="text"
                readonly
                placeholder="기본 주소"
                class="bg-muted text-caption sm:text-body"
              />
              <Input
                ref="detailAddressInputRef"
                v-model="form.detailAddress"
                type="text"
                placeholder="상세 주소 입력"
                @keydown.enter.prevent="handleDetailAddressEnter"
                class="text-caption sm:text-body"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="currentPassword"
              >현재 비밀번호
              <span class="text-primary text-body font-normal ml-2">
                * 정보 수정을 위해 필수입니다.
              </span>
            </Label>
            <Input
              ref="currentPasswordInputRef"
              id="currentPassword"
              v-model="form.currentPassword"
              type="password"
              placeholder="현재 비밀번호 입력"
              @keydown.enter.prevent="handleCurrentPasswordEnter"
            />
          </div>

          <div class="flex items-center space-x-2">
            <input
              ref="emailOptInCheckboxRef"
              id="opt-in"
              v-model="form.emailOptIn"
              type="checkbox"
              class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              @keydown.enter.prevent="handleEmailOptInEnter"
            />
            <Label for="opt-in" class="text-body font-normal cursor-pointer">
              이메일 수신 동의
            </Label>
          </div>
        </CardContent>
      </Card>

      <!-- 제출 버튼 -->
      <div class="text-right">
        <Button
          ref="updateProfileButtonRef"
          type="submit"
          :disabled="isLoading"
          size="lg"
          class="w-full sm:w-auto"
        >
          {{ isLoading ? "처리중..." : "정보 수정 완료" }}
        </Button>
      </div>
    </form>

    <Separator class="my-6 sm:my-8" />

    <!-- 비밀번호 변경 섹션 (별도 폼) -->
    <form @submit.prevent="handleChangePassword" class="space-y-6 sm:space-y-8">
      <Card>
        <CardHeader class="px-4 sm:px-6 py-4 sm:py-5">
          <CardTitle class="text-heading">비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4 sm:space-y-5 px-4 sm:px-6 pb-5 sm:pb-6">
          <div class="space-y-2">
            <Label for="pwCurrentPassword">현재 비밀번호</Label>
            <Input
              ref="pwCurrentPasswordInputRef"
              id="pwCurrentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="현재 비밀번호 입력"
              @keydown.enter.prevent="handlePwCurrentPasswordEnter"
            />
          </div>

          <div class="space-y-2">
            <Label for="newPassword">새 비밀번호</Label>
            <Input
              ref="newPasswordInputRef"
              id="newPassword"
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="새 비밀번호 입력 (8자 이상)"
              @keydown.enter.prevent="handleNewPasswordEnter"
            />
          </div>

          <div class="space-y-2">
            <Label for="confirmNewPassword">새 비밀번호 확인</Label>
            <Input
              ref="confirmNewPasswordInputRef"
              id="confirmNewPassword"
              v-model="passwordForm.confirmNewPassword"
              type="password"
              placeholder="새 비밀번호 재입력"
              @keydown.enter.prevent="handleConfirmNewPasswordEnter"
            />
          </div>
        </CardContent>
      </Card>

      <div class="text-right">
        <Button
          ref="changePasswordButtonRef"
          type="submit"
          :disabled="isPasswordLoading"
          size="lg"
          class="w-full sm:w-auto"
        >
          {{ isPasswordLoading ? "처리중..." : "비밀번호 변경" }}
        </Button>
      </div>
    </form>

    <!-- 회원 탈퇴 -->
    <div class="mt-12 sm:mt-16 pt-3 border-t border-border flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        @click="handleWithdraw"
        class="text-caption sm:text-body text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        회원 탈퇴하기
      </Button>
    </div>

    <!-- 주소 검색 모달 -->
    <AddressSearchModal
      :open="isAddressSearchOpen"
      @close="isAddressSearchOpen = false"
      @select="handleAddressSelect"
    />
  </div>
</template>
