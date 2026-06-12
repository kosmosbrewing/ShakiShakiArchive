// scripts/prerender/faq.js
// FAQ 페이지 정적 본문 생성 (JS 미실행 크롤러용)

import { escapeHtml } from "./utils.js";
import { injectAppBody, toJsonLdList } from "./meta.js";

/**
 * FAQ JSON-LD 엔트리 추출
 */
export function extractFaqEntries(seoData) {
  const jsonLdList = toJsonLdList(seoData);
  const faqPage = jsonLdList.find((node) => node?.["@type"] === "FAQPage");
  const entities = Array.isArray(faqPage?.mainEntity) ? faqPage.mainEntity : [];

  return entities
    .map((item) => ({
      question: String(item?.name || "").trim(),
      answer: String(item?.acceptedAnswer?.text || "").trim(),
    }))
    .filter((item) => item.question && item.answer);
}

/**
 * FAQ 본문 HTML 생성
 */
function generateFaqBodyHtml(seoData) {
  const faqEntries = extractFaqEntries(seoData);
  if (faqEntries.length === 0) return "";

  // 인덱스 기반 ID 배열: FAQ.vue의 FAQ_ANCHORS, seo.ts의 FAQ_ENTRIES와 순서 동기화
  // 질문 텍스트가 아닌 순서로 매핑하므로 질문 문구 변경 시에도 앵커 ID가 유지됨
  const FAQ_ANCHOR_IDS = [
    "faq-shipping-fee",
    "faq-shipping-time",
    "faq-return-refund",
    "faq-return-shipping-fee",
    "faq-address-change",
    "faq-refund-time",
  ];

  const itemsHtml = faqEntries
    .map((item, index) => {
      const id = FAQ_ANCHOR_IDS[index] || `faq-item-${String(index + 1)}`;
      const answerHtml = escapeHtml(item.answer).replace(/\n/g, "<br>");

      return `
        <article id="${escapeHtml(id)}" class="border-b border-border py-4">
          <h4 class="text-body font-semibold mb-2">${escapeHtml(item.question)}</h4>
          <p class="text-body text-muted-foreground whitespace-pre-line">${answerHtml}</p>
        </article>
      `.trim();
    })
    .join("\n");

  return `
    <main class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <section class="mb-16" aria-labelledby="faq-title">
        <div class="text-center mb-8">
          <h2 id="faq-title" class="text-heading text-primary mb-2 tracking-wider">FAQ</h2>
          <h3 class="text-heading">자주 묻는 질문</h3>
        </div>

        <div class="w-full">
          ${itemsHtml}
        </div>

        <p class="text-center pt-4 text-muted-foreground">
          찾으시는 답변이 없으신가요?
          <a href="/inquiry" class="text-primary hover:underline font-medium">문의 내역 보기</a>
        </p>
      </section>
    </main>
  `.trim();
}

/**
 * FAQ 페이지 body(#app)에 정적 FAQ 콘텐츠 주입
 */
export function injectFaqBodyHtml(html, seoData) {
  return injectAppBody(html, generateFaqBodyHtml(seoData), "FAQ 본문");
}
