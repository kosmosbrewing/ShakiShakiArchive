// src/composables/useNaverPayOrder.ts
// 네이버페이 주문형 관련 Composable

import { ref, computed, onMounted } from "vue";
import {
  getNaverPayOrderSdkConfig,
  registerNaverPayOrder,
  addNaverPayWishlist,
} from "@/lib/api";
import type {
  NaverPayOrderSdkConfigResponse,
  NaverPayOrderRegisterRequest,
  NaverPayCartItem,
} from "@/types/api";

// 네이버페이 주문형 SDK 타입 선언
declare global {
  interface Window {
    naver?: {
      NaverPayButton?: {
        apply: (config: NaverPayButtonConfig) => void;
      };
    };
  }
}

// 네이버페이 버튼 설정 타입
interface NaverPayButtonConfig {
  BUTTON_KEY: string;
  TYPE: "A" | "B" | "C" | "D" | "MA" | "MB"; // 버튼 타입
  COLOR: 1 | 2 | 3 | 4 | 5; // 버튼 색상
  COUNT?: 1 | 2; // 1: 상품 상세, 2: 장바구니
  ENABLE: "Y" | "N";
  EMBED_ID?: string; // 버튼을 삽입할 요소 ID
  BUY_BUTTON_HANDLER?: () => void; // 구매 버튼 클릭 핸들러
  WISHLIST_BUTTON_HANDLER?: () => void; // 찜 버튼 클릭 핸들러 (TYPE A/B만)
  "BUY_BUTTON_LINK_URL"?: string; // 구매 버튼 링크 (핸들러 대신 사용)
  "WISHLIST_BUTTON_LINK_URL"?: string; // 찜 버튼 링크 (핸들러 대신 사용)
}

// 네이버페이 주문형 SDK 설정
export function useNaverPayOrder() {
  const config = ref<NaverPayOrderSdkConfigResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isEnabled = computed(() => config.value?.isEnabled ?? false);
  const sdkLoaded = ref(false);

  // SDK 설정 로드
  const loadConfig = async () => {
    loading.value = true;
    error.value = null;
    try {
      config.value = await getNaverPayOrderSdkConfig();
    } catch (e: any) {
      error.value = e.message || "네이버페이 설정 로드 실패";
      console.error("네이버페이 주문형 설정 로드 실패:", e);
    } finally {
      loading.value = false;
    }
  };

  // 네이버페이 SDK 스크립트 로드
  const loadSdk = async () => {
    if (sdkLoaded.value) return;

    // window.naver.NaverPayButton이 이미 존재하면 (index.html에서 로드됨) 스킵
    if (window.naver?.NaverPayButton) {
      sdkLoaded.value = true;
      return;
    }

    // 이미 로드된 경우 스킵
    if (document.getElementById("naverpay-order-sdk")) {
      sdkLoaded.value = true;
      return;
    }

    // 설정이 로드되어 있어야 함
    if (!config.value) {
      throw new Error("네이버페이 설정이 로드되지 않았습니다. loadConfig()를 먼저 호출하세요.");
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.id = "naverpay-order-sdk";
      // 모바일/PC 분기 처리 - 백엔드에서 받은 URL 사용
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      script.src = isMobile
        ? config.value!.buttonScriptUrlMobile
        : config.value!.buttonScriptUrl;
      script.async = true;
      script.onload = () => {
        sdkLoaded.value = true;
        resolve();
      };
      script.onerror = () => {
        reject(new Error("네이버페이 SDK 로드 실패"));
      };
      document.head.appendChild(script);
    });
  };


  // 네이버페이 버튼 렌더링
  const renderButton = (options: {
    containerId: string;
    buttonType: "A" | "B" | "C" | "D" | "MA" | "MB";
    buttonColor?: 1 | 2 | 3 | 4 | 5;
    count?: 1 | 2; // 1: 상품 상세 (바로구매), 2: 장바구니
    onBuy: () => void;
    onWishlist?: () => void;
  }) => {
    if (!config.value?.buttonKey) {
      if (import.meta.env.DEV) {
        console.error("네이버페이 버튼 키가 없습니다");
      }
      return;
    }

    if (!window.naver?.NaverPayButton) {
      if (import.meta.env.DEV) {
        console.error("네이버페이 SDK가 로드되지 않았습니다");
      }
      return;
    }

    const buttonConfig: NaverPayButtonConfig = {
      BUTTON_KEY: config.value.buttonKey,
      TYPE: options.buttonType,
      COLOR: options.buttonColor || 1,
      COUNT: options.count,
      ENABLE: "Y",
      EMBED_ID: options.containerId,
      BUY_BUTTON_HANDLER: options.onBuy,
    };

    // 찜 버튼 핸들러 (TYPE A, B만 지원)
    if (options.onWishlist && ["A", "B"].includes(options.buttonType)) {
      buttonConfig.WISHLIST_BUTTON_HANDLER = options.onWishlist;
    }

    window.naver.NaverPayButton.apply(buttonConfig);
  };

  // 네이버페이 주문형 주문 등록 (바로 구매)
  const registerOrder = async (params: {
    productId: string;
    variantId?: string;
    quantity?: number;
  }) => {
    if (!config.value) {
      throw new Error("네이버페이 설정이 로드되지 않았습니다");
    }

    const request: NaverPayOrderRegisterRequest = {
      type: "PRODUCT",
      productId: params.productId,
      variantId: params.variantId,
      quantity: params.quantity || 1,
    };

    const response = await registerNaverPayOrder(request);
    return response;
  };

  // 네이버페이 주문형 장바구니 주문 등록
  // guestCartItems: 비회원일 경우 localStorage에서 가져온 장바구니 아이템
  const registerCartOrder = async (guestCartItems?: NaverPayCartItem[]) => {
    if (!config.value) {
      throw new Error("네이버페이 설정이 로드되지 않았습니다");
    }

    const request: NaverPayOrderRegisterRequest = {
      type: "CART",
    };

    // 비회원: 장바구니 아이템 데이터 추가 (가격은 백엔드에서 DB 조회)
    if (guestCartItems && guestCartItems.length > 0) {
      request.cartItems = guestCartItems;
    }
    // 회원: cartItems 없이 전송 → 백엔드에서 세션 기반 장바구니 조회

    const response = await registerNaverPayOrder(request);
    return response;
  };

  // 네이버페이 위시리스트 등록
  const addToWishlist = async (productId: string) => {
    const response = await addNaverPayWishlist({ productId });
    return response;
  };

  // 네이버페이 주문서 열기 (백엔드에서 반환한 URL 사용)
  // PC: 팝업 (화면 중앙 배치), 모바일: 리다이렉트
  const openNaverPayOrder = (orderPageUrl: string) => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (mobile) {
      // 모바일: 페이지 전환
      window.location.href = orderPageUrl;
    } else {
      // PC: 팝업으로 호출 (720x930, 화면 중앙 배치)
      const width = 720;
      const height = 930;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      window.open(
        orderPageUrl,
        "naverPayPopup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
    }
  };

  return {
    config,
    loading,
    error,
    isEnabled,
    sdkLoaded,
    loadConfig,
    loadSdk,
    renderButton,
    registerOrder,
    registerCartOrder,
    addToWishlist,
    openNaverPayOrder,
  };
}

