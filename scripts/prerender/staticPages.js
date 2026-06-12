// scripts/prerender/staticPages.js
// 정적 정책 페이지(이용약관/개인정보) 데이터 + 본문 주입

import { SITE_URL, POLICY_LASTMOD } from "./config.js";
import { escapeHtml } from "./utils.js";
import { injectMetaTags, injectAppBody } from "./meta.js";

export const STATIC_POLICY_PAGES = {
  terms: {
    title: "이용약관",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 서비스 이용, 주문, 결제, 배송, 환불 및 청약철회 기준을 안내합니다.",
    body: `
      <section class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold mb-4">이용약관</h2>
          <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
        </div>

        <section>
          <h3 class="text-xl font-semibold mb-3">사업자 정보</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>상호: 샤키샤키 아카이브</li>
            <li>대표자: 손유진</li>
            <li>주소: 경상남도 밀양시 부북면 덕곡2길 203-28</li>
            <li>사업자등록번호: 157-18-02463</li>
            <li>통신판매업 신고번호: 2025-경남밀양-210호</li>
            <li>연락처: 010-7347-4088 / 381611sug@naver.com</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">주문 및 결제</h3>
          <p class="text-body leading-relaxed">
            이용자는 상품 상세 정보, 가격, 배송비, 결제 금액을 확인한 뒤 구매를 신청합니다.
            결제 완료 후 주문이 접수되며, 상품 품절 또는 결제 오류 등 정상 이행이 어려운 경우 안내 후 취소 또는 환불 처리됩니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">배송</h3>
          <p class="text-body leading-relaxed">
            기본 배송비는 3,500원이며, 70,000원 이상 구매 시 무료배송입니다.
            제주 및 도서산간 지역은 추가 배송비 2,500원이 발생할 수 있습니다.
            결제 완료 후 최대 7일 이내 발송되며 지역 및 택배사 사정에 따라 추가 시간이 소요될 수 있습니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">반품 및 환불</h3>
          <p class="text-body leading-relaxed">
            상품 수령 후 7일 이내 반품 신청이 가능하며, 반품 신청 후 14일 이내 상품이 도착해야 환불 처리가 가능합니다.
            단순 변심 반품 시 배송비는 고객 부담이며, 상품 불량 또는 오배송의 경우 판매자가 배송비를 부담합니다.
            상품 훼손, 라벨 제거, 세탁, 착용 흔적이 있는 경우 반품 및 환불이 제한될 수 있습니다.
          </p>
        </section>
      </section>
    `,
  },
  privacy: {
    title: "개인정보 처리방침",
    lastmod: POLICY_LASTMOD,
    description:
      "샤키샤키 아카이브의 개인정보 수집, 이용, 보관, 제3자 제공 및 개인정보 보호책임자 정보를 안내합니다.",
    body: `
      <section class="space-y-8">
        <div>
          <h2 class="text-2xl font-bold mb-4">개인정보 처리방침</h2>
          <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
        </div>

        <section>
          <h3 class="text-xl font-semibold mb-3">개인정보 수집 및 이용</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>회원가입 및 관리: 이메일, 비밀번호, 닉네임, 소셜 계정 정보</li>
            <li>상품 주문 및 배송: 수령인명, 배송지 주소, 연락처, 결제 정보</li>
            <li>서비스 개선 및 보안: IP 주소, 쿠키, 서비스 이용 기록</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">보유 기간</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>회원 정보: 회원 탈퇴 시까지</li>
            <li>주문 및 결제 기록: 전자상거래법에 따라 5년</li>
            <li>소비자 불만 및 분쟁 처리 기록: 3년</li>
            <li>접속 기록: 통신비밀보호법에 따라 3개월</li>
          </ul>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">제3자 제공</h3>
          <p class="text-body leading-relaxed">
            상품 배송을 위해 배송업체에 수령인명, 주소, 연락처를 제공할 수 있으며,
            사이트 이용 통계 분석을 위해 Google Analytics 4를 사용할 수 있습니다.
            위 경우를 제외하고는 고객 동의 없이 개인정보를 제3자에게 제공하지 않습니다.
          </p>
        </section>

        <section>
          <h3 class="text-xl font-semibold mb-3">개인정보 보호책임자</h3>
          <ul class="list-disc pl-6 space-y-2 text-body">
            <li>성명: 손유진</li>
            <li>연락처: 010-7347-4088</li>
            <li>이메일: 381611sug@naver.com</li>
            <li>주소: 경상남도 밀양시 부북면 덕곡2길 203-28</li>
          </ul>
        </section>
      </section>
    `,
  },
};

export function injectStaticBodyHtml(html, pageKey) {
  const page = STATIC_POLICY_PAGES[pageKey];
  if (!page) return html;

  const canonicalUrl = `${SITE_URL}/${pageKey}`;
  const metaTags = `
    <title>${escapeHtml(page.title)} | 샤키샤키 아카이브</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <meta property="og:title" content="${escapeHtml(page.title)} | 샤키샤키 아카이브">
    <meta property="og:description" content="${escapeHtml(page.description)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="샤키샤키 아카이브">
    <meta property="og:locale" content="ko_KR">
    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="${escapeHtml(page.title)} | 샤키샤키 아카이브">
    <meta name="twitter:description" content="${escapeHtml(page.description)}">
  `.trim();

  const htmlWithMeta = injectMetaTags(html, metaTags);
  const bodyHtml = `
    <main class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
      ${page.body}
    </main>
  `.trim();

  return injectAppBody(htmlWithMeta, bodyHtml, `${pageKey} 본문`);
}
