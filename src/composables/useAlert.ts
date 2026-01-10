// src/composables/useAlert.ts
// 전역 Alert/Confirm 시스템을 위한 composable

import { ref, readonly } from "vue";
import type { AlertType } from "@/components/ui/alert";

// Confirm 변형 타입
type ConfirmVariant = "success" | "destructive";

// Alert 상태 인터페이스
interface AlertState {
  show: boolean;
  message: string;
  type: AlertType;
  duration: number;
  // confirm 모드 관련
  confirmMode: boolean;
  confirmVariant: ConfirmVariant;
  confirmText: string;
  cancelText: string;
  resolve: ((value: boolean) => void) | null;
}

// 기본 상태
const defaultState: AlertState = {
  show: false,
  message: "",
  type: "success",
  duration: 2000,
  confirmMode: false,
  confirmVariant: "success",
  confirmText: "확인",
  cancelText: "취소",
  resolve: null,
};

// 전역 상태 (싱글톤)
const alertState = ref<AlertState>({ ...defaultState });

// Alert 옵션 인터페이스
interface AlertOptions {
  type?: AlertType;
  duration?: number;
}

// Confirm 옵션 인터페이스
interface ConfirmOptions {
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
}

/**
 * 전역 Alert/Confirm 시스템 composable
 *
 * @example
 * // Alert 표시
 * const { showAlert } = useAlert();
 * showAlert("저장되었습니다.");
 * showAlert("오류가 발생했습니다.", { type: "error" });
 *
 * // Confirm 표시
 * const { showConfirm } = useAlert();
 * const confirmed = await showConfirm("삭제하시겠습니까?");
 * if (confirmed) {
 *   // 삭제 로직
 * }
 */
export function useAlert() {
  /**
   * Alert 메시지 표시
   * @param message 표시할 메시지
   * @param options Alert 옵션 (type, duration)
   */
  const showAlert = (message: string, options?: AlertOptions) => {
    // 이전 alert 닫기
    alertState.value = {
      ...defaultState,
      show: true,
      message,
      type: options?.type ?? "success",
      duration: options?.duration ?? 2000,
    };
  };

  /**
   * Confirm 다이얼로그 표시 (Promise 반환)
   * @param message 확인 메시지
   * @param options Confirm 옵션
   * @returns 확인: true, 취소: false
   */
  const showConfirm = (
    message: string,
    options?: ConfirmOptions
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      alertState.value = {
        ...defaultState,
        show: true,
        message,
        confirmMode: true,
        confirmVariant: options?.variant ?? "success",
        confirmText: options?.confirmText ?? "확인",
        cancelText: options?.cancelText ?? "취소",
        resolve,
      };
    });
  };

  /**
   * 삭제 확인용 Confirm (destructive 스타일)
   * @param message 확인 메시지
   * @param options Confirm 옵션
   */
  const showDestructiveConfirm = (
    message: string,
    options?: Omit<ConfirmOptions, "variant">
  ) => {
    return showConfirm(message, { ...options, variant: "destructive" });
  };

  /**
   * Alert 닫기
   */
  const closeAlert = () => {
    alertState.value = { ...defaultState };
  };

  /**
   * Confirm 확인 버튼 핸들러
   */
  const handleConfirm = () => {
    if (alertState.value.resolve) {
      alertState.value.resolve(true);
    }
    closeAlert();
  };

  /**
   * Confirm 취소 버튼 핸들러
   */
  const handleCancel = () => {
    if (alertState.value.resolve) {
      alertState.value.resolve(false);
    }
    closeAlert();
  };

  return {
    // 상태 (읽기 전용)
    alertState: readonly(alertState),
    // Alert 메서드
    showAlert,
    showConfirm,
    showDestructiveConfirm,
    closeAlert,
    // Confirm 핸들러
    handleConfirm,
    handleCancel,
  };
}