// 네이버페이 버튼 자동 초기화 훅 (상품 상세용)
export function useNaverPayProductButton(options: {
  containerId: string;
  productId: () => string;
  variantId?: () => string | undefined;
  quantity?: () => number;
  onError?: (message: string) => void;
  onWishlistSuccess?: () => void;
}) {
  const naverPay = useNaverPayOrder();
  const isInitialized = ref(false);

  const initButton = async () => {
    if (isInitialized.value) return;

    try {
      // 1. 설정 로드
      await naverPay.loadConfig();
      if (!naverPay.isEnabled.value) {
        console.log("네이버페이 주문형이 비활성화되어 있습니다");
        return;
      }

      // 2. SDK 로드
      await naverPay.loadSdk();

      // 3. 버튼 렌더링
      naverPay.renderButton({
        containerId: options.containerId,
        buttonType: "C", // C: 구매하기 버튼만 (PC용)
        buttonColor: 1, // 기본 초록색
        count: 2, // 상품 상세 페이지
        onBuy: async () => {
          try {
            const response = await naverPay.registerOrder({
              productId: options.productId(),
              variantId: options.variantId?.(),
              quantity: options.quantity?.() || 1,
            });
            naverPay.openNaverPayOrder(response.orderPageUrl);
          } catch (e: any) {
            options.onError?.(e.message || "주문 등록에 실패했습니다");
          }
        },
        onWishlist: async () => {
          try {
            await naverPay.addToWishlist(options.productId());
            options.onWishlistSuccess?.();
          } catch (e: any) {
            options.onError?.(e.message || "찜하기에 실패했습니다");
          }
        },
      });

      isInitialized.value = true;
    } catch (e: any) {
      console.error("네이버페이 버튼 초기화 실패:", e);
      options.onError?.(e.message || "네이버페이 초기화에 실패했습니다");
    }
  };

  onMounted(() => {
    // 약간의 딜레이 후 초기화 (DOM 렌더링 보장)
    setTimeout(initButton, 100);
  });

  return {
    ...naverPay,
    isInitialized,
    reinitialize: initButton,
  };
}

// 네이버페이 버튼 자동 초기화 훅 (장바구니용)
export function useNaverPayCartButton(options: {
  containerId: string;
  onError?: (message: string) => void;
}) {
  const naverPay = useNaverPayOrder();
  const isInitialized = ref(false);

  const initButton = async () => {
    if (isInitialized.value) return;

    try {
      // 1. 설정 로드
      await naverPay.loadConfig();
      if (!naverPay.isEnabled.value) {
        console.log("네이버페이 주문형이 비활성화되어 있습니다");
        return;
      }

      // 2. SDK 로드
      await naverPay.loadSdk();

      // 3. 버튼 렌더링
      naverPay.renderButton({
        containerId: options.containerId,
        buttonType: "C", // C: 구매하기 버튼만
        buttonColor: 1, // 기본 초록색
        count: 1, // 장바구니 페이지
        onBuy: async () => {
          try {
            const response = await naverPay.registerCartOrder();
            naverPay.openNaverPayOrder(response.orderPageUrl);
          } catch (e: any) {
            options.onError?.(e.message || "주문 등록에 실패했습니다");
          }
        },
      });

      isInitialized.value = true;
    } catch (e: any) {
      console.error("네이버페이 버튼 초기화 실패:", e);
      options.onError?.(e.message || "네이버페이 초기화에 실패했습니다");
    }
  };

  onMounted(() => {
    // 약간의 딜레이 후 초기화 (DOM 렌더링 보장)
    setTimeout(initButton, 100);
  });

  return {
    ...naverPay,
    isInitialized,
    reinitialize: initButton,
  };
}
