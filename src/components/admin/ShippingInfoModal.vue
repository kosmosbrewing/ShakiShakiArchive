<script setup lang="ts">
// 배송 정보 관리 모달 컴포넌트
import { ref, computed, watch, nextTick } from "vue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/common";
import { X, Truck, MapPin, Image as ImageIcon, AlertCircle, ShieldAlert } from "lucide-vue-next";
import { COURIER_COMPANIES } from "@/types/api";
import { formatOrderStatus } from "@/lib/formatters";
import { verifyPassword } from "@/lib/api";
import { AUTH_MESSAGES, ADMIN_MESSAGES } from "@/lib/messages";
import type { OrderItem, Order } from "@/types/api";

interface Props {
  open: boolean;
  orderItem: OrderItem | null;
  order: Order | null;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "save", data: { courierCompany: string; trackingNumber: string }): void;
}>();

// 상태 관리
const selectedCourier = ref<string>("");
const customCourier = ref<string>("");
const trackingNumber = ref<string>("");
const trackingNumberInput = ref<any>(null);
const customCourierInput = ref<any>(null);

// 비밀번호 인증 관련
const isAuthenticated = ref(false);
const password = ref<string>("");
const verifying = ref(false);
const authError = ref<string>("");
const passwordInput = ref<any>(null);

// "직접 입력" 상수
const CUSTOM_INPUT_VALUE = "직접 입력";

// 직접 입력 모드인지 확인
const isCustomCourier = computed(
  () => selectedCourier.value === CUSTOM_INPUT_VALUE,
);

// 최종 택배사 값 (직접 입력 시 customCourier 사용)
const finalCourierValue = computed(() => {
  return isCustomCourier.value ? customCourier.value : selectedCourier.value;
});

// 비밀번호 인증 처리
const handleVerifyPassword = async () => {
  if (!password.value.trim()) {
    authError.value = AUTH_MESSAGES.passwordRequired;
    return;
  }

  verifying.value = true;
  authError.value = "";

  try {
    const result = await verifyPassword(password.value);
    if (result.verified) {
      isAuthenticated.value = true;
      authError.value = "";
    } else {
      authError.value = AUTH_MESSAGES.passwordMismatch;
      password.value = "";
    }
  } catch (error: any) {
    authError.value = error.message || ADMIN_MESSAGES.passwordVerifyFailed;
    password.value = "";
  } finally {
    verifying.value = false;
  }
};

// Enter 키로 비밀번호 확인
const handlePasswordKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !verifying.value) {
    handleVerifyPassword();
  }
};

// Props 변경 시 초기화
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen && props.orderItem) {
      // 인증 상태 초기화
      isAuthenticated.value = false;
      password.value = "";
      authError.value = "";

      // 비밀번호 입력란에 포커스
      await nextTick();
      const pwInput = passwordInput.value?.$el || passwordInput.value;
      pwInput?.focus();

      trackingNumber.value = props.orderItem.trackingNumber || "";

      // courierCompany가 코드 형식이면 한글로 변환, 이미 한글이면 그대로 사용
      const courier = props.orderItem.courierCompany || "";
      const knownCouriers = Object.values(COURIER_COMPANIES);

      if (
        courier &&
        COURIER_COMPANIES[courier as keyof typeof COURIER_COMPANIES]
      ) {
        // 코드 형식 (예: "lotte" → "롯데택배")
        selectedCourier.value =
          COURIER_COMPANIES[courier as keyof typeof COURIER_COMPANIES];
        customCourier.value = "";
      } else if (courier && knownCouriers.includes(courier)) {
        // 이미 한글이고 알려진 택배사
        selectedCourier.value = courier;
        customCourier.value = "";
      } else if (courier) {
        // 직접 입력된 택배사
        selectedCourier.value = CUSTOM_INPUT_VALUE;
        customCourier.value = courier;
      } else {
        // 빈 값
        selectedCourier.value = "";
        customCourier.value = "";
      }
    } else {
      // 모달이 닫힐 때 초기화
      isAuthenticated.value = false;
      password.value = "";
      authError.value = "";
      trackingNumber.value = "";
      selectedCourier.value = "";
      customCourier.value = "";
    }
  },
);

// Select 값 변경 시 처리
watch(selectedCourier, async (newValue) => {
  if (!newValue || !props.open) return;

  await nextTick();

  if (newValue === CUSTOM_INPUT_VALUE) {
    // "직접 입력" 선택 시 직접 입력 필드로 포커스
    const input = customCourierInput.value?.$el || customCourierInput.value;
    input?.focus();
  } else {
    // 일반 택배사 선택 시 운송장 번호로 포커스
    const input = trackingNumberInput.value?.$el || trackingNumberInput.value;
    input?.focus();
  }
});

