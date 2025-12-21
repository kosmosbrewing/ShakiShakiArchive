<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { sendVerification, verifyEmail } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Mail,
  KeyRound,
} from "lucide-vue-next";
import { PhoneInput } from "@/components/common";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const router = useRouter();
const authStore = useAuthStore();

// ... (스크립트 로직은 기존과 동일하므로 생략하거나 그대로 유지) ...
// 1. 회원가입 폼 데이터
const formData = reactive({
  email: "",
  password: "",
  confirmPassword: "",
  userName: "",
  phone1: "010",
  phone2: "",
  phone3: "",
  zipCode: "",
  address: "",
  detailAddress: "",
  emailOptIn: false,
});

// 2. 이메일 인증 상태
const verificationState = reactive({
  isSent: false,
  isVerified: false,
  code: "",
  isLoading: false,
  isVerifying: false,
  errorMessage: "",
});

// 3. UI 상태
const isSubmitting = ref(false);
const errorMessage = ref("");

// 인증코드 발송
const sendVerificationCode = async () => {
  if (!formData.email || !formData.email.includes("@")) {
    verificationState.errorMessage = "유효한 이메일을 입력해주세요.";
    return;
  }

  verificationState.isLoading = true;
  verificationState.errorMessage = "";

  try {
    await sendVerification(formData.email, "signup");
    verificationState.isSent = true;
    verificationState.errorMessage = "";
  } catch (error: any) {
    verificationState.errorMessage =
      error.message || "인증코드 발송에 실패했습니다.";
  } finally {
    verificationState.isLoading = false;
  }
};

// 인증코드 확인
const verifyCode = async () => {
  if (!verificationState.code || verificationState.code.length !== 6) {
    verificationState.errorMessage = "6자리 인증코드를 입력해주세요.";
    return;
  }

  verificationState.isVerifying = true;
  verificationState.errorMessage = "";

  try {
    const response = await verifyEmail(
      formData.email,
      verificationState.code,
      "signup"
    );
    if (response.verified) {
      verificationState.isVerified = true;
      verificationState.errorMessage = "";
    } else {
      verificationState.errorMessage = "인증번호가 일치하지 않습니다.";
    }
  } catch (error: any) {
    verificationState.errorMessage =
      error.message || "인증 확인에 실패했습니다.";
  } finally {
    verificationState.isVerifying = false;
  }
};

const openAddressSearch = () => {
  alert("주소 검색 창이 열립니다. (실제 구현 시 Daum 우편번호 API 연동)");
  formData.zipCode = "12345";
  formData.address = "서울시 강남구 테헤란로 123";
};

