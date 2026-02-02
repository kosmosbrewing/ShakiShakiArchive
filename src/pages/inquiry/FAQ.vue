<script setup lang="ts">
// src/pages/inquiry/FAQ.vue
// FAQ 페이지

// 공통 컴포넌트
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// FAQ 데이터
interface FAQItem {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQItem[] = [
  {
    question: "배송비는 얼마인가요?",
    answer:
      "70,000원 이상 구매 시 무료배송이며, 미만 시 기본 배송비 3,500원입니다.\n제주 및 도서산간 지역은 추가 배송비 2,500원입니다.",
    value: "item-1",
  },
  {
    question: "배송은 얼마나 걸리나요?",
    answer:
      "결제 완료 후 최대 7일 이내에 택배로 배송됩니다.\n제주 및 도서산간 지역은 1~2일 추가 소요될 수 있습니다.",
    value: "item-2",
  },
  {
    question: "반품/환불은 어떻게 하나요?",
    answer:
      "상품 수령 후 7일 이내 신청 및 14일 이내 상품 도착 시 환불 가능합니다.\n마이페이지 > 주문내역에서 반품 신청 후, 고객님께서 직접 택배로 발송해 주셔야 합니다.",
    value: "item-3",
  },
  {
    question: "반품 시 배송비는 어떻게 되나요?",
    answer:
      "고객 단순 변심의 경우 고객님께서 직접 택배를 발송이 필요하며, 배송비는 '선불' 결제가 원칙입니다.\n만약 착불로 도착할 경우 해당 금액만큼 환불금에서 차감된 후 정산됩니다.\n무료배송 혜택을 받으신 경우 반품 후 조건 미달 시 초기 배송비 3,500원이 추가로 차감될 수 있습니다.\n상품 불량 및 오배송의 경우 배송비 부담 없이 전액 환불됩니다.",
    value: "item-4",
  },
  {
    question: "주문 후 배송지 변경이 가능한가요?",
    answer:
      "상품 발송 전이라면 고객센터 1:1문의를 통해 변경이 가능합니다.\n발송 후에는 변경이 어려우니 빠른 연락 부탁드립니다.",
    value: "item-5",
  },
  {
    question: "환불은 언제 되나요?",
    answer:
      "환불은 결제 수단에 따라 즉시~3영업일 이내 완료됩니다.\n정확한 환불 일정은 결제수단(네이버/카카오)에 따라 상이할 수 있습니다.",
    value: "item-6",
  },
];
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 py-12 sm:py-16">
    <!-- FAQ 섹션 -->
    <section class="mb-16">
      <div class="text-center mb-8">
        <h2 class="text-heading text-primary mb-2 tracking-wider">FAQ</h2>
        <h3 class="text-heading">자주 묻는 질문</h3>
      </div>

      <Accordion type="single" collapsible class="w-full">
        <AccordionItem
          v-for="{ question, answer, value } in FAQList"
          :key="value"
          :value="value"
        >
          <AccordionTrigger class="text-left">{{ question }}</AccordionTrigger>
          <AccordionContent class="text-body whitespace-pre-line">{{
            answer
          }}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <p class="text-center pt-4 text-muted-foreground">
        찾으시는 답변이 없으신가요?
        <router-link
          to="/inquiry"
          class="text-primary hover:underline font-medium"
        >
          문의 내역 보기
        </router-link>
      </p>
    </section>
  </div>
</template>
