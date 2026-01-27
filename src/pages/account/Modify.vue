<script setup lang="ts">
// src/pages/Modify.vue
// 회원정보 수정 페이지

import { ref, reactive, onMounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { updateMyInfo, changeMyPassword, withdrawUser } from "@/lib/api";
import { parsePhone } from "@/lib/formatters";
import { getPasswordErrorMessage, getPasswordStrength } from "@/utils/password-validation";
import { ACCOUNT_MESSAGES } from "@/lib/messages";
import { reauthWithKakao, reauthWithNaver } from "@/services/socialAuth";

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

// 소셜 로그인 사용자 여부
const isSocialUser = computed(() => {
  const provider = authStore.user?.socialProvider;
  return provider && provider !== "local";
});

// 소셜 로그인 제공자
const socialProvider = computed(() => authStore.user?.socialProvider);

// 소셜 로그인 제공자 표시 이름
const socialProviderLabel = computed(() => {
  return socialProvider.value === "kakao" ? "카카오" : "네이버";
});

// 소셜 인증 버튼 스타일 (로그인 페이지와 동일)
const socialButtonClass = computed(() => {
  return socialProvider.value === "kakao"
    ? "bg-[#FEE500] hover:bg-[#FEE500]/90 font-medium border-[#FEE500]"
    : "bg-[#03A94D] hover:bg-[#03A94D]/90 font-medium";
});

// 소셜 재인증 완료 여부 (5분간 유효)
const isSocialReauthVerified = ref(false);

// 소셜 재인증 상태 확인
const checkSocialReauthVerified = () => {
  const verifiedTime = sessionStorage.getItem("social_reauth_verified");
  if (verifiedTime) {
    const elapsed = Date.now() - parseInt(verifiedTime, 10);
    // 5분(300000ms) 이내이면 인증 유효
    if (elapsed < 300000) {
      isSocialReauthVerified.value = true;
      return true;
    }
    // 만료된 경우 삭제
    sessionStorage.removeItem("social_reauth_verified");
  }
  return false;
};

// 소셜 재인증 요청
const handleSocialReauth = () => {
  if (socialProvider.value === "kakao") {
    reauthWithKakao();
  } else if (socialProvider.value === "naver") {
    reauthWithNaver();
  }
};

// 닉네임 필드 Enter 키 처리 (1자 이상일 때만 이동)
const handleUserNameEnter = (e: KeyboardEvent) => {
  // IME 조합 중이면 무시 (한글 입력 시 마지막 글자 중복 방지)
  if (e.isComposing) return;

  if (form.userName.trim().length >= 1) {
    nextTick(() => {
      phoneInputRef.value?.focusFirst();
    });
  }
};

// 휴대전화 마지막 입력 후 처리 (우편번호 유무에 따라 분기)
const handlePhoneEnter = () => {
  nextTick(() => {
    if (form.zipCode) {
      // 우편번호가 있으면 상세주소로 이동
      detailAddressInputRef.value?.$el?.focus();
    } else {
      // 우편번호가 없으면 주소검색 버튼으로 이동
      addressSearchButtonRef.value?.$el?.focus();
    }
  });
};

// 상세주소 필드 Enter 키 처리 (1자 이상일 때만 이동)
const handleDetailAddressEnter = (e: KeyboardEvent) => {
  // IME 조합 중이면 무시 (한글 입력 시 마지막 글자 중복 방지)
  if (e.isComposing) return;

  if (form.detailAddress.trim().length >= 1) {
    nextTick(() => {
      currentPasswordInputRef.value?.$el?.focus();
    });
  }
};

// 비밀번호 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handlePwCurrentPasswordEnter = () => {
  if (passwordForm.currentPassword.length >= 8) {
    nextTick(() => {
      newPasswordInputRef.value?.$el?.focus();
    });
  }
};

const handleNewPasswordEnter = () => {
  if (passwordForm.newPassword.length >= 8) {
    nextTick(() => {
      confirmNewPasswordInputRef.value?.$el?.focus();
    });
  }
};

// 기본정보 현재 비밀번호 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handleCurrentPasswordEnter = () => {
  if (form.currentPassword.length >= 8) {
    nextTick(() => {
      emailOptInCheckboxRef.value?.focus();
    });
  }
};

// 이메일 수신동의 체크박스 Enter 키 처리
const handleEmailOptInEnter = () => {
  nextTick(() => {
    updateProfileButtonRef.value?.$el?.focus();
  });
};