const handleSignup = async () => {
  errorMessage.value = "";

  if (!verificationState.isVerified) {
    errorMessage.value = "이메일 인증을 완료해주세요.";
    return;
  }
  if (
    !formData.userName ||
    !formData.phone1 ||
    formData.phone2 ||
    formData.phone3
  ) {
    errorMessage.value = "필수 정보를 모두 입력해주세요.";
    return;
  }
  if (formData.password.length < 8) {
    errorMessage.value = "비밀번호는 최소 8자 이상이어야 합니다.";
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    errorMessage.value = "비밀번호가 일치하지 않습니다.";
    return;
  }

  try {
    isSubmitting.value = true;
    await authStore.register({
      email: formData.email,
      password: formData.password,
      userName: formData.userName,
      phone1: formData.phone1,
      phone2: formData.phone2,
      phone3: formData.phone3,

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
  <section
    id="signup"
    class="max-w-md mx-auto items-center justify-center py-24 sm:py-16"
  >
    <div class="mb-6 text-center">
      <h2 class="text-heading text-primary mb-2 tracking-wider">회원가입</h2>
    </div>

    <Card class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent>
        <form @submit.prevent="handleSignup" class="grid gap-6">
          <div class="flex flex-col gap-1.5 mt-6">
            <Label for="email"
              >이메일 <span class="text-red-500">*</span></Label
            >
            <div class="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                v-model="formData.email"
                :disabled="verificationState.isVerified"
              />
              <Button
                type="button"
                variant="outline"
                @click="sendVerificationCode"
                :disabled="
                  verificationState.isVerified ||
                  verificationState.isLoading ||
                  !formData.email
                "
                class="w-28 shrink-0"
              >
                <Loader2
                  v-if="verificationState.isLoading"
                  class="animate-spin h-4 w-4 mr-2"
                />
                <Mail
                  v-else-if="!verificationState.isVerified"
                  class="w-4 h-4 mr-2"
                />
                <CheckCircle2 v-else class="w-4 h-4 mr-2" />
                <span v-if="verificationState.isLoading">전송중</span>
                <span v-else-if="verificationState.isVerified">완료</span>
                <span v-else-if="verificationState.isSent">재전송</span>
                <span v-else>인증요청</span>
              </Button>
            </div>
            <p
              v-if="
                verificationState.errorMessage && !verificationState.isSent
              "
              class="text-caption text-red-500"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>

          <div
            v-if="verificationState.isSent && !verificationState.isVerified"
            class="flex flex-col gap-1.5 animate-in slide-in-from-top-2"
          >
            <Label for="code">인증번호</Label>
            <div class="flex gap-2">
              <Input
                id="code"
                type="text"
                placeholder="인증번호 6자리"
                maxlength="6"
                v-model="verificationState.code"
                :disabled="verificationState.isVerifying"
              />
              <Button
                type="button"
                variant="outline"
                class="w-28 shrink-0"
                @click="verifyCode"
                :disabled="
                  verificationState.isVerifying ||
                  verificationState.code.length !== 6
                "
              >
                <Loader2
                  v-if="verificationState.isVerifying"
                  class="animate-spin h-4 w-4 mr-2"
                />
                <KeyRound v-else class="w-4 h-4 mr-2" />
                {{ verificationState.isVerifying ? "확인중" : "확인" }}
              </Button>
            </div>
            <p class="text-caption text-muted-foreground">
              이메일로 발송된 6자리 인증번호를 입력해주세요.
            </p>
            <p
              v-if="verificationState.errorMessage"
              class="text-caption text-red-500"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>

          <Alert
            v-if="verificationState.isVerified"
            class="bg-green-50 text-green-700 border-green-200 py-2"
          >
            <CheckCircle2 class="h-4 w-4" />
            <AlertTitle class="ml-2 text-body font-medium"
              >이메일 인증 완료</AlertTitle
            >
          </Alert>

          <div class="flex flex-col gap-1.5">
            <Label for="password"
              >비밀번호 <span class="text-red-500">*</span></Label
            >
            <Input
              id="password"
              type="password"
              placeholder="8자 이상"
              v-model="formData.password"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="confirmPassword"
              >비밀번호 확인 <span class="text-red-500">*</span></Label
            >
            <Input
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              v-model="formData.confirmPassword"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="userName"
              >이름 <span class="text-red-500">*</span></Label
            >
            <Input
              id="userName"
              type="text"
              placeholder="실명 입력"
              v-model="formData.userName"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="phone"
              >휴대전화 <span class="text-red-500">*</span></Label
            >
            <PhoneInput
              v-model:phone1="formData.phone1"
              v-model:phone2="formData.phone2"
              v-model:phone3="formData.phone3"
            />
          </div>
          <div class="flex flex-col gap-2">
            <Label>주소</Label>
            <div class="flex gap-2">
              <Input
                v-model="formData.zipCode"
                placeholder="우편번호"
                readonly
                class="bg-gray/50"
              />
              <Button
                type="button"
                variant="outline"
                class="w-28 shrink-0"
                @click="openAddressSearch"
              >
                <Search class="w-4 h-4 mr-2" /> 주소검색
              </Button>
            </div>

            <Input
              v-model="formData.address"
              placeholder="기본 주소"
              readonly
              class="bg-gray/50"
            />

            <Input
              v-model="formData.detailAddress"
              :disabled="!formData.address"
              :placeholder="
                formData.address
                  ? '상세 주소를 입력해주세요'
                  : '주소 검색 후 입력 가능합니다'
              "
              class="disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div class="flex items-center space-x-2 mt-2">
            <input
              id="email-opt-in"
              type="checkbox"
              v-model="formData.emailOptIn"
              class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              for="email-opt-in"
              class="text-body font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              [선택] 이벤트 및 할인 소식 이메일 수신 동의
            </label>
          </div>

          <Alert v-if="errorMessage" variant="destructive">
            <AlertCircle class="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{{ errorMessage }}</AlertDescription>
          </Alert>

          <Button
            type="submit"
            class="w-full mt-2"
            :disabled="isSubmitting || !verificationState.isVerified"
          >
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ isSubmitting ? "처리 중..." : "회원가입 완료" }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <p class="text-center text-muted-foreground mt-4">
      이미 계정이 있으신가요?
      <router-link to="/login" class="text-primary hover:underline font-medium"
        >로그인하기</router-link
      >
    </p>
  </section>
</template>
