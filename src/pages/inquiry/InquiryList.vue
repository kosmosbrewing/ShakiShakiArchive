<script setup lang="ts">
// src/pages/inquiry/InquiryList.vue
// 문의 목록 페이지 (전체 공개 문의)

import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { fetchInquiries } from "@/lib/api";
import type { Inquiry } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";

// 공통 컴포넌트
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

// FAQ 데이터
interface FAQItem {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQItem[] = [
  {
    question: "배송은 얼마나 걸리나요?",
    answer:
      "일반 배송은 결제 완료 후 2-3일 내에 발송되며, 발송 후 1-2일 내에 수령 가능합니다. 도서산간 지역은 추가 1-2일이 소요될 수 있습니다.",
    value: "item-1",
  },
  {
    question: "교환/반품은 어떻게 하나요?",
    answer:
      "상품 수령 후 7일 이내 교환/반품이 가능합니다. 단순 변심의 경우 반품 배송비는 고객 부담이며, \n상품 하자의 경우 무료로 처리됩니다. 마이페이지에서 교환/반품 신청이 가능합니다.",
    value: "item-2",
  },
  {
    question: "주문 후 배송지 변경이 가능한가요?",
    answer:
      "상품 발송 전이라면 마이페이지 또는 고객센터를 통해 배송지 변경이 가능합니다. 발송 후에는 변경이 어려우니 빠른 연락 부탁드립니다.",
    value: "item-3",
  },
  {
    question: "품절된 상품은 재입고 되나요?",
    answer:
      "인기 상품의 경우 재입고가 진행될 수 있습니다. 상품 상세 페이지에서 재입고 알림 신청을 하시면 입고 시 알림을 받으실 수 있습니다.",
    value: "item-4",
  },
];

// 상태
const inquiries = ref<Inquiry[]>([]);
const loading = ref(true);

// 문의 목록 로드
const loadInquiries = async () => {
  loading.value = true;
  try {
    inquiries.value = await fetchInquiries();
  } catch (error) {
    console.error("문의 목록 로드 실패:", error);
  } finally {
    loading.value = false;
  }
};

// 문의 작성 페이지로 이동
const goToCreate = () => {
  if (!authStore.user) {
    showAlert("로그인이 필요합니다.", { type: "error" });
    router.push("/login");
    return;
  }
  router.push("/inquiry/create");
};

onMounted(() => {
  loadInquiries();
});
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
          <AccordionContent class="text-body">{{ answer }}</AccordionContent>
        </AccordionItem>
      </Accordion>

      <p class="text-sm text-muted-foreground pt-4 text-center">
        찾으시는 답변이 없으신가요?
        <span class="text-primary underline cursor-pointer" @click="goToCreate">
          1:1 문의하기
        </span>
      </p>
    </section>
  </div>
</template>