// 새 비밀번호 확인 필드 Enter 키 처리 (8자 이상일 때만 이동)
const handleConfirmNewPasswordEnter = () => {
  if (passwordForm.confirmNewPassword.length >= 8) {
    nextTick(() => {
      changePasswordButtonRef.value?.$el?.focus();
    });
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

// 비밀번호 강도 계산 (실시간)
const passwordStrength = computed(() => {
  if (!passwordForm.newPassword) {
    return null;
  }
  return getPasswordStrength(passwordForm.newPassword);
});

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
    showValidationError(ACCOUNT_MESSAGES.userNameRequired, userNameInputRef);
    return;
  }

  // 소셜 로그인 사용자: 재인증 확인
  if (isSocialUser.value) {
    if (!isSocialReauthVerified.value) {
      showAlert(`${socialProviderLabel.value} 인증이 필요합니다. 인증 버튼을 눌러주세요.`, { type: "error" });
      return;
    }
  } else {
    // 일반 사용자: 비밀번호 확인
    if (!form.currentPassword) {
      showValidationError(
        ACCOUNT_MESSAGES.currentPasswordRequiredForUpdate,
        currentPasswordInputRef
      );
      return;
    }
  }

  try {
    isLoading.value = true;

    // 일반 사용자만 비밀번호 확인 (현재 비밀번호를 동일하게 전송하여 검증)
    if (!isSocialUser.value) {
      await changeMyPassword({
        currentPassword: form.currentPassword,
        newPassword: form.currentPassword,
      });
    }

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

    // 소셜 재인증 상태 초기화
    if (isSocialUser.value) {
      sessionStorage.removeItem("social_reauth_verified");
      isSocialReauthVerified.value = false;
    }

    // Account 페이지로 이동 후 성공 Alert 표시
    await router.push("/account");
    showAlert(ACCOUNT_MESSAGES.profileUpdateSuccess, { type: "success" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : ACCOUNT_MESSAGES.profileUpdateFailed;
    if (errMsg.includes("401") || errMsg.includes("비밀번호")) {
      showAlert(ACCOUNT_MESSAGES.incorrectPassword, { type: "error" });
    } else {
      showAlert(ACCOUNT_MESSAGES.updateError.replace("{message}", errMsg), { type: "error" });
    }
  } finally {
    isLoading.value = false;
  }
};

// 비밀번호 변경
const handleChangePassword = async () => {
  if (!passwordForm.currentPassword) {
    showValidationError(
      ACCOUNT_MESSAGES.currentPasswordRequired,
      pwCurrentPasswordInputRef
    );
    return;
  }
  if (!passwordForm.newPassword) {
    showValidationError(ACCOUNT_MESSAGES.newPasswordRequired, newPasswordInputRef);
    return;
  }
  const passwordError = getPasswordErrorMessage(passwordForm.newPassword);
  if (passwordError) {
    showValidationError(passwordError, newPasswordInputRef);
    return;
  }
  if (!passwordForm.confirmNewPassword) {
    showValidationError(
      ACCOUNT_MESSAGES.newPasswordConfirmRequired,
      confirmNewPasswordInputRef
    );
    return;
  }
  if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
    showValidationError(
      ACCOUNT_MESSAGES.newPasswordMismatch,
      confirmNewPasswordInputRef
    );
    return;
  }
  if (passwordForm.currentPassword === passwordForm.newPassword) {
    showValidationError(
      ACCOUNT_MESSAGES.sameAsCurrentPassword,
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
    showAlert(ACCOUNT_MESSAGES.passwordChangeSuccess, { type: "success" });
  } catch (error: unknown) {
    const errMsg =
      error instanceof Error ? error.message : ACCOUNT_MESSAGES.passwordChangeFailed;
    if (errMsg.includes("401") || errMsg.includes("비밀번호")) {
      showAlert(ACCOUNT_MESSAGES.incorrectCurrentPassword, { type: "error" });
    } else {
      showAlert(ACCOUNT_MESSAGES.updateError.replace("{message}", errMsg), { type: "error" });
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
    showAlert(ACCOUNT_MESSAGES.withdrawSuccess, { type: "success" });
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

  // 소셜 재인증 상태 확인
  checkSocialReauthVerified();
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
              name="email"
              autocomplete="email"
              v-model="form.email"
              type="email"
              disabled
              class="bg-muted"
            />
          </div>

          <div class="space-y-2">
            <Label for="userName">닉네임</Label>
            <Input
              ref="userNameInputRef"
              id="userName"
              name="name"
              autocomplete="name"
              v-model="form.userName"
              type="text"
              placeholder="닉네임을 입력하세요"
              @keydown.enter.prevent="handleUserNameEnter($event)"
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
                @keydown.enter.prevent="handleDetailAddressEnter($event)"
                class="text-caption sm:text-body"
              />
            </div>
          </div>

          <!-- 일반 사용자: 비밀번호 재확인 -->
          <div v-if="!isSocialUser" class="space-y-2">
            <Label for="currentPassword"
              >현재 비밀번호
              <span class="text-primary text-body font-normal ml-2">
                * 정보 수정을 위해 필수입니다.
              </span>
            </Label>
            <Input
              ref="currentPasswordInputRef"
              id="currentPassword"
              name="current-password"
              autocomplete="current-password"
              v-model="form.currentPassword"
              type="password"
              placeholder="현재 비밀번호 입력"
              @keydown.enter.prevent="handleCurrentPasswordEnter"
            />
          </div>

          <!-- 소셜 로그인 사용자: 소셜 인증 버튼 -->
          <div v-else class="space-y-2">
            <Label>본인 인증</Label>
            <div
              class="flex items-center gap-3 p-4 rounded-lg border"
              :class="isSocialReauthVerified ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-muted/30 border-border'"
            >
              <div class="flex-1">
                <p v-if="isSocialReauthVerified" class="text-body text-green-600 dark:text-green-400 font-medium">
                  인증 완료
                </p>
                <p v-else class="text-body text-muted-foreground">
                  정보 수정을 위해 {{ socialProviderLabel }} 인증이 필요합니다.
                </p>
              </div>
              <Button
                v-if="!isSocialReauthVerified"
                type="button"
                variant="outline"
                :class="['h-10', socialButtonClass]"
                @click="handleSocialReauth"
              >
                <!-- 네이버 아이콘 -->
                <template v-if="socialProvider === 'naver'">
                  <div class="inline-flex items-center leading-none text-white">
                    <svg
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      class="w-4 h-4 block"
                      preserveAspectRatio="xMinYMid meet"
                    >
                      <path
                        d="M12.9286 20H20V0H12.9286V9.42857L7.07143 0H0V20H7.07143V10.5714L12.9286 20Z"
                      />
                    </svg>
                    <span class="text-sm font-medium tracking-tight ml-2 text-white">네이버 로그인</span>
                  </div>
                </template>
                <!-- 카카오 아이콘 -->
                <template v-else>
                  <div class="inline-flex items-center leading-none text-[#191919]">
                    <svg
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      class="w-5 h-5 block"
                    >
                      <path
                        d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.89 5.35 4.72 6.77-.15.53-.96 3.43-1 3.58 0 .08.03.16.09.21.07.05.15.06.22.03.3-.08 3.5-2.31 4.04-2.68.61.09 1.25.14 1.93.14 5.52 0 10-3.58 10-8S17.52 3 12 3z"
                      />
                    </svg>
                    <span class="text-sm font-medium tracking-tight ml-2 text-[#191919]">카카오 로그인</span>
                  </div>
                </template>
              </Button>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <input
              ref="emailOptInCheckboxRef"
              id="opt-in"
              v-model="form.emailOptIn"
              type="checkbox"
              class="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
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

    <!-- 일반 사용자만 비밀번호 변경 섹션 표시 -->
    <template v-if="!isSocialUser">
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
              name="current-password"
              autocomplete="current-password"
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
              name="new-password"
              autocomplete="new-password"
              v-model="passwordForm.newPassword"
              type="password"
              placeholder="8자 이상, 영문 대/소문자·숫자·특수문자 중 3가지 이상"
              @keydown.enter.prevent="handleNewPasswordEnter"
            />

            <!-- 비밀번호 강도 표시 (2가지: 진행 바, 메시지) -->
            <div v-if="passwordForm.newPassword" class="space-y-2 mt-1">
              <!-- 1. 진행 바 -->
              <div class="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full transition-all duration-300"
                  :class="{
                    'bg-red-500': passwordStrength?.strength === '약함',
                    'bg-yellow-500': passwordStrength?.strength === '보통',
                    'bg-green-500': passwordStrength?.strength === '강함',
                    'w-0': !passwordStrength?.checks.length,
                    'w-1/4': passwordStrength?.checks.length && passwordStrength?.score === 1,
                    'w-1/2': passwordStrength?.checks.length && passwordStrength?.score === 2,
                    'w-3/4': passwordStrength?.checks.length && passwordStrength?.score === 3,
                    'w-full': passwordStrength?.checks.length && passwordStrength?.score === 4,
                  }"
                ></div>
              </div>

              <!-- 2. 상세 메시지 -->
              <p
                class="text-caption"
                :class="{
                  'text-red-600': passwordStrength?.strength === '약함',
                  'text-yellow-600': passwordStrength?.strength === '보통',
                  'text-green-600': passwordStrength?.strength === '강함',
                }"
              >
                {{ passwordStrength?.message }}
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="confirmNewPassword">새 비밀번호 확인</Label>
            <Input
              ref="confirmNewPasswordInputRef"
              id="confirmNewPassword"
              name="confirm-password"
              autocomplete="new-password"
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
    </template>

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
