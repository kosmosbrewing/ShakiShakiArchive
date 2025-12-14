<script setup lang="ts">
// src/components/common/AddressForm.vue
// 배송지 입력 폼 컴포넌트

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

// 폼 필드 업데이트 헬퍼
const updateField = <K extends keyof ShippingFormData>(
  key: K,
  value: ShippingFormData[K]
) => {
  emit("update:form", { ...props.form, [key]: value });
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
  <div class="space-y-4">
    <!-- 받는사람 -->
    <div class="grid grid-cols-[120px_1fr] gap-4 items-center">
      <Label class="text-right">받는사람 <span class="text-destructive">*</span></Label>
      <div class="flex items-center gap-2">
        <Input
          :model-value="form.recipient"
          @update:model-value="updateField('recipient', String($event))"
          type="text"
          class="max-w-xs"
        />
        <Badge v-if="form.saveDefault" variant="secondary">
          기본 배송지
        </Badge>
      </div>
    </div>

    <!-- 주소 -->
    <div class="grid grid-cols-[120px_1fr] gap-4 items-start">
      <Label class="text-right pt-2">주소 <span class="text-destructive">*</span></Label>
      <div class="space-y-2">
        <div class="flex gap-2">
          <Input
            :model-value="form.zipCode"
            type="text"
            class="w-24 bg-muted"
            readonly
            placeholder="우편번호"
          />
          <Button type="button" variant="outline" size="sm" @click="emit('searchAddress')">
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
          :model-value="form.detailAddress"
          @update:model-value="updateField('detailAddress', String($event))"
          type="text"
          placeholder="상세 주소를 입력하세요"
        />
      </div>
    </div>

    <!-- 휴대전화 -->
    <div class="grid grid-cols-[120px_1fr] gap-4 items-center">
      <Label class="text-right">휴대전화 <span class="text-destructive">*</span></Label>
      <PhoneInput
        :phone1="form.phone1"
        :phone2="form.phone2"
        :phone3="form.phone3"
        @update:phone1="updateField('phone1', $event)"
        @update:phone2="updateField('phone2', $event)"
        @update:phone3="updateField('phone3', $event)"
      />
    </div>

    <!-- 배송 메시지 -->
    <div v-if="showDeliveryMessage" class="space-y-2">
      <select
        :value="form.message"
        @change="updateField('message', ($event.target as HTMLSelectElement).value)"
        class="w-full border border-border rounded p-3 text-sm bg-background text-foreground"
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
        :model-value="form.customMessage"
        @update:model-value="updateField('customMessage', String($event))"
        type="text"
        placeholder="배송 기사님께 전달할 메시지를 입력해주세요."
        maxlength="50"
      />
    </div>

    <!-- 기본 배송지 저장 체크박스 -->
    <div v-if="showSaveDefault" class="flex items-center space-x-2">
      <input
        type="checkbox"
        id="saveDefault"
        :checked="form.saveDefault"
        @change="updateField('saveDefault', ($event.target as HTMLInputElement).checked)"
        class="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <Label for="saveDefault" class="text-sm font-normal cursor-pointer text-muted-foreground">
        이 배송지를 기본 배송지로 저장
      </Label>
    </div>
  </div>
</template>