// 저장 버튼 활성화 조건
const canSave = computed(() => {
  if (props.loading) return false;

  // 직접 입력 모드일 때는 customCourier가 있어야 함
  if (isCustomCourier.value) {
    return customCourier.value.trim() !== "";
  }

  // 일반 모드일 때는 selectedCourier가 있어야 함
  return selectedCourier.value !== "";
});

// 택배사 목록 (한글 이름을 value로 사용)
const courierList = computed(() => {
  const standardCouriers = Object.values(COURIER_COMPANIES).map((label) => ({
    value: label,
    label,
  }));

  // "직접 입력" 옵션 추가
  return [
    ...standardCouriers,
    { value: CUSTOM_INPUT_VALUE, label: CUSTOM_INPUT_VALUE },
  ];
});

// 이벤트 핸들러
const handleSave = () => {
  if (!canSave.value) return;
  emit("save", {
    courierCompany: finalCourierValue.value,
    trackingNumber: trackingNumber.value,
  });
};

const handleClose = () => {
  if (props.loading) return;
  emit("close");
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open && orderItem && order"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <!-- 배경 오버레이 -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="handleClose"
        />

        <!-- 모달 카드 -->
        <Card class="relative z-10 w-full max-w-lg shadow-xl">
          <CardHeader class="pb-4">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2 bg-primary/10 rounded-full">
                  <Truck class="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle class="text-heading">배송 정보 관리</CardTitle>
                  <p class="text-caption text-muted-foreground mt-1">
                    운송장 정보를 등록하고 관리합니다
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                class="h-8 w-8 -mr-2 -mt-2"
                :disabled="loading"
                @click="handleClose"
              >
                <X class="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent class="space-y-6">
            <!-- 비밀번호 인증 화면 -->
            <div v-if="!isAuthenticated" class="py-6">
              <div class="flex flex-col items-center gap-6">
  

                <!-- 보안 안내 Alert -->
                <div class="w-full max-w-sm">
                  <div
                    class="flex gap-3 p-4 bg-primary/10 border border-primary/10 rounded-lg"
                  >
                    <ShieldAlert class="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div class="flex-1 space-y-1">
                      <h4 class="text-body font-semibold text-foreground">
                        관리자 인증 필요
                      </h4>
                      <p class="text-caption text-muted-foreground">
                        배송지 정보는 민감한 개인정보입니다.<br />계속하려면 현재 로그인한 계정의 비밀번호를 입력해주세요.
                      </p>
                    </div>
                  </div>
                </div>


                <div class="w-full max-w-sm space-y-3">
                  <div class="space-y-2">
                    <Label for="admin-password" class="text-body font-medium">
                      비밀번호
                    </Label>
                    <Input
                      id="admin-password"
                      ref="passwordInput"
                      v-model="password"
                      type="password"
                      placeholder="비밀번호를 입력하세요"
                      :disabled="verifying"
                      @keydown="handlePasswordKeydown"
                      class="w-full"
                    />
                  </div>

                  <!-- 에러 메시지 -->
                  <Transition name="slide">
                    <div
                      v-if="authError"
                      class="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg"
                    >
                      <AlertCircle class="w-4 h-4 text-destructive flex-shrink-0" />
                      <p class="text-caption text-destructive">
                        {{ authError }}
                      </p>
                    </div>
                  </Transition>

                  <Button
                    class="w-full bg-primary hover:bg-primary/80 font-medium"
                    :disabled="!password.trim() || verifying"
                    @click="handleVerifyPassword"
                  >
                    <LoadingSpinner
                      v-if="verifying"
                      variant="spinner"
                      size="sm"
                      color="white"
                      :center="false"
                      class="mr-2"
                    />
                    {{ verifying ? "확인 중..." : "확인" }}
                  </Button>
                </div>
              </div>
            </div>

            <!-- 배송 정보 입력 화면 (인증 후) -->
            <div v-else class="space-y-6">
            <!-- 상품 정보 -->
            <div class="p-4 bg-muted/30 rounded-lg border border-border">
              <div class="flex items-start justify-between gap-4">
                <div class="flex items-start gap-3 flex-1">
                  <!-- 상품 썸네일 -->
                  <div
                    class="h-16 w-16 bg-muted rounded-lg overflow-hidden border border-border shadow-sm flex-shrink-0"
                  >
                    <img
                      v-if="orderItem.product?.imageUrl"
                      :src="orderItem.product.imageUrl"
                      :alt="orderItem.productName"
                      class="h-full w-full object-cover"
                      crossorigin="anonymous"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-muted-foreground opacity-20"
                    >
                      <ImageIcon class="w-8 h-8" />
                    </div>
                  </div>

                  <!-- 상품명 및 옵션 -->
                  <div class="flex-1 min-w-0">
                    <p class="text-body font-medium text-foreground">
                      {{ orderItem.productName }}
                    </p>
                    <p
                      v-if="orderItem.options"
                      class="text-caption text-muted-foreground mt-1"
                    >
                      {{ orderItem.options }}
                    </p>
                  </div>
                </div>

                <!-- 상태 뱃지 (우측) -->
                <span
                  :class="[
                    'inline-flex items-center border rounded-lg px-2.5 py-1 text-caption font-bold whitespace-nowrap flex-shrink-0',
                    orderItem.status === 'preparing'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : orderItem.status === 'shipped'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : 'bg-muted text-muted-foreground border-border',
                  ]"
                >
                  {{ formatOrderStatus(orderItem.status) }}
                </span>
              </div>
            </div>

            <!-- 택배사 선택 -->
            <div class="space-y-2">
              <Label for="courier" class="text-body font-medium">
                택배사 선택
                <span class="text-destructive ml-1">*</span>
              </Label>
              <Select v-model="selectedCourier" :disabled="loading">
                <SelectTrigger id="courier" class="w-full">
                  <SelectValue placeholder="택배사를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="courier in courierList"
                    :key="courier.value"
                    :value="courier.value"
                  >
                    {{ courier.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- 택배사 직접 입력 (조건부 표시) -->
            <Transition name="slide">
              <div v-if="isCustomCourier" class="space-y-2">
                <Label for="custom-courier" class="text-body font-medium">
                  택배사명 입력
                  <span class="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="custom-courier"
                  ref="customCourierInput"
                  v-model="customCourier"
                  type="text"
                  placeholder="택배사명을 입력하세요 (예: 대한통운, 우체국택배)"
                  :disabled="loading"
                  class="w-full"
                />
              </div>
            </Transition>

            <!-- 운송장 번호 입력 -->
            <div class="space-y-2">
              <Label for="tracking" class="text-body font-medium">
                운송장 번호
              </Label>
              <Input
                id="tracking"
                ref="trackingNumberInput"
                v-model="trackingNumber"
                type="text"
                placeholder="운송장 번호를 입력하세요 (선택)"
                :disabled="loading"
                class="w-full font-mono"
              />
              <p class="text-caption text-muted-foreground">
                운송장 번호는 나중에 입력할 수 있습니다
              </p>
            </div>

            <!-- 배송지 정보 (마스킹 해제) -->
            <div
              class="space-y-2 p-4 bg-muted/20 rounded-lg border border-border"
            >
              <div class="flex items-center gap-2">
                <MapPin class="w-4 h-4 text-primary" />
                <h4 class="text-body font-bold text-foreground">배송지 정보</h4>
              </div>
              <div class="ml-6">
                <div class="flex items-center gap-2">
                  <span class="text-body font-semibold text-foreground">
                    {{ order.shippingName }}
                  </span>
                  <span class="text-body text-muted-foreground">
                    ({{ order.shippingPhone }})
                  </span>
                </div>
                <p class="text-body text-muted-foreground">
                  {{ order.shippingAddress }}
                </p>
                <p
                  v-if="order.shippingDetailAddress"
                  class="text-body text-muted-foreground"
                >
                  {{ order.shippingDetailAddress }}
                </p>
                <p class="text-caption text-muted-foreground pb-2">
                  우편번호: {{ order.shippingPostalCode }}
                </p>
                <p
                  v-if="order.shippingRequestNote"
                  class="text-caption text-muted-foreground pt-2 border-t border-border/50"
                >
                  <span class="font-medium">배송 요청사항:</span>
                  {{ order.shippingRequestNote }}
                </p>
              </div>
            </div>

            <!-- 버튼 영역 -->
            <div class="flex gap-3 pt-2">
              <Button
                variant="outline"
                class="flex-1 font-medium"
                :disabled="loading"
                @click="handleClose"
              >
                취소
              </Button>
              <Button
                class="flex-1 bg-primary hover:bg-primary/80 font-medium"
                :disabled="!canSave"
                @click="handleSave"
              >
                <LoadingSpinner
                  v-if="loading"
                  variant="spinner"
                  size="sm"
                  color="white"
                  :center="false"
                  class="mr-2"
                />
                {{ loading ? "저장 중..." : "저장하기" }}
              </Button>
            </div>
            </div>
            <!-- 배송 정보 입력 화면 끝 -->
          </CardContent>
        </Card>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.2s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
