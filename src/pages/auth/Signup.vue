<script setup lang="ts">
import { ref, reactive, nextTick } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import {
  sendVerification,
  verifyEmail,
  getNaverLoginUrl,
  getKakaoLoginUrl,
} from "@/lib/api";
import { getPasswordErrorMessage } from "@/utils/password-validation";
import { validateEmail } from "@/utils/email-validation";
import { AUTH_MESSAGES } from "@/lib/messages";
import { CheckCircle2, Mail } from "lucide-vue-next";
import { PasswordStrengthIndicator, LoadingSpinner } from "@/components/common";
// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import Separator from "@/components/ui/separator/Separator.vue";

// Input refs
const emailInputRef = ref<InstanceType<typeof Input> | null>(null);
const verificationButtonRef = ref<InstanceType<typeof Button> | null>(null);
const verificationCodeInputRef = ref<InstanceType<typeof Input> | null>(null);
const passwordInputRef = ref<InstanceType<typeof Input> | null>(null);
const confirmPasswordInputRef = ref<InstanceType<typeof Input> | null>(null);
const userNameInputRef = ref<InstanceType<typeof Input> | null>(null);
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
    showValidationError(
      emailValidation.error || AUTH_MESSAGES.invalidEmailFormat,
      emailInputRef
    );
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

// 닉네임 필드에서 Enter 키 처리 (1자 이상일 때만 이동)
const handleUserNameEnter = (e: KeyboardEvent) => {
  // IME 조합 중이면 무시 (한글 입력 시 마지막 글자 중복 방지)
  if (e.isComposing) return;

  if (formData.userName.trim().length >= 1) {
    // nextTick을 사용하여 현재 키 이벤트가 완전히 끝난 후 포커스 이동
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

// 1. 회원가입 폼 데이터
const formData = reactive({
  email: "",
  password: "",
  confirmPassword: "",
  userName: "",
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
const isNaverLoading = ref(false); // 네이버 로그인 버튼 로딩 상태
const isKakaoLoading = ref(false); // 카카오 로그인 버튼 로딩 상태
const isProcessingAuth = ref(false); // 회원가입 후 자동 로그인 처리 중 (전체 화면 로딩)

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
    verificationState.errorMessage =
      emailValidation.error || AUTH_MESSAGES.invalidEmailMessage;
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
    verificationState.errorMessage =
      emailValidation.error || AUTH_MESSAGES.invalidEmailMessage;
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
      verificationState.errorMessage = AUTH_MESSAGES.emailAlreadyExists;
    } else {
      verificationState.errorMessage =
        error.message || AUTH_MESSAGES.emailVerificationFailed;
    }
  } finally {
    verificationState.isLoading = false;
  }
};

// 인증코드 확인
const verifyCode = async () => {
  if (!verificationState.code || verificationState.code.length !== 6) {
    verificationState.errorMessage = AUTH_MESSAGES.verificationCodeRequired;
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
      verificationState.errorMessage = AUTH_MESSAGES.invalidVerificationCode;
    }
  } catch (error: any) {
    verificationState.errorMessage =
      error.message || AUTH_MESSAGES.verificationCheckFailed;
  } finally {
    verificationState.isVerifying = false;
  }
};

