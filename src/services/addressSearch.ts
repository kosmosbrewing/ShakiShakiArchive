// src/services/addressSearch.ts
// 주소 검색 API 서비스 (다음/카카오 주소 API)

import { useAlert } from "@/composables/useAlert";

/**
 * 주소 검색 결과 타입
 */
export interface AddressResult {
  zonecode: string; // 우편번호
  address: string; // 기본 주소
  addressEnglish: string; // 영문 주소
  addressType: "R" | "J"; // R: 도로명, J: 지번
  roadAddress: string; // 도로명 주소
  jibunAddress: string; // 지번 주소
  buildingName: string; // 건물명
  apartment: "Y" | "N"; // 아파트 여부
  sido: string; // 시/도
  sigungu: string; // 시/군/구
  bname: string; // 법정동/법정리
}

/**
 * 다음 우편번호 서비스 설정
 */
interface DaumPostcodeConfig {
  oncomplete: (data: AddressResult) => void;
  onclose?: () => void;
  width?: number;
  height?: number;
}

/**
 * 다음 우편번호 검색 서비스
 * @see https://postcode.map.daum.net/guide
 *
 * 사용 전 index.html에 스크립트 추가 필요:
 * <script src="//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
 */
export function openAddressSearch(
  onComplete: (result: AddressResult) => void,
  onClose?: () => void
): void {
  // 다음 우편번호 서비스 확인
  const daum = (window as any).daum;

  if (!daum?.Postcode) {
    const { showAlert } = useAlert();
    console.error(
      "다음 우편번호 서비스가 로드되지 않았습니다. index.html에 스크립트를 추가해주세요."
    );
    showAlert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    loadDaumPostcodeScript().then(() => {
      openAddressSearch(onComplete, onClose);
    });
    return;
  }

  const config: DaumPostcodeConfig = {
    oncomplete: (data: AddressResult) => {
      // 도로명 주소 우선, 없으면 지번 주소 사용
      const result: AddressResult = {
        ...data,
        address: data.roadAddress || data.jibunAddress,
      };
      onComplete(result);
    },
    onclose: onClose,
    width: 500,
    height: 600,
  };

  new daum.Postcode(config).open();
}

/**
 * 다음 우편번호 스크립트 동적 로드
 */
export function loadDaumPostcodeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // 이미 로드되어 있는 경우
    if ((window as any).daum?.Postcode) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("다음 우편번호 스크립트 로드 실패"));
    document.head.appendChild(script);
  });
}

/**
 * 주소 검색 결과를 폼 데이터 형식으로 변환
 */
export function formatAddressForForm(result: AddressResult) {
  return {
    zipCode: result.zonecode,
    address: result.address,
    buildingName: result.buildingName,
    sido: result.sido,
    sigungu: result.sigungu,
  };
}
