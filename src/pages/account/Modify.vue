<script setup lang="ts">
// src/pages/Modify.vue
// 회원정보 수정 페이지

import { ref, reactive, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { updateMyInfo, changeMyPassword, withdrawUser } from "@/lib/api";
import { parsePhone } from "@/lib/formatters";

// 공통 컴포넌트
import { PhoneInput } from "@/components/common";

// Shadcn UI 컴포넌트
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

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
  password: "",
  confirmPassword: "",
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

// 주소 검색 (API 연동 필요)
const openAddressSearch = () => {
  alert("주소 검색 (API 연동 필요)");
  form.zipCode = "12345";
  form.address = "서울시 강남구 테헤란로 123";
};

// 프로필 업데이트
const handleUpdateProfile = async () => {
  if (!form.userName) return alert("이름을 입력해주세요.");
  if (!form.password)
    return alert("정보를 수정하려면 비밀번호를 입력해주세요.");
  if (form.password !== form.confirmPassword) {
    return alert("비밀번호가 일치하지 않습니다.");
  }

  try {
    isLoading.value = true;

    // 비밀번호 확인
    await changeMyPassword({
      currentPassword: form.password,
      newPassword: form.password,
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
    alert("회원 정보가 수정되었습니다.");

    // 비밀번호 필드 초기화
    form.password = "";
    form.confirmPassword = "";
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "정보 수정 실패";
    if (errorMessage.includes("401") || errorMessage.includes("비밀번호")) {
      alert("비밀번호가 올바르지 않습니다.");
    } else {
      alert("오류 발생: " + errorMessage);
    }
  } finally {
    isLoading.value = false;
  }
};

// 회원 탈퇴
const handleWithdraw = async () => {
  if (prompt("탈퇴하려면 '탈퇴'를 입력하세요.") === "탈퇴") {
    try {
      await withdrawUser();
      await authStore.handleLogout();
      alert("탈퇴되었습니다.");
      router.push("/");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "탈퇴 실패";
      alert(errorMessage);
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
  <div class="max-w-md mx-auto items-center justify-center py-24 sm:py-16">
    <!-- 페이지 제목 -->
    <div class="mb-6 border-b pb-3">
      <h3 class="text-heading text-primary tracking-wider">회원정보 수정</h3>
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
            <Input id="userName" v-model="form.userName" type="text" />
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

      <Separator />

      <!-- 비밀번호 확인 섹션 -->
      <Card>
        <CardHeader>
          <CardTitle class="text-heading">
            비밀번호 확인
            <span class="text-destructive text-body font-normal ml-2">
              * 정보 수정을 위해 필수입니다.
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-2">
            <Label for="password">비밀번호</Label>
            <Input
              id="password"
              v-model="form.password"
              type="password"
              placeholder="비밀번호 입력"
            />
          </div>

          <div class="space-y-2">
            <Label for="confirmPassword">비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              v-model="form.confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
            />
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
  </div>
</template>