// 유효성 검사 및 Alert 표시 헬퍼
const showValidationError = (message: string, focusRef?: any) => {
  showAlertMessage(message, { type: "error" });

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

const handleSignup = async () => {
  errorMessage.value = "";

  // 이메일 인증 확인
  if (!verificationState.isVerified) {
    showValidationError(AUTH_MESSAGES.emailVerificationRequired, emailInputRef);
    return;
  }

  // 비밀번호 검증
  if (!formData.password) {
    showValidationError(AUTH_MESSAGES.passwordRequired, passwordInputRef);
    return;
  }
  const passwordError = getPasswordErrorMessage(formData.password);
  if (passwordError) {
    showValidationError(passwordError, passwordInputRef);
    return;
  }
  if (!formData.confirmPassword) {
    showValidationError(
      AUTH_MESSAGES.confirmPasswordRequired,
      confirmPasswordInputRef
    );
    return;
  }
  if (formData.password !== formData.confirmPassword) {
    showValidationError(
      AUTH_MESSAGES.passwordMismatch,
      confirmPasswordInputRef
    );
    return;
  }

  // 닉네임 검증
  if (!formData.userName.trim()) {
    showValidationError(AUTH_MESSAGES.userNameRequired, userNameInputRef);
    return;
  }

  try {
    isSubmitting.value = true;

    // 1. 회원가입
    await authStore.register({
      email: formData.email,
      password: formData.password,
      userName: formData.userName,
      phone1: "",
      phone2: "",
      phone3: "",
      zipCode: "",
      address: "",
      detailAddress: "",
      emailOptIn: formData.emailOptIn,
    });

    // 2. 회원가입 성공 후 자동 로그인
    isSubmitting.value = false;
    isProcessingAuth.value = true; // 전체 화면 로딩 표시

    try {
      // 3. 자동 로그인
      await authStore.handleLogin({
        email: formData.email,
        password: formData.password,
      });

      // 4. 사용자 정보 로드
      await authStore.loadUser();

      // 5. 환영 메시지 설정
      const userName = authStore.user?.userName || "회원";
      authStore.setWelcomeMessage(`반가워요, ${userName}님!`);

      // 6. 홈으로 이동
      router.replace("/");
    } catch (loginError) {
      // 자동 로그인 실패 시 로그인 페이지로 이동
      console.error("자동 로그인 실패:", loginError);
      isProcessingAuth.value = false;
      showAlertMessage(AUTH_MESSAGES.signupRedirect);

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    }
  } catch (error: any) {
    console.error(error);
    errorMessage.value = error.message || AUTH_MESSAGES.signupFailed;
    isSubmitting.value = false;
  }
};

// 네이버 소셜 로그인 처리
const handleNaverLogin = () => {
  isNaverLoading.value = true;

  try {
    const naverLoginUrl = getNaverLoginUrl();
    window.location.href = naverLoginUrl;
  } catch (error) {
    console.error("네이버 로그인 URL 생성 실패:", error);
    showAlertMessage(AUTH_MESSAGES.naverLoginFailed, { type: "error" });
    isNaverLoading.value = false;
  }
};

// 카카오 소셜 로그인 처리
const handleKakaoLogin = () => {
  isKakaoLoading.value = true;

  try {
    const kakaoLoginUrl = getKakaoLoginUrl();
    window.location.href = kakaoLoginUrl;
  } catch (error) {
    console.error("카카오 로그인 URL 생성 실패:", error);
    showAlertMessage(AUTH_MESSAGES.kakaoLoginFailed, { type: "error" });
    isKakaoLoading.value = false;
  }
};
</script>

<template>
  <section
    id="signup"
    class="max-w-md mx-auto items-center justify-center py-12 sm:py-16 px-3 sm:px-4"
  >
    <div class="mb-4 sm:mb-6 text-center">
      <h3 class="text-heading text-primary tracking-wider mb-8">회원가입</h3>
      <!-- 구분선 -->
      <div class="relative my-1">
        <div class="absolute inset-0 flex items-center">
          <Separator></Separator>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-caption text-muted-foreground"
            >간편하게 시작하기</span
          >
        </div>
      </div>
    </div>

    <!-- 회원가입 폼 -->
    <div class="w-full mx-auto flex flex-col gap-4">
      <div class="px-4 sm:px-6 flex flex-col gap-4">
        <!-- 소셜 로그인 버튼 -->
        <Button
          type="button"
          variant="outline"
          size="lg"
          :class="['w-full', 'bg-[#03A94D] hover:bg-[#03A94D]/90 font-medium']"
          :disabled="isSubmitting || isNaverLoading || isKakaoLoading"
          @click="handleNaverLogin"
        >
          <LoadingSpinner
            v-if="isNaverLoading"
            variant="spinner"
            size="sm"
            color="white"
            :center="false"
          />

          <template v-else>
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
              <span class="text-base font-medium tracking-tight ml-2 text-white"
                >네이버 로그인</span
              >
            </div>
          </template>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          :class="[
            'w-full',
            'bg-[#FEE500] hover:bg-[#FEE500]/90 font-medium border-[#FEE500]',
          ]"
          :disabled="isSubmitting || isNaverLoading || isKakaoLoading"
          @click="handleKakaoLogin"
        >
          <LoadingSpinner
            v-if="isKakaoLoading"
            variant="spinner"
            size="sm"
            color="foreground"
            :center="false"
          />

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
              <span
                class="text-base font-medium tracking-tight ml-2 text-[#191919]"
                >카카오 로그인</span
              >
            </div>
          </template>
        </Button>
      </div>

      <!-- 구분선 -->
      <div class="relative my-1">
        <div class="absolute inset-0 flex items-center">
          <Separator></Separator>
        </div>
        <div class="relative flex justify-center text-xs uppercase">
          <span class="bg-background px-2 text-caption text-muted-foreground"
            >또는 이메일로 가입하기</span
          >
        </div>
      </div>

      <!-- 이메일 회원가입 카드 -->
      <Card class="w-full">
        <CardContent class="px-4 sm:px-6 py-5 sm:py-6">
          <form
            @submit.prevent="handleSignup"
            autocomplete="off"
            class="grid gap-4 sm:gap-5"
          >
            <div class="flex flex-col gap-1.5">
              <Label for="email" class="text-body"
                >이메일 <span class="text-primary">*</span></Label
              >
              <div class="flex gap-1.5 sm:gap-2">
                <Input
                  ref="emailInputRef"
                  id="email"
                  name="email"
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
                  class="w-28 shrink-0 h-10 font-medium"
                  @click="sendVerificationCode"
                  :disabled="
                    verificationState.isVerified ||
                    verificationState.isLoading ||
                    !formData.email
                  "
                >
                  <LoadingSpinner
                    v-if="verificationState.isLoading"
                    variant="spinner"
                    size="sm"
                    color="foreground"
                    :center="false"
                    class="mr-2"
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
                  size="sm"
                  class="w-28 shrink-0 h-10 font-medium"
                  @click="verifyCode"
                  :disabled="
                    verificationState.isVerifying ||
                    verificationState.code.length !== 6
                  "
                >
                  <LoadingSpinner
                    v-if="verificationState.isVerifying"
                    variant="spinner"
                    size="sm"
                    color="white"
                    :center="false"
                    class="mr-2"
                  />
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
              class="bg-primary text-primary-foreground border-0 py-2"
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
                name="password"
                type="password"
                autocomplete="new-password"
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
                name="confirm-password"
                type="password"
                autocomplete="new-password"
                placeholder="비밀번호 재입력"
                v-model="formData.confirmPassword"
                @keydown.enter.prevent="handleConfirmPasswordEnter"
                class="text-caption sm:text-body"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="userName" class="text-body"
                >닉네임 <span class="text-primary">*</span></Label
              >
              <Input
                ref="userNameInputRef"
                id="userName"
                name="name"
                type="text"
                placeholder="닉네임을 입력하세요"
                v-model="formData.userName"
                @keydown.enter.prevent="handleUserNameEnter($event)"
                class="text-caption sm:text-body"
              />
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

            <AlertDescription v-if="errorMessage">
              {{ errorMessage }}
            </AlertDescription>

            <Button
              ref="signupButtonRef"
              type="submit"
              class="w-full mt-2 font-bold hover:bg-primary/80"
              size="lg"
              :disabled="isSubmitting || !verificationState.isVerified"
            >
              <LoadingSpinner
                v-if="isSubmitting"
                variant="spinner"
                size="sm"
                color="white"
                :center="false"
                class="mr-2"
              />
              {{ isSubmitting ? "처리 중..." : "회원가입" }}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>

    <p
      class="text-center text-muted-foreground mt-4 text-caption sm:text-body px-2"
    >
      이미 계정이 있으신가요?
      <router-link to="/login" class="text-primary hover:underline font-medium"
        >로그인하기</router-link
      >
    </p>

    <!-- 회원가입 후 자동 로그인 처리 중 전체 화면 로딩 -->
    <LoadingSpinner
      v-if="isProcessingAuth"
      fullscreen
      variant="dots"
      size="lg"
      message="회원가입 처리 중..."
    />
  </section>
</template>
