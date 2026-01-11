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
  resolve: ((value: boolean | string | null) => void) | null;
  // prompt 모드 관련
  promptMode: boolean;
  promptValue: string;
  promptPlaceholder: string;
  promptRequired: string; // 필수 입력값 (예: "탈퇴")
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
  promptMode: false,
  promptValue: "",
  promptPlaceholder: "",
  promptRequired: "",
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

// Prompt Confirm 옵션 인터페이스
interface PromptConfirmOptions {
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  required?: string; // 필수 입력값
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
        resolve: resolve as ((value: boolean | string | null) => void),
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
   * 입력 필드가 있는 Confirm 다이얼로그
   * @param message 확인 메시지
   * @param options Prompt Confirm 옵션
   * @returns 확인: 입력값, 취소/실패: null
   */
  const showPromptConfirm = (
    message: string,
    options?: PromptConfirmOptions
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      alertState.value = {
        ...defaultState,
        show: true,
        message,
        confirmMode: true,
        promptMode: true,
        confirmVariant: options?.variant ?? "success",
        confirmText: options?.confirmText ?? "확인",
        cancelText: options?.cancelText ?? "취소",
        promptPlaceholder: options?.placeholder ?? "",
        promptRequired: options?.required ?? "",
        promptValue: "",
        resolve: resolve as ((value: boolean | string | null) => void),
      };
    });
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
      if (alertState.value.promptMode) {
        // Prompt 모드: 입력값 검증 후 반환
        const value = alertState.value.promptValue.trim();
        const required = alertState.value.promptRequired;

        // 필수 입력값이 설정되어 있고, 일치하지 않으면 에러 반환
        if (required && value !== required) {
          alertState.value.resolve(null);
        } else {
          alertState.value.resolve(value || null);
        }
      } else {
        // 일반 Confirm 모드
        alertState.value.resolve(true);
      }
    }
    closeAlert();
  };

  /**
   * Confirm 취소 버튼 핸들러
   */
  const handleCancel = () => {
    if (alertState.value.resolve) {
      if (alertState.value.promptMode) {
        alertState.value.resolve(null);
      } else {
        alertState.value.resolve(false);
      }
    }
    closeAlert();
  };

  /**
   * Prompt 입력값 업데이트
   */
  const updatePromptValue = (value: string) => {
    alertState.value.promptValue = value;
  };

  return {
    // 상태 (읽기 전용)
    alertState: readonly(alertState),
    // Alert 메서드
    showAlert,
    showConfirm,
    showDestructiveConfirm,
    showPromptConfirm,
    closeAlert,
    // Confirm 핸들러
    handleConfirm,
    handleCancel,
    updatePromptValue,
  };
}
