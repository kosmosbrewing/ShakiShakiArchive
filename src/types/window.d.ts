// src/types/window.d.ts
// 전역 Window 타입 확장

declare global {
  interface Window {
    // 토스페이먼츠 SDK
    TossPayments?: any;

    // 네이버페이 SDK
    Naver?: any;
  }
}

export {};
