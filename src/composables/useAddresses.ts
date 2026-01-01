// src/composables/useAddresses.ts
// 배송지 관련 로직

import { ref, computed, reactive, onMounted, watch, type Ref } from "vue";
import {
  fetchDeliveryAddresses,
  createDeliveryAddress,
  updateDeliveryAddress,
  deleteDeliveryAddress,
} from "@/lib/api";
import { parsePhone } from "@/lib/formatters";
import type { DeliveryAddress, ShippingFormData, User } from "@/types/api";
import { useAlert } from "./useAlert";

/**
 * 배송지 CRUD
 */
export function useAddresses() {
  const addresses = ref<DeliveryAddress[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 기본 배송지 존재 여부
  const hasDefaultAddress = computed(() => {
    return addresses.value.some((addr) => addr.isDefault);
  });

  // 기본 배송지 가져오기
  const defaultAddress = computed(() => {
    return addresses.value.find((addr) => addr.isDefault) || addresses.value[0] || null;
  });

  // 배송지 목록 로드
  const loadAddresses = async () => {
    loading.value = true;
    error.value = null;
    try {
      addresses.value = await fetchDeliveryAddresses();
    } catch (e) {
      error.value = "배송지 목록 로드 실패";
      console.error("배송지 목록 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  // 배송지 추가
  const addAddress = async (addressData: Omit<DeliveryAddress, "id" | "userId" | "createdAt">) => {
    try {
      await createDeliveryAddress(addressData);
      await loadAddresses(); // 목록 갱신
      return true;
    } catch (e) {
      console.error("배송지 추가 실패:", e);
      return false;
    }
  };

  // 배송지 수정
  const editAddress = async (
    id: string | number,
    addressData: Partial<Omit<DeliveryAddress, "id" | "userId" | "createdAt">>
  ) => {
    try {
      await updateDeliveryAddress(id, addressData);
      await loadAddresses(); // 목록 갱신
      return true;
    } catch (e) {
      console.error("배송지 수정 실패:", e);
      return false;
    }
  };

  // 배송지 삭제
  const removeAddress = async (id: string | number, confirmMessage = "해당 배송지를 삭제하시겠습니까?") => {
    const { showDestructiveConfirm, showAlert } = useAlert();
    const confirmed = await showDestructiveConfirm(confirmMessage);
    if (!confirmed) return false;

    try {
      await deleteDeliveryAddress(id);
      // 타입 불일치 방지를 위해 문자열로 비교
      addresses.value = addresses.value.filter((addr) => String(addr.id) !== String(id));
      return true;
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : "삭제 실패";
      showAlert("삭제 실패: " + errorMessage, { type: "error" });
      return false;
    }
  };

  return {
    addresses,
    loading,
    error,
    hasDefaultAddress,
    defaultAddress,
    loadAddresses,
    addAddress,
    editAddress,
    removeAddress,
  };
}

/**
 * 배송지 폼 관리 (주문 페이지용)
 */
export function useShippingForm() {
  const form = reactive<ShippingFormData>({
    recipient: "",
    zipCode: "",
    address: "",
    detailAddress: "",
    phone1: "010",
    phone2: "",
    phone3: "",
    message: "",
    customMessage: "",
    saveDefault: true,
  });

  // 폼 유효성 검사
  const isValid = computed(() => {
    return (
      form.recipient.trim() !== "" &&
      form.phone2.trim() !== "" &&
      form.phone3.trim() !== "" &&
      form.address.trim() !== ""
    );
  });

  // 전체 전화번호
  const fullPhone = computed(() => {
    return `${form.phone1}-${form.phone2}-${form.phone3}`;
  });

  // 전체 주소
  const fullAddress = computed(() => {
    return `${form.address} ${form.detailAddress}`.trim();
  });

  // 최종 배송 메시지
  const finalRequestNote = computed(() => {
    return form.message === "self" ? form.customMessage : form.message;
  });

  // 폼 초기화
  const clearForm = () => {
    form.recipient = "";
    form.zipCode = "";
    form.address = "";
    form.detailAddress = "";
    form.phone1 = "010";
    form.phone2 = "";
    form.phone3 = "";
    form.message = "";
    form.customMessage = "";
    form.saveDefault = true;
  };

  // 배송지 데이터로 폼 채우기
  const fillFromAddress = (address: DeliveryAddress) => {
    form.recipient = address.recipient || "";
    form.zipCode = address.zipCode || "";
    form.address = address.address || "";
    form.detailAddress = address.detailAddress || "";
    form.saveDefault = address.isDefault || false;

    // 전화번호 파싱
    const phoneParts = parsePhone(address.phone || "");
    form.phone1 = phoneParts.part1;
    form.phone2 = phoneParts.part2;
    form.phone3 = phoneParts.part3;

    // 배송 메시지 처리
    const note = address.requestNote || "";
    const predefinedOptions = [
      "부재 시 문 앞에 놓아주세요",
      "배송 전 연락바랍니다",
      "경비실에 맡겨주세요",
    ];

    if (note && !predefinedOptions.includes(note)) {
      form.message = "self";
      form.customMessage = note;
    } else {
      form.message = note;
      form.customMessage = "";
    }
  };

  // 사용자 정보로 폼 채우기
  const fillFromUser = (user: User) => {
    form.recipient = user.userName || "";
    form.zipCode = user.zipCode || "";
    form.address = user.address || "";
    form.detailAddress = user.detailAddress || "";
    form.saveDefault = true;

    const phoneParts = parsePhone(user.phone || "");
    form.phone1 = phoneParts.part1;
    form.phone2 = phoneParts.part2;
    form.phone3 = phoneParts.part3;
  };

  return {
    form,
    isValid,
    fullPhone,
    fullAddress,
    finalRequestNote,
    clearForm,
    fillFromAddress,
    fillFromUser,
  };
}

/**
 * 배송지 선택 모드 관리 (주문 페이지용)
 */
export function useDeliveryMode(
  addresses: Ref<DeliveryAddress[]>,
  shippingForm: ReturnType<typeof useShippingForm>,
  user: Ref<User | null>
) {
  const deliveryMode = ref<"new" | "member" | "saved">("new");

  // 모드 변경 감시
  watch(deliveryMode, (newMode) => {
    if (newMode === "member" && user.value) {
      shippingForm.fillFromUser(user.value);
      shippingForm.form.saveDefault = true;
    } else if (newMode === "new") {
      shippingForm.clearForm();
    } else if (newMode === "saved") {
      const defaultAddr = addresses.value.find((a: DeliveryAddress) => a.isDefault) || addresses.value[0];
      if (defaultAddr) shippingForm.fillFromAddress(defaultAddr);
    }
  });

  // 초기 모드 설정
  const initializeMode = () => {
    const defaultAddr = addresses.value.find((a: DeliveryAddress) => a.isDefault);

    if (defaultAddr) {
      deliveryMode.value = "saved";
      shippingForm.fillFromAddress(defaultAddr);
    } else if (user.value) {
      deliveryMode.value = "member";
      shippingForm.fillFromUser(user.value);
    } else {
      deliveryMode.value = "new";
    }
  };

  // 특정 배송지 선택
  const selectAddress = (address: DeliveryAddress) => {
    deliveryMode.value = "saved";
    shippingForm.fillFromAddress(address);
  };

  return {
    deliveryMode,
    initializeMode,
    selectAddress,
  };
}

/**
 * 배송지 목록 자동 로드
 */
export function useAddressesWithAutoLoad() {
  const addressesData = useAddresses();

  onMounted(() => {
    addressesData.loadAddresses();
  });

  return addressesData;
}
