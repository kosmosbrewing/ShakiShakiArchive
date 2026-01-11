<script setup lang="ts">
// src/pages/Modify.vue
// 회원정보 수정 페이지

import { ref, reactive, onMounted } from "vue";
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
const currentPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);

// Input refs - 비밀번호 변경
const pwCurrentPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const newPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const confirmNewPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();
const isLoading = ref(false);
const isAddressSearchOpen = ref(false);

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
  if (prompt("탈퇴하려면 '탈퇴'를 입력하세요.") === "탈퇴") {
    try {
      await withdrawUser();

      // 로그아웃 처리 후 성공 Alert 표시
      await authStore.handleLogout();
      showAlert("탈퇴되었습니다.", { type: "success" });
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "탈퇴 실패";
      showAlert(errMsg, { type: "error" });
    }
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
  <div class="max-w-md mx-auto px-4 py-12 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6">
      <h3 class="text-heading text-primary tracking-wider mb-3">
        회원정보 수정
      </h3>
      <Separator></Separator>
    </div>

    <form @submit.prevent="handleUpdateProfile" class="space-y-8">
      <!-- 기본 정보 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-heading">기본 정보</CardTitle>
        </CardHeader>

        <CardContent class="space-y-5">
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
            />
          </div>

          <div class="space-y-2">
            <Label>주소</Label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <Input
                  v-model="form.zipCode"
                  type="text"
                  readonly
                  placeholder="우편번호"
                  class="w-32 bg-muted"
                />
                <Button
                  type="button"
                  variant="outline"
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
                class="bg-muted"
              />
              <Input
                v-model="form.detailAddress"
                type="text"
                placeholder="상세 주소 입력"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>휴대전화</Label>
            <PhoneInput
              v-model:phone1="form.phone1"
              v-model:phone2="form.phone2"
              v-model:phone3="form.phone3"
            />
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
            />
          </div>

          <div class="flex items-center space-x-2">
            <input
              id="opt-in"
              v-model="form.emailOptIn"
              type="checkbox"
              class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            <Label for="opt-in" class="text-body font-normal cursor-pointer">
              이메일 수신 동의
            </Label>
          </div>
        </CardContent>
      </Card>

      <!-- 제출 버튼 -->
      <div class="text-right">
        <Button type="submit" :disabled="isLoading" size="lg">
          {{ isLoading ? "처리중..." : "정보 수정 완료" }}
        </Button>
      </div>
    </form>

    <Separator class="my-8" />

    <!-- 비밀번호 변경 섹션 (별도 폼) -->
    <form @submit.prevent="handleChangePassword" class="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle class="text-heading">비밀번호 변경</CardTitle>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2">
            <Label for="pwCurrentPassword">현재 비밀번호</Label>
            <Input
              ref="pwCurrentPasswordInputRef"
              id="pwCurrentPassword"
              v-model="passwordForm.currentPassword"
              type="password"
              placeholder="현재 비밀번호 입력"
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
            />
          </div>
        </CardContent>
      </Card>

      <div class="text-right">
        <Button type="submit" :disabled="isPasswordLoading" size="lg">
          {{ isPasswordLoading ? "처리중..." : "비밀번호 변경" }}
        </Button>
      </div>
    </form>

    <!-- 회원 탈퇴 -->
    <div class="mt-16 pt-3 border-t border-border flex justify-end">
      <Button
        variant="ghost"
        size="sm"
        @click="handleWithdraw"
        class="text-muted-foreground hover:text-destructive"
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
