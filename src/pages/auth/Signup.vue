<script setup lang="ts">
import { ref, computed, reactive, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { sendVerification, verifyEmail } from "@/lib/api";

// 환경 체크: Production 환경에서는 준비중 표시
const isProduction = computed(() => import.meta.env.MODE === "production");
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Search,
  Mail,
  KeyRound,
} from "lucide-vue-next";
import { PhoneInput, AddressSearchModal } from "@/components/common";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  type AlertType,
} from "@/components/ui/alert";

// Input refs
const emailInputRef = ref<InstanceType<typeof Input> | null>(null);
const passwordInputRef = ref<InstanceType<typeof Input> | null>(null);
const confirmPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const userNameInputRef = ref<InstanceType<typeof Input> | null>(null);
const phoneInputRef = ref<InstanceType<typeof PhoneInput> | null>(null);

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
const isAddressSearchOpen = ref(false);

// 4. Alert 상태
const showAlert = ref(false);
const alertMessage = ref("");
const alertType = ref<AlertType>("success");

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

// 주소 검색 모달 열기
const openAddressSearch = () => {
  isAddressSearchOpen.value = true;
};

// 주소 선택 핸들러
const handleAddressSelect = (address: {
  zonecode: string;
  address: string;
}) => {
  formData.zipCode = address.zonecode;
  formData.address = address.address;
  formData.detailAddress = ""; // 상세 주소 초기화
};

// 유효성 검사 및 Alert 표시 헬퍼
const showValidationError = (
  message: string,
  focusRef?: any,
  isPhoneInput = false
) => {
  alertMessage.value = message;
  alertType.value = "error";
  showAlert.value = true;

  if (focusRef) {
    nextTick(() => {
      if (isPhoneInput) {
        focusRef.value?.focusFirst?.();
      } else if (focusRef.value?.$el) {
        focusRef.value.$el.focus();
      } else if (focusRef.value?.focus) {
        focusRef.value.focus();
      }
    });
  }
};

const handleSignup = async () => {
  errorMessage.value = "";

  // 이메일 인증 확인
  if (!verificationState.isVerified) {
    showValidationError("이메일 인증을 완료해주세요.", emailInputRef);
    return;
  }

  // 비밀번호 검증
  if (!formData.password) {
    showValidationError("비밀번호를 입력해주세요.", passwordInputRef);
    return;
  }
  if (formData.password.length < 8) {
    showValidationError(
      "비밀번호는 최소 8자 이상이어야 합니다.",
      passwordInputRef
    );
    return;
  }
  if (!formData.confirmPassword) {
    showValidationError(
      "비밀번호 확인을 입력해주세요.",
      confirmPasswordInputRef
    );
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showValidationError(
      "비밀번호가 일치하지 않습니다.",
      confirmPasswordInputRef
    );
    return;
  }

  // 이름 검증
  if (!formData.userName.trim()) {
    showValidationError("이름을 입력해주세요.", userNameInputRef);
    return;
  }

  // 전화번호 검증
  if (!formData.phone2 || !formData.phone3) {
    showValidationError("휴대전화 번호를 입력해주세요.", phoneInputRef, true);
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

    // 성공 Alert 표시
    alertMessage.value = "회원가입이 완료되었습니다!";
    alertType.value = "success";
    showAlert.value = true;

    // 잠시 후 로그인 페이지로 이동
    setTimeout(() => {
      router.push("/login");
    }, 1500);
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

    <!-- Production 환경: 준비중 안내 -->
    <Card v-if="isProduction" class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent class="py-16 text-center">
        <div class="flex flex-col items-center gap-4">
          <AlertCircle class="w-16 h-16 text-muted-foreground" />
          <h3 class="text-xl font-semibold text-foreground">준비중입니다</h3>
          <p class="text-muted-foreground">
            회원가입 기능은 현재 준비중입니다.<br />
            빠른 시일 내에 서비스를 오픈할 예정입니다.
          </p>
          <router-link to="/">
            <Button variant="outline" class="mt-4">홈으로 돌아가기</Button>
          </router-link>
        </div>
      </CardContent>
    </Card>

    <!-- 개발 환경: 기존 회원가입 폼 -->
    <Card v-else class="w-11/12 bg-muted/5 dark:bg-card mx-auto">
      <CardContent>
        <form @submit.prevent="handleSignup" class="grid gap-6">
          <div class="flex flex-col gap-1.5 mt-6">
            <Label for="email"
              >이메일 <span class="text-red-500">*</span></Label
            >
            <div class="flex gap-2">
              <Input
                ref="emailInputRef"
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
              v-if="verificationState.errorMessage && !verificationState.isSent"
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
              ref="passwordInputRef"
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
              ref="confirmPasswordInputRef"
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
              ref="userNameInputRef"
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
              ref="phoneInputRef"
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

    <p v-if="!isProduction" class="text-center text-muted-foreground mt-4">
      이미 계정이 있으신가요?
      <router-link to="/login" class="text-primary hover:underline font-medium"
        >로그인하기</router-link
      >
    </p>

    <!-- 주소 검색 모달 -->
    <AddressSearchModal
      :open="isAddressSearchOpen"
      @close="isAddressSearchOpen = false"
      @select="handleAddressSelect"
    />

    <!-- Alert 모달 (성공/오류) -->
    <Alert
      v-if="showAlert"
      :type="alertType"
      :message="alertMessage"
      @close="showAlert = false"
    />
  </section>
</template>
