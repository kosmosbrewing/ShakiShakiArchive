<script setup lang="ts">
// src/components/common/AddressForm.vue
// 배송지 입력 폼 컴포넌트

import { ref, nextTick } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PhoneInput from "./PhoneInput.vue";
import type { ShippingFormData } from "@/types/api";

interface Props {
  form: ShippingFormData;
  showSaveDefault?: boolean;
  showDeliveryMessage?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showSaveDefault: true,
  showDeliveryMessage: true,
});

const emit = defineEmits<{
  (e: "update:form", value: ShippingFormData): void;
  (e: "searchAddress"): void;
}>();

// Input refs
const recipientInputRef = ref<InstanceType<typeof Input> | null>(null);
const phoneInputRef = ref<InstanceType<typeof PhoneInput> | null>(null);
const addressButtonRef = ref<InstanceType<typeof Button> | null>(null);
const detailAddressInputRef = ref<InstanceType<typeof Input> | null>(null);
const deliveryMessageSelectRef = ref<HTMLSelectElement | null>(null);
const customMessageInputRef = ref<InstanceType<typeof Input> | null>(null);

// 한글 입력 중 여부 추적 (IME composing)
const isComposingRecipient = ref(false);
const isComposingDetailAddress = ref(false);

// 외부에서 특정 필드에 focus할 수 있도록 expose
const focusField = (field: "recipient" | "phone" | "address" | "detailAddress") => {
  switch (field) {
    case "recipient":
      recipientInputRef.value?.$el?.focus();
      break;
    case "phone":
      phoneInputRef.value?.focusFirst?.();
      break;
    case "address":
      (addressButtonRef.value?.$el as HTMLButtonElement)?.focus();
      break;
    case "detailAddress":
      detailAddressInputRef.value?.$el?.focus();
      break;
  }
};

defineExpose({ focusField });

// 폼 필드 업데이트 헬퍼
const updateField = <K extends keyof ShippingFormData>(
  key: K,
  value: ShippingFormData[K]
) => {
  emit("update:form", { ...props.form, [key]: value });
};

