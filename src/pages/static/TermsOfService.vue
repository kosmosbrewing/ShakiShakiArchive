<script setup lang="ts">
// src/pages/static/TermsOfService.vue
// 이용약관 페이지 (전자상거래 등에서의 소비자보호에 관한 법률 준수)

import { onMounted, onUnmounted } from "vue";

onMounted(() => {
  // 페이지 최상단으로 즉시 이동 (라우팅 시 smooth 방지)
  window.scrollTo({ top: 0, behavior: "instant" });
  // 목차 앵커 링크 클릭 시에만 smooth 스크롤 적용
  document.documentElement.classList.add("scroll-smooth");
});

onUnmounted(() => {
  document.documentElement.classList.remove("scroll-smooth");
});
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-12 sm:py-16">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">이용약관</h1>
      <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
    </div>

    <!-- 목차 -->
    <nav class="bg-muted/30 rounded-lg p-6 mb-10">
      <h2 class="text-lg font-semibold mb-4">목차</h2>
      <ol class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body">
        <li>
          <a href="#section1" class="text-primary hover:underline">제1조 (목적)</a>
        </li>
        <li>
          <a href="#section2" class="text-primary hover:underline">제2조 (정의)</a>
        </li>
        <li>
          <a href="#section3" class="text-primary hover:underline">제3조 (약관의 게시 및 개정)</a>
        </li>
        <li>
          <a href="#section4" class="text-primary hover:underline">제4조 (서비스의 제공 및 변경)</a>
        </li>
        <li>
          <a href="#section5" class="text-primary hover:underline">제5조 (서비스의 중단)</a>
        </li>
        <li>
          <a href="#section6" class="text-primary hover:underline">제6조 (회원가입)</a>
        </li>
        <li>
          <a href="#section7" class="text-primary hover:underline">제7조 (회원탈퇴 및 자격 상실)</a>
        </li>
        <li>
          <a href="#section8" class="text-primary hover:underline">제8조 (회원에 대한 통지)</a>
        </li>
        <li>
          <a href="#section9" class="text-primary hover:underline">제9조 (구매신청)</a>
        </li>
        <li>
          <a href="#section10" class="text-primary hover:underline">제10조 (계약의 성립)</a>
        </li>
        <li>
          <a href="#section11" class="text-primary hover:underline">제11조 (결제 방법)</a>
        </li>
        <li>
          <a href="#section12" class="text-primary hover:underline">제12조 (주문 확인 및 변경·취소)</a>
        </li>
        <li>
          <a href="#section13" class="text-primary hover:underline">제13조 (상품의 배송)</a>
        </li>
        <li>
          <a href="#section14" class="text-primary hover:underline">제14조 (환불)</a>
        </li>
        <li>
          <a href="#section15" class="text-primary hover:underline">제15조 (청약철회)</a>
        </li>
        <li>
          <a href="#section16" class="text-primary hover:underline">제16조 (청약철회의 효과)</a>
        </li>
        <li>
          <a href="#section17" class="text-primary hover:underline">제17조 (개인정보보호)</a>
        </li>
        <li>
          <a href="#section18" class="text-primary hover:underline">제18조 (샤키샤키 아카이브의 의무)</a>
        </li>
        <li>
          <a href="#section19" class="text-primary hover:underline">제19조 (회원의 계정 관리 의무)</a>
        </li>
        <li>
          <a href="#section20" class="text-primary hover:underline">제20조 (이용자의 의무)</a>
        </li>
        <li>
          <a href="#section21" class="text-primary hover:underline">제21조 (외부 링크에 대한 책임)</a>
        </li>
        <li>
          <a href="#section22" class="text-primary hover:underline">제22조 (저작권)</a>
        </li>
        <li>
          <a href="#section23" class="text-primary hover:underline">제23조 (분쟁해결)</a>
        </li>
        <li>
          <a href="#section24" class="text-primary hover:underline">제24조 (관할법원 및 준거법)</a>
        </li>
      </ol>
    </nav>

    <!-- 본문 -->
    <div class="space-y-10">
      <!-- 제1조 (목적) -->
      <section id="section1" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제1조 (목적)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            이 약관은 샤키샤키 아카이브(ShakiShaki Archive)가 운영하는 온라인 스토어에서
            제공하는 서비스를 이용할 때 샤키샤키 아카이브와 이용자 간의 권리, 의무, 책임 사항 및
            기타 필요한 사항을 정하는 것을 목적으로 합니다.
          </p>
          <p class="text-caption text-muted-foreground">
            ※ 모바일 등 다른 기기를 통한 전자상거래에도 이 약관이 동일하게 적용됩니다.
          </p>
        </div>
      </section>

      <!-- 제2조 (정의) -->
      <section id="section2" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제2조 (정의)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              <strong>"샤키샤키 아카이브"</strong>란 상품 및 서비스를 이용자에게 제공하기 위해
              운영하는 온라인 스토어를 말하며, 이를 운영하는 사업자를 의미하기도 합니다.
            </li>
            <li>
              <strong>"이용자"</strong>란 샤키샤키 아카이브에 접속하여 이 약관에 따라 서비스를
              이용하는 회원 및 비회원을 말합니다.
            </li>
            <li>
              <strong>"회원"</strong>이란 샤키샤키 아카이브에 회원가입을 완료하고, 지속적으로
              서비스를 이용할 수 있는 분을 말합니다.
            </li>
            <li>
              <strong>"비회원"</strong>이란 회원가입 없이 샤키샤키 아카이브의 서비스를
              이용하는 분을 말합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제3조 (약관의 게시 및 개정) -->
      <section id="section3" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제3조 (약관의 게시 및 개정)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 이 약관의 내용, 상호, 대표자 성명, 사업장 주소, 연락처,
              사업자등록번호, 통신판매업 신고번호, 개인정보관리책임자 등을 이용자가 쉽게
              확인할 수 있도록 온라인 스토어 화면에 게시합니다.
            </li>
            <li>
              샤키샤키 아카이브는 이용자가 약관에 동의하기 전에 청약철회, 배송, 환불 조건 등
              중요한 내용을 별도의 화면이나 팝업 등으로 안내하여 이용자의 확인을 받습니다.
            </li>
            <li>
              샤키샤키 아카이브는 「전자상거래 등에서의 소비자보호에 관한 법률」,
              「약관의 규제에 관한 법률」 등 관련 법령을 위반하지 않는 범위에서
              이 약관을 개정할 수 있습니다.
            </li>
            <li>
              약관을 개정할 경우, 적용일과 개정 사유를 명시하여 적용일 7일 전부터
              공지합니다. 다만, 이용자에게 불리한 변경의 경우에는 최소 30일 전에
              공지하며, 변경 전후 내용을 비교하여 알기 쉽게 표시합니다.
            </li>
            <li>
              개정된 약관은 적용일 이후에 체결되는 계약에 적용됩니다.
              기존 계약에는 이전 약관이 적용되지만, 이용자가 개정약관 적용을 원하고
              샤키샤키 아카이브가 동의한 경우에는 개정약관이 적용될 수 있습니다.
            </li>
            <li>
              이 약관에서 정하지 않은 사항은 전자상거래 관련 법령 및 일반 상관례에 따릅니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제4조 (서비스의 제공 및 변경) -->
      <section id="section4" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제4조 (서비스의 제공 및 변경)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 다음과 같은 서비스를 제공합니다.
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li>상품 및 서비스에 대한 정보 제공 및 구매계약 체결</li>
                <li>구매한 상품의 배송</li>
                <li>그 외 샤키샤키 아카이브가 정하는 서비스</li>
              </ul>
            </li>
            <li>
              상품이 품절되거나 기술적 사양이 변경된 경우, 앞으로 체결될 계약의
              상품 내용을 변경할 수 있습니다. 이 경우 변경된 내용과 제공일을
              해당 상품 페이지에 즉시 공지합니다.
            </li>
            <li>
              이용자와 계약한 서비스 내용이 품절이나 기술적 사유로 변경될 경우,
              이용자에게 즉시 알려드립니다.
            </li>
            <li>
              위 경우로 인해 이용자에게 손해가 발생하면 샤키샤키 아카이브가 배상합니다.
              다만, 고의나 과실이 없음을 증명한 경우에는 그렇지 않습니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제5조 (서비스의 중단) -->
      <section id="section5" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제5조 (서비스의 중단)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 시스템 점검, 교체, 고장 또는 통신 장애 등의 사유로
              서비스를 일시적으로 중단할 수 있습니다.
            </li>
            <li>
              서비스 중단으로 인해 이용자에게 손해가 발생한 경우, 샤키샤키 아카이브가
              배상합니다. 다만, 고의나 과실이 없음을 증명한 경우에는 그렇지 않습니다.
            </li>
            <li>
              사업 전환, 폐업, 합병 등의 사유로 서비스를 종료하는 경우에는
              제8조의 방법으로 이용자에게 통지하고, 사전에 안내한 조건에 따라 보상합니다.
              보상 기준을 별도로 안내하지 않은 경우에는 적립금 등을 현금이나
              그에 상응하는 방식으로 지급합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제6조 (회원가입) -->
      <section id="section6" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제6조 (회원가입)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              이용자는 샤키샤키 아카이브가 정한 가입 양식에 따라 정보를 입력하고
              이 약관에 동의함으로써 회원가입을 신청합니다.
            </li>
            <li>
              샤키샤키 아카이브는 다음에 해당하지 않는 한 회원으로 등록합니다.
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li>이전에 제7조 제3항에 따라 회원자격을 상실한 적이 있는 경우
                    (단, 자격 상실 후 3년이 지나고 재가입 승낙을 받은 경우는 예외)</li>
                <li>등록 내용에 허위, 누락, 오류가 있는 경우</li>
                <li>기술적 문제로 회원 등록이 어려운 경우</li>
              </ul>
            </li>
            <li>
              회원가입은 샤키샤키 아카이브의 승낙이 회원에게 도달한 시점에 완료됩니다.
            </li>
            <li>
              회원은 가입 시 등록한 정보가 변경되면 즉시 수정해야 합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제7조 (회원탈퇴 및 자격 상실) -->
      <section id="section7" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제7조 (회원탈퇴 및 자격 상실)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              회원은 언제든지 탈퇴를 요청할 수 있으며, 샤키샤키 아카이브는 즉시 처리합니다.
            </li>
            <li>
              다음의 경우 회원자격을 제한하거나 정지할 수 있습니다.
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li>가입 시 허위 정보를 등록한 경우</li>
                <li>구매 대금 등 채무를 기한 내에 지급하지 않은 경우</li>
                <li>다른 이용자의 서비스 이용을 방해하거나 정보를 도용한 경우</li>
                <li>법령이나 이 약관을 위반하거나 공공질서를 해치는 행위를 한 경우</li>
              </ul>
            </li>
            <li>
              회원자격을 제한·정지한 후에도 같은 행위가 2회 이상 반복되거나
              30일 이내에 시정되지 않으면 회원자격을 영구히 상실시킬 수 있습니다.
            </li>
            <li>
              회원자격을 상실시키는 경우, 회원등록을 삭제합니다.
              이때 회원에게 사전 통지하고, 삭제 전 최소 30일 이상의 소명 기회를 드립니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제8조 (회원에 대한 통지) -->
      <section id="section8" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제8조 (회원에 대한 통지)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브가 회원에게 통지할 때는 회원이 등록한 이메일 주소로 발송합니다.
            </li>
            <li>
              불특정 다수 회원에 대한 통지는 1주일 이상 공지사항에 게시하는 것으로
              개별 통지를 대신할 수 있습니다. 다만, 회원 본인의 거래에 중대한 영향을
              미치는 사항은 개별적으로 통지합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제9조 (구매신청) -->
      <section id="section9" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제9조 (구매신청)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>이용자는 샤키샤키 아카이브에서 다음과 같은 방법으로 구매를 신청합니다.
             샤키샤키 아카이브는 각 단계에서 필요한 정보를 알기 쉽게 제공합니다.</p>
          <ol class="list-decimal pl-6 space-y-3">
            <li>상품 검색 및 선택</li>
            <li>받는 분의 이름, 주소, 연락처, 이메일 등 입력</li>
            <li>약관 내용, 청약철회 제한 사항, 배송비 등 비용 부담 관련 내용 확인</li>
            <li>약관 동의 및 위 내용 확인 (체크박스 선택 등)</li>
            <li>구매신청 및 샤키샤키 아카이브의 확인</li>
            <li>결제 방법 선택</li>
          </ol>
        </div>
      </section>

      <!-- 제10조 (계약의 성립) -->
      <section id="section10" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제10조 (계약의 성립)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 다음의 경우 구매신청을 승낙하지 않을 수 있습니다.
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li>신청 내용에 허위, 누락, 오류가 있는 경우</li>
                <li>미성년자가 청소년보호법에서 금지하는 상품을 구매하려는 경우</li>
                <li>기술적으로 승낙이 어려운 경우</li>
              </ul>
              <p class="mt-2 text-caption text-muted-foreground">
                ※ 미성년자와의 계약은 법정대리인의 동의가 필요하며, 동의 없이 체결된 계약은
                미성년자 본인 또는 법정대리인이 취소할 수 있습니다.
              </p>
            </li>
            <li>
              샤키샤키 아카이브의 승낙이 제12조 제1항의 주문확인 형태로 이용자에게
              도달한 시점에 계약이 성립됩니다.
            </li>
            <li>
              승낙 안내에는 구매신청 확인, 판매 가능 여부, 주문 정정·취소 방법 등이 포함됩니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제11조 (결제 방법) -->
      <section id="section11" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제11조 (결제 방법)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>샤키샤키 아카이브에서 구매한 상품의 대금은 다음 방법으로 결제할 수 있습니다.</p>
          <div class="bg-muted/20 rounded-lg p-5">
            <ul class="list-disc pl-6 space-y-2">
              <li>카카오페이</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 제12조 (주문 확인 및 변경·취소) -->
      <section id="section12" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제12조 (주문 확인 및 변경·취소)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 이용자가 구매를 신청하면 주문확인 알림을 보내드립니다.
            </li>
            <li>
              주문확인을 받은 후 내용이 잘못되었다면 즉시 변경이나 취소를 요청할 수 있습니다.
              배송 전이라면 바로 처리해 드립니다. 단, 이미 결제가 완료된 경우에는
              제15조의 청약철회 규정에 따릅니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제13조 (상품의 배송) -->
      <section id="section13" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제13조 (상품의 배송)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              별도의 약정이 없는 한, 주문일로부터 7일 이내에 배송 준비를 완료합니다.
              이미 결제가 완료된 경우에는 결제일로부터 3영업일 이내에 배송 준비를 시작합니다.
              배송 진행 상황은 주문 내역에서 확인할 수 있습니다.
            </li>
            <li>
              배송 수단, 배송비 부담, 배송 기간 등을 상품 페이지에 안내합니다.
              약속된 배송 기간을 초과한 경우 그로 인한 손해를 배상합니다.
              다만, 고의나 과실이 없음을 증명한 경우에는 그렇지 않습니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제14조 (환불) -->
      <section id="section14" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제14조 (환불)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>
            이용자가 주문한 상품이 품절 등의 사유로 배송이 불가능한 경우,
            즉시 그 사유를 알려드리고, 이미 결제가 완료되었다면 결제일로부터
            3영업일 이내에 환불 처리합니다.
          </p>
        </div>
      </section>

      <!-- 제15조 (청약철회) -->
      <section id="section15" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제15조 (청약철회)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브에서 상품을 구매한 이용자는 계약 내용에 관한 서면을 받은 날
              (상품 수령이 더 늦은 경우에는 상품을 받은 날)부터 7일 이내에 청약을 철회할 수 있습니다.
              단, 「전자상거래 등에서의 소비자보호에 관한 법률」에 별도 규정이 있는 경우에는
              해당 법률을 따릅니다.
            </li>
            <li>
              다음의 경우에는 반품 및 교환이 불가능합니다.
              <ul class="list-disc pl-6 mt-2 space-y-1">
                <li>이용자의 책임으로 상품이 파손되거나 훼손된 경우
                    (단, 내용 확인을 위해 포장을 연 경우는 제외)</li>
                <li>사용 또는 일부 소비로 상품 가치가 크게 떨어진 경우</li>
                <li>시간이 지나 재판매가 어려울 정도로 가치가 떨어진 경우</li>
                <li>복제 가능한 상품의 포장을 훼손한 경우</li>
              </ul>
            </li>
            <li>
              위 제2항의 2~4호의 경우, 샤키샤키 아카이브가 사전에 청약철회 제한 사실을
              이용자가 쉽게 알 수 있도록 안내하지 않았다면 청약철회가 제한되지 않습니다.
            </li>
            <li>
              상품이 광고나 계약 내용과 다르게 배송된 경우에는 수령일로부터 3개월 이내,
              또는 그 사실을 안 날로부터 30일 이내에 청약철회를 할 수 있습니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제16조 (청약철회의 효과) -->
      <section id="section16" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제16조 (청약철회의 효과)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 상품을 반환받은 날로부터 3영업일 이내에 환불합니다.
              환불이 지연된 경우에는 법령에서 정한 지연이자를 함께 지급합니다.
            </li>
            <li>
              신용카드나 전자결제로 결제한 경우, 해당 결제 수단의 청구를
              즉시 정지하거나 취소하도록 요청합니다.
            </li>
            <li>
              청약철회 시 반품 배송비는 이용자가 부담합니다.
              샤키샤키 아카이브는 청약철회를 이유로 위약금이나 손해배상을 청구하지 않습니다.
              단, 상품이 광고나 계약 내용과 다른 경우에는 반품 배송비를
              샤키샤키 아카이브가 부담합니다.
            </li>
            <li>
              배송비를 이용자가 부담한 경우, 청약철회 시 배송비 부담 주체를 명확히 안내합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제17조 (개인정보보호) -->
      <section id="section17" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제17조 (개인정보보호)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 서비스 제공에 필요한 최소한의 개인정보만 수집합니다.
            </li>
            <li>
              회원가입 시 구매에 필요한 정보를 미리 수집하지 않습니다.
              단, 법령상 본인확인이 필요한 경우에는 예외입니다.
            </li>
            <li>
              개인정보를 수집할 때는 그 목적을 알리고 동의를 받습니다.
            </li>
            <li>
              수집한 개인정보는 수집 목적 외로 사용하지 않습니다.
              새로운 목적이 생기거나 제3자에게 제공할 때는 다시 동의를 받습니다.
              단, 법령에 따른 경우는 예외입니다.
            </li>
            <li>
              동의를 받을 때는 개인정보관리 책임자, 수집 목적, 제3자 제공 관련 사항 등을
              명확히 안내합니다. 이용자는 언제든지 동의를 철회할 수 있습니다.
            </li>
            <li>
              이용자는 언제든지 자신의 개인정보를 열람하고 오류 정정을 요청할 수 있습니다.
              샤키샤키 아카이브는 즉시 필요한 조치를 취하며, 오류 정정이 완료될 때까지
              해당 정보를 이용하지 않습니다.
            </li>
            <li>
              개인정보를 다루는 담당자를 최소화하며, 개인정보의 분실, 도난, 유출, 변조 등으로
              인한 이용자의 손해에 대해 책임집니다.
            </li>
            <li>
              수집 목적을 달성하면 개인정보를 즉시 파기합니다.
            </li>
            <li>
              개인정보 수집 동의란을 미리 선택된 상태로 설정하지 않습니다.
              필수 항목이 아닌 개인정보 수집에 동의하지 않더라도 서비스 이용을 제한하지 않습니다.
            </li>
          </ol>
          <div class="bg-primary/5 border-l-4 border-primary p-4 mt-4">
            <p class="text-caption">
              ※ 자세한 내용은
              <router-link to="/privacy" class="text-primary hover:underline font-semibold">
                개인정보 처리방침
              </router-link>
              을 확인해 주세요.
            </p>
          </div>
        </div>
      </section>

      <!-- 제18조 (샤키샤키 아카이브의 의무) -->
      <section id="section18" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제18조 (샤키샤키 아카이브의 의무)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 법령과 이 약관을 준수하며, 안정적이고 지속적인
              서비스 제공을 위해 최선을 다합니다.
            </li>
            <li>
              이용자가 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한
              보안 시스템을 갖춥니다.
            </li>
            <li>
              상품에 대해 부당한 표시나 광고를 하여 이용자에게 손해를 끼친 경우
              배상 책임을 집니다.
            </li>
            <li>
              이용자가 원하지 않는 광고성 이메일을 발송하지 않습니다.
            </li>
          </ol>
          <div class="bg-muted/20 rounded-lg p-5 mt-4">
            <p class="font-semibold mb-2">샤키샤키 아카이브 연락처</p>
            <ul class="text-caption space-y-1">
              <li><strong>대표자:</strong> 손유진</li>
              <li><strong>연락처:</strong> 010-7347-4088</li>
              <li><strong>이메일:</strong> 381611sug@naver.com</li>
              <li><strong>주소:</strong> 경상남도 밀양시 부북면 덕곡2길 203-28</li>
              <li><strong>사업자등록번호:</strong> 157-18-02463</li>
              <li><strong>통신판매업 신고번호:</strong> 2025-경남밀양-210호</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- 제19조 (회원의 계정 관리 의무) -->
      <section id="section19" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제19조 (회원의 계정 관리 의무)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              제17조의 경우를 제외하고, 아이디와 비밀번호의 관리 책임은 회원에게 있습니다.
            </li>
            <li>
              회원은 자신의 아이디와 비밀번호를 다른 사람이 사용하도록 해서는 안 됩니다.
            </li>
            <li>
              아이디나 비밀번호가 도용되었거나 제3자가 사용 중임을 알게 된 경우,
              즉시 샤키샤키 아카이브에 알리고 안내에 따라 조치해야 합니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제20조 (이용자의 의무) -->
      <section id="section20" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제20조 (이용자의 의무)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ol class="list-decimal pl-6 space-y-2">
            <li>허위 정보 등록</li>
            <li>타인 정보 도용</li>
            <li>샤키샤키 아카이브에 게시된 정보의 무단 변경</li>
            <li>허가되지 않은 정보(프로그램 등)의 전송 또는 게시</li>
            <li>샤키샤키 아카이브 또는 제3자의 저작권 등 지적재산권 침해</li>
            <li>샤키샤키 아카이브 또는 제3자의 명예를 훼손하거나 업무를 방해하는 행위</li>
            <li>음란하거나 폭력적인 내용, 공공질서를 해치는 정보를 공개하거나 게시하는 행위</li>
          </ol>
        </div>
      </section>

      <!-- 제21조 (외부 링크에 대한 책임) -->
      <section id="section21" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제21조 (외부 링크에 대한 책임)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브가 외부 웹사이트와 링크로 연결되어 있는 경우,
              샤키샤키 아카이브를 "연결 사이트", 외부 사이트를 "피연결 사이트"라고 합니다.
            </li>
            <li>
              피연결 사이트에서 독자적으로 제공하는 상품이나 서비스에 대해서는
              샤키샤키 아카이브가 보증하지 않는다는 점을 초기화면이나
              팝업 등으로 안내한 경우, 해당 거래에 대한 책임을 지지 않습니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제22조 (저작권) -->
      <section id="section22" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제22조 (저작권)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브가 작성한 콘텐츠의 저작권은 샤키샤키 아카이브에 있습니다.
            </li>
            <li>
              이용자는 샤키샤키 아카이브를 통해 얻은 정보 중 샤키샤키 아카이브에
              저작권이 있는 정보를 사전 승낙 없이 복제, 전송, 출판, 배포, 방송하거나
              영리 목적으로 이용할 수 없습니다.
            </li>
            <li>
              샤키샤키 아카이브가 이용자의 저작물을 사용하는 경우에는 해당 이용자에게 알립니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제23조 (분쟁해결) -->
      <section id="section23" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제23조 (분쟁해결)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브는 이용자가 제기하는 정당한 의견이나 불만을 반영하고,
              피해 보상을 처리하기 위한 절차를 운영합니다.
            </li>
            <li>
              이용자의 불만사항과 의견은 우선적으로 처리합니다.
              신속한 처리가 어려운 경우에는 그 사유와 처리 일정을 안내해 드립니다.
            </li>
            <li>
              샤키샤키 아카이브와 이용자 간에 분쟁이 발생한 경우, 공정거래위원회나
              시·도지사가 의뢰하는 분쟁조정기관의 조정을 받을 수 있습니다.
            </li>
          </ol>
        </div>
      </section>

      <!-- 제24조 (관할법원 및 준거법) -->
      <section id="section24" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">제24조 (관할법원 및 준거법)</h2>
        <div class="space-y-4 text-body leading-relaxed">
          <ol class="list-decimal pl-6 space-y-3">
            <li>
              샤키샤키 아카이브와 이용자 간의 소송은 소송 제기 시 이용자의 주소지를
              관할하는 법원에 제기합니다. 주소가 없으면 거소지 법원이 관할합니다.
              주소나 거소가 불분명하거나 해외 거주자인 경우에는
              민사소송법에 따른 관할 법원에 제기합니다.
            </li>
            <li>
              샤키샤키 아카이브와 이용자 간의 소송에는 대한민국 법률을 적용합니다.
            </li>
          </ol>
        </div>
      </section>
    </div>

    <!-- 하단 정보 -->
    <div class="mt-12 pt-8 border-t border-border">
      <p class="text-caption text-muted-foreground">
        본 이용약관은 2026년 1월 27일부터 적용되며, 내용이 변경될 경우 웹사이트를 통해 공지합니다.
      </p>
      <p class="text-caption text-muted-foreground mt-2">
        본 약관은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 공정거래위원회
        전자상거래 표준약관을 기반으로 작성되었습니다.
      </p>
    </div>
  </div>
</template>
