/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "vue-router";

// ------------------------------------------------------------------
// 네이버페이 SDK 전역 타입 선언
// ------------------------------------------------------------------

/** 네이버페이 상품 아이템 */
interface NaverPayProductItem {
  /** 카테고리 타입 (ETC, PRODUCT 등) */
  categoryType: string;
  /** 카테고리 ID */
  categoryId: string;
  /** 상품 고유 ID */
  uid: string;
  /** 상품명 */
  name: string;
  /** 수량 */
  count: number;
}

/** 네이버페이 결제창 호출 파라미터 */
interface NaverPayOpenParams {
  /** 가맹점 주문번호 */
  merchantPayKey: string;
  /** 사용자 식별키 (암호화 권장) */
  merchantUserKey: string;
  /** 상품명 (128자 이내) */
  productName: string;
  /** 총 상품 수량 */
  productCount: number;
  /** 총 결제 금액 */
  totalPayAmount: number;
  /** 과세 금액 */
  taxScopeAmount: number;
  /** 면세 금액 */
  taxExScopeAmount: number;
  /** 결제 완료 후 리다이렉트 URL */
  returnUrl: string;
  /** 상품 정보 배열 (필수) */
  productItems: NaverPayProductItem[];
}

/** 네이버페이 SDK 인스턴스 */
interface NaverPayInstance {
  /** 결제창 호출 */
  open: (params: NaverPayOpenParams) => void;
  /** 결제창 닫기 */
  close: () => void;
}

/** 네이버페이 SDK 생성 옵션 */
interface NaverPayCreateOptions {
  /** 환경 모드 */
  mode: "development" | "production";
  /** 클라이언트 ID */
  clientId: string;
  /** 체인 ID (merchantId) */
  chainId: string;
  /** 결제 타입 */
  payType: "normal" | "recurrent";
  /** 결제창 오픈 방식 (popup: 모달/팝업, page: 리다이렉트) */
  openType?: "popup" | "page";
}

/** 전역 Window 확장 */
declare global {
  interface Window {
    Naver: {
      Pay: {
        create: (config: NaverPayCreateOptions) => NaverPayInstance;
      };
    };
  }
}

export {};
