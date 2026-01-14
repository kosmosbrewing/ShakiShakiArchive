<script setup lang="ts">
import { ref, computed, reactive, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { sendVerification, verifyEmail } from "@/lib/api";
import { getPasswordErrorMessage } from "@/utils/password-validation";
import { validateEmail } from "@/utils/email-validation";

// 환경 체크: Production 환경에서는 준비중 표시
const isProduction = computed(() => import.meta.env.MODE === "production");
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound,
} from "lucide-vue-next";
import { PhoneInput, AddressSearchModal, PasswordStrengthIndicator } from "@/components/common";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Input refs
const emailInputRef = ref<InstanceType<typeof Input> | null>(null);
const verificationButtonRef = ref<InstanceType<typeof Button> | null>(null);
const verificationCodeInputRef = ref<InstanceType<typeof Input> | null>(null);
const passwordInputRef = ref<InstanceType<typeof Input> | null>(null);
const confirmPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const userNameInputRef = ref<InstanceType<typeof Input> | null>(null);
const phoneInputRef = ref<InstanceType<typeof PhoneInput> | null>(null);
const addressSearchButtonRef = ref<InstanceType<typeof Button> | null>(null);
const detailAddressInputRef = ref<InstanceType<typeof Input> | null>(null);
const emailOptInCheckboxRef = ref<HTMLInputElement | null>(null);
const signupButtonRef = ref<InstanceType<typeof Button> | null>(null);

const router = useRouter();
const authStore = useAuthStore();
const { showAlert: showAlertMessage } = useAlert();

// 이메일 필드에서 Enter 키 처리
const handleEmailEnter = () => {
  const emailValidation = validateEmail(formData.email);
  if (emailValidation.valid) {
    nextTick(() => {
      verificationButtonRef.value?.$el?.focus();
    });
  } else {
    showValidationError(emailValidation.error || '올바른 이메일 형식을 입력해주세요.', emailInputRef);
  }
};

// 비밀번호 필드에서 Enter 키 처리 (8자 이상일 때만 이동)
const handlePasswordEnter = () => {
  if (formData.password.length >= 8) {
    nextTick(() => {
      confirmPasswordInputRef.value?.$el?.focus();
    });
  }
  // 8자 미만이면 아무 동작도 하지 않음
};

// 비밀번호 확인 필드에서 Enter 키 처리 (8자 이상일 때만 이동)
const handleConfirmPasswordEnter = () => {
  if (formData.confirmPassword.length >= 8) {
    nextTick(() => {
      userNameInputRef.value?.$el?.focus();
    });
  }
  // 8자 미만이면 아무 동작도 하지 않음
};

// 이름 필드에서 Enter 키 처리 (1자 이상일 때만 이동)
const handleUserNameEnter = () => {
  if (formData.userName.trim().length >= 1) {
    // nextTick을 사용하여 현재 키 이벤트가 완전히 끝난 후 포커스 이동
    nextTick(() => {
      phoneInputRef.value?.focusFirst();
    });
  }
};

// 휴대전화 마지막 입력 후 처리 (우편번호 유무에 따라 분기)
const handlePhoneEnter = () => {
  nextTick(() => {
    if (formData.zipCode) {
      // 우편번호가 있으면 상세주소로 이동
      detailAddressInputRef.value?.$el?.focus();
    } else {
      // 우편번호가 없으면 주소검색 버튼으로 이동
      addressSearchButtonRef.value?.$el?.focus();
    }
  });
};

// 상세주소 필드에서 Enter 키 처리 (1자 이상일 때만 이동)
const handleDetailAddressEnter = () => {
  if (formData.detailAddress.trim().length >= 1) {
    nextTick(() => {
      emailOptInCheckboxRef.value?.focus();
    });
  }
};

// 이메일 수신동의 체크박스에서 Enter 키 처리
const handleEmailOptInEnter = () => {
  nextTick(() => {
    signupButtonRef.value?.$el?.focus();
  });
};

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

