<script setup lang="ts">
// src/pages/static/PrivacyPolicy.vue
// 개인정보 처리방침 페이지

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
  <div class="max-w-4xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16">
    <!-- 헤더 -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold mb-2">개인정보 처리방침</h1>
      <p class="text-body text-muted-foreground">시행일자: 2026년 1월 27일</p>
    </div>

    <!-- 목차 -->
    <nav class="bg-muted/30 rounded-lg p-6 mb-10">
      <h2 class="text-lg font-semibold mb-4">목차</h2>
      <ol class="space-y-2 text-body">
        <li>
          <a href="#section1" class="text-primary hover:underline">
            1. 개인정보 수집 및 이용
          </a>
        </li>
        <li>
          <a href="#section2" class="text-primary hover:underline">
            2. 개인정보 보유 기간
          </a>
        </li>
        <li>
          <a href="#section3" class="text-primary hover:underline">
            3. 개인정보 제3자 제공
          </a>
        </li>
        <li>
          <a href="#section4" class="text-primary hover:underline">
            4. 이용자의 권리
          </a>
        </li>
        <li>
          <a href="#section5" class="text-primary hover:underline">
            5. 개인정보 보호책임자
          </a>
        </li>
      </ol>
    </nav>

    <!-- 본문 -->
    <div class="space-y-10">
      <!-- 1. 개인정보 수집 및 이용 -->
      <section id="section1" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">1. 개인정보 수집 및 이용</h2>
        <div class="space-y-4 text-body leading-[1.5]">
          <p>
            샤키샤키 아카이브는 온라인 쇼핑몰 운영을 위해 다음과 같이 개인정보를
            수집하고 이용합니다.
          </p>

          <div class="bg-muted/20 rounded-lg p-5 space-y-4">
            <div>
              <h3 class="font-semibold mb-2">회원가입 및 관리</h3>
              <ul class="list-disc pl-6 space-y-1 text-caption">
                <li>수집 항목: 이메일, 비밀번호, 닉네임</li>
                <li>
                  소셜 로그인 시: 소셜 계정 ID, 이메일, 프로필 정보(닉네임 또는
                  이름)
                </li>
                <li>목적: 회원 식별, 서비스 제공, 본인 인증</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold mb-2">상품 주문 및 배송</h3>
              <ul class="list-disc pl-6 space-y-1 text-caption">
                <li>수집 항목: 수령인명, 배송지 주소, 연락처, 결제 정보</li>
                <li>목적: 상품 배송, 결제 처리, 주문 내역 확인</li>
              </ul>
            </div>

            <div>
              <h3 class="font-semibold mb-2">자동 수집 정보</h3>
              <ul class="list-disc pl-6 space-y-1 text-caption">
                <li>수집 항목: IP 주소, 쿠키, 서비스 이용 기록</li>
                <li>목적: 로그인 유지, 서비스 개선, 방문 통계 분석</li>
                <li>
                  분석 도구: Google Analytics 4(GA4)를 통해 방문 페이지, 접속
                  시간대, 기기/브라우저 정보를 익명 통계 형태로 처리할 수
                  있습니다.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. 개인정보 보유 기간 -->
      <section id="section2" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">2. 개인정보 보유 기간</h2>
        <div class="space-y-4 text-body leading-[1.5]">
          <ul class="list-disc pl-6 space-y-2">
            <li>
              <strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 즉시 파기)
            </li>
            <li>
              <strong>주문/결제 기록:</strong> 전자상거래법에 따라 5년 보관
            </li>
            <li><strong>소비자 불만/분쟁 기록:</strong> 3년 보관</li>
            <li>
              <strong>접속 기록:</strong> 통신비밀보호법에 따라 3개월 보관
            </li>
          </ul>

          <p class="text-caption text-muted-foreground mt-4">
            ※ 법령에서 정한 보관 기간 종료 후 즉시 파기합니다.
          </p>
        </div>
      </section>

      <!-- 3. 개인정보 제3자 제공 -->
      <section id="section3" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">3. 개인정보 제3자 제공</h2>
        <div class="space-y-4 text-body leading-[1.5]">
          <p>상품 배송을 위해 배송업체에 최소한의 정보만 제공합니다.</p>

          <div class="bg-muted/20 rounded-lg p-5">
            <ul class="space-y-1 text-caption">
              <li>
                <strong>제공받는 자:</strong> 배송업체 (CJ대한통운, 한진택배 등)
              </li>
              <li><strong>제공 목적:</strong> 상품 배송</li>
              <li><strong>제공 항목:</strong> 수령인명, 주소, 연락처</li>
              <li><strong>보유 기간:</strong> 배송 완료 후 즉시 파기</li>
            </ul>
          </div>

          <div class="bg-muted/20 rounded-lg p-5">
            <ul class="space-y-1 text-caption">
              <li><strong>제공받는 자:</strong> Google LLC (Google Analytics 4)</li>
              <li><strong>제공 목적:</strong> 사이트 이용 통계 분석 및 서비스 개선</li>
              <li>
                <strong>제공 항목:</strong> 방문 페이지, 접속 시간, 브라우저/기기
                정보, IP 기반 지역 정보(익명/비식별 통계)
              </li>
              <li><strong>보유 기간:</strong> Google Analytics 정책에 따름</li>
            </ul>
          </div>

          <p class="text-caption text-muted-foreground mt-4">
            ※ 위 경우를 제외하고는 고객 동의 없이 개인정보를 제3자에게 제공하지
            않습니다.
          </p>
        </div>
      </section>

      <!-- 4. 이용자의 권리 -->
      <section id="section4" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">4. 이용자의 권리</h2>
        <div class="space-y-4 text-body leading-[1.5]">
          <p>언제든지 다음의 권리를 행사할 수 있습니다.</p>

          <ul class="list-disc pl-6 space-y-2">
            <li>개인정보 열람 및 확인</li>
            <li>개인정보 수정 (마이페이지에서 직접 수정 가능)</li>
            <li>개인정보 삭제 및 회원 탈퇴</li>
            <li>개인정보 처리 정지 요구</li>
          </ul>

          <div class="bg-primary/5 border-l-4 border-primary p-4 mt-4">
            <p class="font-semibold mb-1">권리 행사 방법</p>
            <p class="text-caption">
              마이페이지에서 직접 수정하거나, 아래 개인정보 보호책임자에게
              연락주시면 됩니다.
            </p>
          </div>
        </div>
      </section>

      <!-- 5. 개인정보 보호책임자 -->
      <section id="section5" class="scroll-mt-24">
        <h2 class="text-2xl font-bold mb-4">5. 개인정보 보호책임자</h2>
        <div class="space-y-4 text-body leading-[1.5]">
          <p>
            개인정보 관련 문의사항이나 불만이 있으시면 아래로 연락주시기
            바랍니다.
          </p>

          <div class="bg-muted/20 rounded-lg p-6 space-y-2">
            <p><strong>성명:</strong> 손유진</p>
            <p><strong>연락처:</strong> 010-7347-4088</p>
            <p><strong>이메일:</strong> 381611sug@naver.com</p>
            <p><strong>주소:</strong> 경상남도 밀양시 부북면 덕곡2길 203-28</p>
          </div>
        </div>
      </section>
    </div>

    <!-- 하단 정보 -->
    <div class="mt-12 pt-8 border-t border-border">
      <p class="text-caption text-muted-foreground">
        본 개인정보 처리방침은 2026년 1월 27일부터 적용되며, 내용이 변경될 경우
        웹사이트를 통해 공지합니다.
      </p>
    </div>
  </div>
</template>
