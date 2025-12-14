// src/services/index.ts
// 외부 API 서비스 레이어

// 주소 검색 API
export {
  openAddressSearch,
  loadDaumPostcodeScript,
  formatAddressForForm,
  type AddressResult,
} from "./addressSearch";

// 결제 API
export {
  initTossPayments,
  requestTossPayment,
  confirmPayment,
  cancelPayment,
  getPaymentInfo,
  requestKakaoPay,
  approveKakaoPay,
  getPaymentMethodLabel,
  type PaymentMethod,
  type PaymentStatus,
  type PaymentRequest,
  type PaymentResponse,
  type PaymentConfirmRequest,
} from "./payment";

// 소셜 로그인 API
export {
  initKakaoSdk,
  loginWithKakao,
  handleKakaoCallback,
  loginWithNaver,
  handleNaverCallback,
  loginWithGoogle,
  handleGoogleCallback,
  unlinkSocialAccount,
  getProviderLabel,
  getProviderColor,
  type SocialProvider,
  type SocialUserInfo,
  type SocialAuthResponse,
} from "./socialAuth";