// 이메일 형식 검증 (blur 이벤트용)
// 실시간 피드백을 제공하되, API 호출은 하지 않음 (중복 호출 방지)
const checkEmailFormat = () => {
  // 이미 인증 완료되었으면 검증 스킵
  if (verificationState.isVerified) {
    return;
  }

  // 빈 값은 검증하지 않음 (blur 이벤트이므로)
  if (!formData.email) {
    verificationState.errorMessage = "";
    return;
  }

  // 형식 검증만 수행 (API 호출 없음)
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.valid) {
    verificationState.errorMessage = emailValidation.error || "유효한 이메일을 입력해주세요.";
  } else {
    // 형식이 유효하면 에러 메시지 제거
    verificationState.errorMessage = "";
  }
};

// 인증코드 발송
const sendVerificationCode = async () => {
  // 형식 검증
  const emailValidation = validateEmail(formData.email);
  if (!emailValidation.valid) {
    verificationState.errorMessage = emailValidation.error || "유효한 이메일을 입력해주세요.";
    return;
  }

  verificationState.isLoading = true;
  verificationState.errorMessage = "";

  try {
    await sendVerification(formData.email, "signup");
    verificationState.isSent = true;
    verificationState.errorMessage = "";
  } catch (error: any) {
    // 중복된 이메일 감지 (여러 키워드 체크로 견고성 강화)
    const errorMsg = error.message?.toLowerCase() || "";
    if (
      errorMsg.includes("이미 사용") ||
      errorMsg.includes("중복") ||
      errorMsg.includes("이미 가입") ||
      errorMsg.includes("이미 등록") ||
      errorMsg.includes("already exists") ||
      errorMsg.includes("duplicate")
    ) {
      verificationState.errorMessage = "이미 가입된 이메일입니다";
    } else {
      verificationState.errorMessage = error.message || "인증코드 발송에 실패했습니다.";
    }
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

  // 주소 선택 후 상세주소 입력 필드로 focus
  nextTick(() => {
    detailAddressInputRef.value?.$el?.focus();
  });
};

// 유효성 검사 및 Alert 표시 헬퍼
const showValidationError = (
  message: string,
  focusRef?: any,
  isPhoneInput = false
) => {
  showAlertMessage(message, { type: "error" });

  if (focusRef) {
    // Alert가 표시된 후 해당 필드에 focus
    setTimeout(() => {
      if (isPhoneInput) {
        focusRef.value?.focusFirst?.();
      } else if (focusRef.value?.$el) {
        focusRef.value.$el.focus();
      } else if (focusRef.value?.focus) {
        focusRef.value.focus();
      }
    }, 100);
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
  const passwordError = getPasswordErrorMessage(formData.password);
  if (passwordError) {
    showValidationError(passwordError, passwordInputRef);
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
    showAlertMessage("회원가입이 완료되었습니다!");

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
    class="max-w-md mx-auto items-center justify-center py-12 sm:py-16 px-3 sm:px-4"
  >
    <div class="mb-4 sm:mb-6 text-center">
      <h2 class="text-heading text-primary mb-2 tracking-wider">회원가입</h2>
    </div>

    <!-- Production 환경: 준비중 안내 -->
    <Card v-if="isProduction" class="w-full bg-muted/5 dark:bg-card mx-auto">
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
    <Card v-else class="w-full bg-muted/5 dark:bg-card mx-auto">
      <CardContent class="px-4 sm:px-6 py-5 sm:py-6">
        <form @submit.prevent="handleSignup" class="grid gap-4 sm:gap-5">
          <div class="flex flex-col gap-1.5 mt-2">
            <Label for="email" class="text-body"
              >이메일 <span class="text-primary">*</span></Label
            >
            <div class="flex gap-1.5 sm:gap-2">
              <Input
                ref="emailInputRef"
                id="email"
                type="email"
                placeholder="example@email.com"
                v-model="formData.email"
                :disabled="verificationState.isVerified"
                @blur="checkEmailFormat"
                @keydown.enter.prevent="handleEmailEnter"
                class="text-caption sm:text-body"
              />
              <Button
                ref="verificationButtonRef"
                type="button"
                variant="outline"
                size="sm"
                @click="sendVerificationCode"
                :disabled="
                  verificationState.isVerified ||
                  verificationState.isLoading ||
                  !formData.email
                "
                class="h-10 px-2.5 sm:px-3 text-caption sm:text-body shrink-0 min-w-[4.5rem] sm:min-w-[7rem]"
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
              class="text-caption text-destructive"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>

          <div
            v-if="verificationState.isSent && !verificationState.isVerified"
            class="flex flex-col gap-1.5 animate-in slide-in-from-top-2"
          >
            <Label for="code" class="text-body">인증번호</Label>
            <div class="flex gap-1.5 sm:gap-2">
              <Input
                ref="verificationCodeInputRef"
                id="code"
                type="text"
                placeholder="인증번호 6자리"
                maxlength="6"
                v-model="verificationState.code"
                :disabled="verificationState.isVerifying"
                @keyup.enter="verifyCode"
                class="text-caption sm:text-body"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                class="h-10 px-2.5 sm:px-3 text-caption sm:text-body shrink-0 min-w-[4.5rem] sm:min-w-[7rem]"
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
              class="text-caption text-destructive"
            >
              {{ verificationState.errorMessage }}
            </p>
          </div>

          <Alert
            v-if="verificationState.isVerified"
            class="bg-green-50 text-primary border-green-200 py-2"
          >
            <CheckCircle2 class="h-4 w-4" />
            <AlertTitle class="ml-2 text-body font-medium"
              >이메일 인증 완료</AlertTitle
            >
          </Alert>

          <div class="flex flex-col gap-1.5">
            <Label for="password" class="text-body"
              >비밀번호 <span class="text-primary">*</span></Label
            >
            <Input
              ref="passwordInputRef"
              id="password"
              type="password"
              placeholder="8자 이상, 영문 대/소문자·숫자·특수문자 중 3가지 이상"
              v-model="formData.password"
              @keydown.enter.prevent="handlePasswordEnter"
              class="text-caption sm:text-body"
            />

            <!-- 비밀번호 강도 표시 -->
            <PasswordStrengthIndicator :password="formData.password" />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="confirmPassword" class="text-body"
              >비밀번호 확인 <span class="text-primary">*</span></Label
            >
            <Input
              ref="confirmPasswordInputRef"
              id="confirmPassword"
              type="password"
              placeholder="비밀번호 재입력"
              v-model="formData.confirmPassword"
              @keydown.enter.prevent="handleConfirmPasswordEnter"
              class="text-caption sm:text-body"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <Label for="userName" class="text-body"
              >이름 <span class="text-primary">*</span></Label
            >
            <Input
              ref="userNameInputRef"
              id="userName"
              type="text"
              placeholder="실명 입력"
              v-model="formData.userName"
              @keydown.enter.prevent="handleUserNameEnter"
              class="text-caption sm:text-body"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="phone" class="text-body"
              >휴대전화 <span class="text-primary">*</span></Label
            >
            <PhoneInput
              ref="phoneInputRef"
              v-model:phone1="formData.phone1"
              v-model:phone2="formData.phone2"
              v-model:phone3="formData.phone3"
              @enter="handlePhoneEnter"
            />
          </div>
          <div class="space-y-2">
            <Label class="text-body">주소</Label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <Input
                  v-model="formData.zipCode"
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
                v-model="formData.address"
                type="text"
                readonly
                placeholder="기본 주소"
                class="bg-muted text-caption sm:text-body"
              />
              <Input
                ref="detailAddressInputRef"
                v-model="formData.detailAddress"
                type="text"
                placeholder="상세 주소 입력"
                @keydown.enter.prevent="handleDetailAddressEnter"
                class="text-caption sm:text-body"
              />
            </div>
          </div>

          <div class="flex items-center space-x-2 mt-2">
            <input
              ref="emailOptInCheckboxRef"
              id="email-opt-in"
              type="checkbox"
              v-model="formData.emailOptIn"
              class="h-4 w-4 rounded border-border accent-primary focus:ring-primary"
              @keydown.enter.prevent="handleEmailOptInEnter"
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
            ref="signupButtonRef"
            type="submit"
            class="w-full mt-2"
            size="lg"
            :disabled="isSubmitting || !verificationState.isVerified"
          >
            <Loader2 v-if="isSubmitting" class="mr-2 h-4 w-4 animate-spin" />
            {{ isSubmitting ? "처리 중..." : "회원가입 완료" }}
          </Button>
        </form>
      </CardContent>
    </Card>

    <p v-if="!isProduction" class="text-center text-muted-foreground mt-4 text-caption sm:text-body px-2">
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

  </section>
</template>