// 받는사람 필드 Enter 키 처리
const handleRecipientEnter = (event: KeyboardEvent) => {
  // 한글 입력 중이면 무시
  if (isComposingRecipient.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  nextTick(() => {
    // 우편번호가 있으면 상세주소로, 없으면 주소검색 버튼으로 이동
    if (props.form.zipCode) {
      detailAddressInputRef.value?.$el?.focus();
    } else {
      (addressButtonRef.value?.$el as HTMLButtonElement)?.focus();
    }
  });
};

// 휴대전화 마지막 입력 후 처리
const handlePhoneEnter = () => {
  // showDeliveryMessage가 true이면 배송 메시지 Select로 이동
  if (props.showDeliveryMessage) {
    nextTick(() => {
      deliveryMessageSelectRef.value?.focus();
    });
  }
};

// 배송 메시지 Select에서 Enter 키 처리
const handleDeliveryMessageEnter = (event: KeyboardEvent) => {
  event.preventDefault();
  event.stopPropagation();

  // "직접 입력" 선택 시 직접입력 Input으로 focus
  if (props.form.message === 'self') {
    nextTick(() => {
      customMessageInputRef.value?.$el?.focus();
    });
  }
};

// 상세주소 필드 Enter 키 처리
const handleDetailAddressEnter = (event: KeyboardEvent) => {
  // 한글 입력 중이면 무시
  if (isComposingDetailAddress.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  nextTick(() => {
    phoneInputRef.value?.focusFirst();
  });
};

// 배송 메시지 Select 변경 처리 (선택 시 자동 포커스)
const handleDeliveryMessageChange = async (value: string) => {
  updateField('message', value);

  // "직접 입력" 선택 시 자동으로 직접입력 Input으로 focus
  if (value === 'self') {
    await nextTick(); // DOM 업데이트 대기
    customMessageInputRef.value?.$el?.focus();
  }
};

// 배송 메시지 옵션
const deliveryMessageOptions = [
  { value: "", label: "-- 배송 메시지 선택 (선택사항) --" },
  { value: "부재 시 문 앞에 놓아주세요", label: "부재 시 문 앞에 놓아주세요" },
  { value: "배송 전 연락바랍니다", label: "배송 전 연락바랍니다" },
  { value: "경비실에 맡겨주세요", label: "경비실에 맡겨주세요" },
  { value: "self", label: "직접 입력" },
];
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <!-- 받는사람 -->
    <div class="space-y-2 sm:grid sm:grid-cols-[100px_1fr] sm:gap-3 sm:items-center sm:space-y-0">
      <Label class="text-left text-body sm:text-body"
        >받는사람 <span class="text-destructive">*</span></Label
      >
      <div class="flex items-center gap-2 flex-wrap">
        <Input
          ref="recipientInputRef"
          :model-value="form.recipient"
          @update:model-value="updateField('recipient', String($event))"
          @compositionstart="isComposingRecipient = true"
          @compositionend="isComposingRecipient = false"
          @keydown.enter="handleRecipientEnter"
          type="text"
          class="flex-1 min-w-0"
        />
        <Badge v-if="form.saveDefault" variant="secondary" class="shrink-0"> 기본 배송지 </Badge>
      </div>
    </div>

    <!-- 주소 -->
    <div class="space-y-2 sm:grid sm:grid-cols-[100px_1fr] sm:gap-3 sm:items-start sm:space-y-0">
      <Label class="text-left text-body sm:text-body sm:pt-2"
        >주소 <span class="text-destructive">*</span></Label
      >
      <div class="space-y-2">
        <div class="flex gap-2">
          <Input
            :model-value="form.zipCode"
            type="text"
            class="w-20 sm:w-24 bg-muted text-caption sm:text-body"
            readonly
            placeholder="우편번호"
          />
          <Button
            ref="addressButtonRef"
            type="button"
            variant="outline"
            size="sm"
            class="h-10 px-3 text-caption sm:text-body shrink-0 font-medium"
            @click="emit('searchAddress')"
            @keydown.enter="(e) => { e.preventDefault(); e.stopPropagation(); emit('searchAddress'); }"
          >
            주소검색
          </Button>
        </div>
        <Input
          :model-value="form.address"
          type="text"
          readonly
          placeholder="기본 주소"
          class="bg-muted"
        />
        <Input
          ref="detailAddressInputRef"
          :model-value="form.detailAddress"
          @update:model-value="updateField('detailAddress', String($event))"
          @compositionstart="isComposingDetailAddress = true"
          @compositionend="isComposingDetailAddress = false"
          @keydown.enter="handleDetailAddressEnter"
          type="text"
          placeholder="상세 주소를 입력하세요"
        />
      </div>
    </div>

    <!-- 휴대전화 -->
    <div class="space-y-2 sm:grid sm:grid-cols-[100px_1fr] sm:gap-3 sm:items-center sm:space-y-0">
      <Label class="text-left text-body sm:text-body"
        >휴대전화 <span class="text-destructive">*</span></Label
      >
      <PhoneInput
        ref="phoneInputRef"
        :phone1="form.phone1"
        :phone2="form.phone2"
        :phone3="form.phone3"
        @update:phone1="updateField('phone1', $event)"
        @update:phone2="updateField('phone2', $event)"
        @update:phone3="updateField('phone3', $event)"
        @enter="handlePhoneEnter"
      />
    </div>

    <!-- 배송 메시지 -->
    <div v-if="showDeliveryMessage" class="space-y-2">
      <select
        ref="deliveryMessageSelectRef"
        :value="form.message"
        @change="
          handleDeliveryMessageChange(($event.target as HTMLSelectElement).value)
        "
        @keydown.enter="handleDeliveryMessageEnter"
        class="w-full border border-border rounded p-2.5 sm:p-3 text-caption sm:text-body bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option
          v-for="opt in deliveryMessageOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <Input
        v-if="form.message === 'self'"
        ref="customMessageInputRef"
        :model-value="form.customMessage"
        @update:model-value="updateField('customMessage', String($event))"
        type="text"
        placeholder="배송 기사님께 전달할 메시지를 입력해주세요."
        maxlength="50"
        class="text-caption sm:text-body"
      />
    </div>

    <!-- 기본 배송지 저장 -->
    <div v-if="showSaveDefault" class="flex items-center space-x-2 pt-1">
      <input
        type="checkbox"
        id="saveDefault"
        :checked="form.saveDefault"
        @change="
          updateField(
            'saveDefault',
            ($event.target as HTMLInputElement).checked
          )
        "
        class="h-4 w-4 sm:h-4.5 sm:w-4.5 rounded border-border accent-primary focus:ring-primary cursor-pointer"
      />
      <Label
        for="saveDefault"
        class="text-caption sm:text-body font-normal cursor-pointer text-muted-foreground"
      >
        이 배송지를 기본 배송지로 저장
      </Label>
    </div>
  </div>
</template>
