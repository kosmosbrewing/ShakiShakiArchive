<script setup lang="ts">
// src/pages/static/Notice.vue
// 구매 전 안내 페이지

import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  window.scrollTo({ top: 0, behavior: "instant" });
  document.documentElement.classList.add("scroll-smooth");
});

onUnmounted(() => {
  document.documentElement.classList.remove("scroll-smooth");
});
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16">
    <div class="mb-8">
      <h1 class="text-3xl font-extrabold mb-5 text-primary tracking-wider">
        notice
      </h1>
      <div class="space-y-3 text-body leading-relaxed text-muted-foreground">
        <p>
          shaki shaki archive의 모든 상품은 한 점짜리 빈티지 세트 상품입니다.
        </p>
        <p>
          상품마다 구성, 실측, 컨디션이 모두 다르므로<br />
          구매 전 상세 이미지와 안내 사항을 충분히 확인해주세요.
        </p>
      </div>
    </div>

    <nav class="bg-muted/30 rounded-lg p-6 mb-10">
      <h2 class="text-lg font-semibold mb-4">목차</h2>
      <ol class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body">
        <li>
          <a href="#delivery" class="text-primary hover:underline">
            ✦ delivery
          </a>
        </li>
        <li>
          <a href="#exchange-return" class="text-primary hover:underline">
            ✦ exchange / return
          </a>
        </li>
        <li>
          <a href="#difficult-to-return" class="text-primary hover:underline">
            ✦ difficult to return
          </a>
        </li>
        <li>
          <a href="#vintage-guide" class="text-primary hover:underline">
            ✦ vintage guide
          </a>
        </li>
        <li>
          <a href="#set-item-only" class="text-primary hover:underline">
            ✦ set item only
          </a>
        </li>
        <li>
          <a href="#size-color-care" class="text-primary hover:underline">
            ✦ size / color / care
          </a>
        </li>
      </ol>
    </nav>

    <div class="space-y-12">
      <section id="delivery" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">✦ delivery</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            결제 완료 후 1–3영업일 내 발송을 원칙으로 합니다.<br />
            검수 및 포장 상황에 따라 최대 7일 이내 발송될 수 있습니다.
          </p>
          <p>
            제주 및 도서산간 지역은 추가 배송비가 발생할 수 있으며,<br />
            배송일이 1–2일 더 소요될 수 있습니다.
          </p>
          <p>
            배송 조회는 마이페이지 &gt; 주문/배송 관리에서 확인 가능합니다.
          </p>
        </div>
      </section>

      <section id="exchange-return" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">
          ✦ exchange / return
        </h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            모든 세트는 한 점씩만 준비되는 빈티지 상품입니다.<br />
            동일한 상품으로 교환은 어렵습니다.
          </p>
          <p>
            상품 수령 후 7일 이내 반품 접수가 가능합니다.<br />
            반품을 원하시는 경우, 먼저 Q&amp;A 또는 고객센터로 문의해주세요.
          </p>
          <p>
            단순 변심으로 인한 반품 배송비는 고객님 부담이며,<br />
            상품 불량 또는 오배송의 경우 반품 배송비는 샤키샤키가 부담합니다.
          </p>
          <p>
            반품 상품이 도착하면 구성품과 컨디션 확인 후<br />
            3영업일 이내 환불 처리를 도와드립니다.<br />
            실제 환불 완료 시점은 결제 수단 및 카드사 정책에 따라 달라질 수
            있습니다.
          </p>
        </div>
      </section>

      <section id="difficult-to-return" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">
          ✦ difficult to return
        </h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>아래의 경우 반품 및 환불이 어려울 수 있습니다.</p>
          <ul class="list-disc pl-6 space-y-2">
            <li>상품 수령 후 7일이 지난 경우</li>
            <li>사전 접수 없이 임의로 반송한 경우</li>
            <li>
              착용, 세탁, 수선, 향수, 화장품, 오염 등으로<br />
              상품 가치가 훼손된 경우
            </li>
            <li>라벨, 택, 포장재, 세트 구성품 일부가 누락된 경우</li>
            <li>고객 부주의로 상품이 훼손된 경우</li>
            <li>상세페이지에 미리 고지된 빈티지 특성을 사유로 하는 경우</li>
          </ul>
        </div>
      </section>

      <section id="vintage-guide" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">✦ vintage guide</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            shaki shaki archive의 상품은 새 상품이 아닌 빈티지 제품입니다.<br />
            오래된 옷이 가진 자연스러운 사용감, 원단의 결, 작은 보풀,<br />
            미세한 이염, 수선 흔적, 라벨 손상 등이 있을 수 있습니다.
          </p>
          <p>
            상품별로 확인 가능한 부분은<br />
            상세페이지와 이미지에 최대한 안내드리고 있습니다.
          </p>
          <p>
            상세페이지에 고지된 빈티지 특성, 미세 사용감, 원단 결,<br />
            작은 보풀이나 이염은 불량 사유에 해당하지 않습니다.
          </p>
          <p>
            빈티지 특성에 민감하신 분들은 구매 전 상세 사진을 충분히
            확인해주시고,<br />
            궁금한 부분은 문의 부탁드립니다.
          </p>
        </div>
      </section>

      <section id="set-item-only" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">✦ set item only</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            샤키샤키의 상품은 세트 구성을 기준으로 판매됩니다.<br />
            단품 판매는 어렵습니다.
          </p>
          <p>
            반품 시 수령하신 세트 구성품 전체가 함께 반송되어야 하며,<br />
            구성품 일부 누락 시 환불 처리가 어려울 수 있습니다.
          </p>
        </div>
      </section>

      <section id="size-color-care" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4 text-primary">
          ✦ size / color / care
        </h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            실측은 단면 기준이며,<br />
            측정 위치와 방법에 따라 1–3cm 정도의 오차가 있을 수 있습니다.
          </p>
          <p>
            촬영 환경과 사용하시는 기기 화면에 따라<br />
            실제 색상과 약간의 차이가 있을 수 있습니다.
          </p>
          <p>
            빈티지 제품은 첫 세탁 시 단독 손세탁 또는 드라이클리닝을 권장합니다.<br />
            강한 마찰, 장시간 물담금, 비틀어 짜기, 건조기 사용은 피해주세요.
          </p>
        </div>
      </section>
    </div>
  </div>
</template>
