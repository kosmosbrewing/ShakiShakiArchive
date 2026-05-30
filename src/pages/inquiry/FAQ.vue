<script setup lang="ts">
// src/pages/inquiry/FAQ.vue
// FAQ + 전체 문의 탭 페이지

import { onMounted, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { fetchInquiries } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import type { Inquiry, InquiryType, InquiryStatus } from "@/types/api";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";

// 공통 컴포넌트
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingSpinner, EmptyState } from "@/components/common";
import { Lock, MessageCircle, PenLine } from "lucide-vue-next";

// ─────────────────────────────────────────────
// 탭 상태
// ─────────────────────────────────────────────
type ActiveTab = "faq" | "qna";
const activeTab = ref<ActiveTab>("faq");

const router = useRouter();
const authStore = useAuthStore();
const { showAlert } = useAlert();

// ─────────────────────────────────────────────
// FAQ 관련
// ─────────────────────────────────────────────
interface FAQItem {
  id: string;
  question: string;
  answer: string;
  value: string;
}

const FAQ_ANCHORS: Array<{ id: string; value: string }> = [
  { id: "faq-shipping-fee", value: "shipping-fee" },
  { id: "faq-shipping-time", value: "shipping-time" },
  { id: "faq-return-refund", value: "return-refund" },
  { id: "faq-return-shipping-fee", value: "return-shipping-fee" },
  { id: "faq-address-change", value: "address-change" },
  { id: "faq-refund-time", value: "refund-time" },
];

const FAQ_FALLBACK_DATA: Array<{ question: string; answer: string }> = [
  {
    question: "배송비는 얼마인가요?",
    answer:
      "70,000원 이상 구매 시 무료배송이며, 미만 시 기본 배송비 3,500원입니다.\n제주 및 도서산간 지역은 추가 배송비 2,500원입니다.",
  },
  {
    question: "배송은 얼마나 걸리나요?",
    answer:
      "결제 완료 후 최대 7일 이내에 택배로 배송됩니다.\n제주 및 도서산간 지역은 1~2일 추가 소요될 수 있습니다.",
  },
  {
    question: "반품/환불은 어떻게 하나요?",
    answer:
      "상품 수령 후 7일 이내 신청 및 14일 이내 상품 도착 시 환불 가능합니다.\n마이페이지 > 주문내역에서 반품 신청 후, 고객님께서 직접 택배로 발송해 주셔야 합니다.",
  },
  {
    question: "반품 시 배송비는 어떻게 되나요?",
    answer:
      "고객 단순 변심의 경우 배송비는 '선불' 결제가 원칙입니다. 착불 도착 시 해당 금액만큼 환불금에서 차감됩니다.\n무료배송 혜택 수령 후 반품 시 조건 미달이면 초기 배송비 3,500원이 추가 차감될 수 있습니다.\n상품 불량 및 오배송의 경우 배송비 부담 없이 전액 환불됩니다.",
  },
  {
    question: "주문 후 배송지 변경이 가능한가요?",
    answer:
      "상품 발송 전이라면 1:1문의를 통해 변경이 가능합니다.\n발송 후에는 변경이 어려우니 빠른 연락 부탁드립니다.",
  },
  {
    question: "환불은 언제 되나요?",
    answer:
      "환불은 결제 수단에 따라 즉시~3영업일 이내 완료됩니다.\n정확한 환불 일정은 결제수단 및 카드사 정책에 따라 상이할 수 있습니다.",
  },
];

// FAQ 데이터는 정적 fallback 직접 사용 (API 의존 제거 → 백엔드 재시작 없이 즉시 반영)
const FAQList = ref<FAQItem[]>([]);

function buildFaqItem(question: string, answer: string, index: number): FAQItem {
  const mapped = FAQ_ANCHORS[index];
  const fallback = `faq-item-${index + 1}`;
  return {
    id: mapped?.id || fallback,
    value: mapped?.value || fallback,
    question,
    answer,
  };
}

function getFallbackFaqList(): FAQItem[] {
  return FAQ_FALLBACK_DATA.map((item, index) =>
    buildFaqItem(item.question, item.answer, index)
  );
}

function loadFaqList() {
  // 정적 FAQ 데이터 직접 사용 (네트워크 요청 불필요, \n 줄바꿈 렌더링 보장)
  FAQList.value = getFallbackFaqList();
}

// ─────────────────────────────────────────────
// 전체 문의 (전체 문의 목록) 관련
// ─────────────────────────────────────────────
const typeLabels: Record<InquiryType, string> = {
  product: "상품 문의",
  shipping: "배송 문의",
  exchange: "교환/반품",
  other: "기타",
};

const statusLabels: Record<InquiryStatus, string> = {
  pending: "답변 대기",
  answered: "답변 완료",
};

const statusLabelsShort: Record<InquiryStatus, string> = {
  pending: "대기",
  answered: "완료",
};

const statusVariants: Record<InquiryStatus, "default" | "secondary" | "outline"> = {
  pending: "outline",
  answered: "default",
};

const inquiries = ref<Inquiry[]>([]);
const isQnaLoading = ref(false);
const isQnaLoaded = ref(false);
const selectedType = ref<string>("all");

const filteredInquiries = computed(() => {
  if (selectedType.value === "all") return inquiries.value;
  return inquiries.value.filter((inquiry) => inquiry.type === selectedType.value);
});

async function loadInquiries() {
  if (isQnaLoaded.value) return; // 이미 로드된 경우 재요청 방지
  isQnaLoading.value = true;
  try {
    inquiries.value = await fetchInquiries();
    isQnaLoaded.value = true;
  } catch (error) {
    console.error("문의 목록 로드 실패:", error);
  } finally {
    isQnaLoading.value = false;
  }
}

// 전체 문의 탭 클릭 시 데이터 지연 로드
function switchTab(tab: ActiveTab) {
  activeTab.value = tab;
  if (tab === "qna") void loadInquiries();
}

const goToDetail = (inquiry: Inquiry) => {
  if (inquiry.isPrivate) {
    if (!authStore.user) {
      showAlert("로그인이 필요합니다.", { type: "error" });
      router.push("/login");
      return;
    }
    if (inquiry.userId !== authStore.user.id && !authStore.user.isAdmin) {
      showAlert("비밀글은 작성자만 확인할 수 있습니다.", { type: "error" });
      return;
    }
  }
  router.push(`/inquiry/${inquiry.id}`);
};

const goToCreate = () => {
  if (!authStore.user) {
    showAlert("로그인이 필요합니다.", { type: "error" });
    router.push("/login");
    return;
  }
  router.push("/inquiry/create");
};

onMounted(() => {
  loadFaqList();
});
</script>

<template>
  <main class="max-w-4xl mx-auto px-4 pt-4 pb-12 sm:pt-8 sm:pb-16">
    <!-- 페이지 타이틀 -->
    <div class="text-center mb-3">
      <h2 class="text-heading text-primary mb-2 tracking-wider">문의하기</h2>
      <h3 class="text-heading">
        {{ activeTab === 'faq' ? '자주 묻는 질문' : '전체 문의' }}
      </h3>
    </div>

    <!-- 언더라인 탭 -->
    <div class="flex justify-center border-b border-border mb-8">
      <button
        type="button"
        class="px-6 py-3 text-body font-medium transition-colors relative"
        :class="
          activeTab === 'faq'
            ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="switchTab('faq')"
      >
        FAQ
      </button>
      <button
        type="button"
        class="px-6 py-3 text-body font-medium transition-colors relative"
        :class="
          activeTab === 'qna'
            ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
            : 'text-muted-foreground hover:text-foreground'
        "
        @click="switchTab('qna')"
      >
        Q&A
      </button>
    </div>

    <!-- FAQ 탭 -->
    <section v-if="activeTab === 'faq'" aria-labelledby="faq-title" class="max-w-2xl mx-auto">
      <Accordion v-if="FAQList.length > 0" type="single" collapsible class="w-full">
        <AccordionItem
          v-for="{ id, question, answer, value } in FAQList"
          :key="value"
          :id="id"
          :value="value"
          as-child
        >
          <article>
            <AccordionTrigger class="text-left">{{ question }}</AccordionTrigger>
            <AccordionContent>
              <p
                v-for="(line, i) in answer.split('\n')"
                :key="i"
                class="text-body"
                :class="{ 'mt-2': i > 0 }"
              >{{ line }}</p>
            </AccordionContent>
          </article>
        </AccordionItem>
      </Accordion>
      <p v-else class="text-center text-muted-foreground py-8">
        FAQ 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>

      <p class="text-center pt-6 text-muted-foreground">
        찾으시는 답변이 없으신가요?
        <router-link
          to="/inquiry/create"
          class="text-primary hover:underline font-medium"
        >
          1:1 문의하기
        </router-link>
      </p>
    </section>

    <!-- 전체 문의 탭 -->
    <section v-else aria-labelledby="qna-title">
      <!-- 문의하기 버튼 -->
      <div class="mb-4 flex justify-end">
        <Button
          variant="default"
          size="sm"
          @click="goToCreate"
          class="gap-1.5 shadow-sm hover:shadow"
        >
          <PenLine class="w-4 h-4" />
          <span class="hidden sm:inline">문의하기</span>
          <span class="sm:hidden">작성</span>
        </Button>
      </div>
      <Separator />

      <!-- 필터 -->
      <div class="mt-6 mb-6 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <Select v-model="selectedType">
            <SelectTrigger class="w-[160px] sm:w-[180px] border-border/60">
              <SelectValue placeholder="유형 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="product">상품 문의</SelectItem>
              <SelectItem value="shipping">배송 문의</SelectItem>
              <SelectItem value="exchange">교환/반품</SelectItem>
              <SelectItem value="other">기타</SelectItem>
            </SelectContent>
          </Select>
          <span class="text-caption text-muted-foreground hidden sm:inline">
            총 {{ filteredInquiries.length }}건
          </span>
        </div>
        <span class="text-caption text-muted-foreground sm:hidden">
          {{ filteredInquiries.length }}건
        </span>
      </div>

      <LoadingSpinner v-if="isQnaLoading" />

      <EmptyState
        v-else-if="filteredInquiries.length === 0"
        header="문의 내역"
        :message="
          selectedType !== 'all'
            ? `${typeLabels[selectedType as InquiryType]} 문의가 없습니다.`
            : '등록된 문의가 없습니다.'
        "
        button-text="문의하기"
        button-link="/inquiry/create"
      />

      <!-- 문의 목록 -->
      <div
        v-else
        class="bg-background border border-border rounded-xl overflow-hidden shadow-sm"
      >
        <Table>
          <TableHeader>
            <TableRow class="bg-muted/30 hover:bg-muted/30 border-b border-border">
              <TableHead class="w-[60px] sm:w-[80px] text-center font-semibold text-foreground">
                <span class="hidden sm:inline">번호</span>
                <span class="sm:hidden">#</span>
              </TableHead>
              <TableHead class="hidden sm:table-cell w-[100px] md:w-[120px] font-semibold text-foreground">
                유형
              </TableHead>
              <TableHead class="font-semibold text-foreground">제목</TableHead>
              <TableHead class="hidden md:table-cell w-[100px] text-center font-semibold text-foreground">
                작성자
              </TableHead>
              <TableHead class="hidden lg:table-cell w-[140px] text-center font-semibold text-foreground">
                작성일
              </TableHead>
              <TableHead class="w-[100px] sm:w-[110px] text-center font-semibold text-foreground">
                상태
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="(inquiry, index) in filteredInquiries"
              :key="inquiry.id"
              class="cursor-pointer hover:bg-primary/5 transition-all duration-200 border-b border-border/50 last:border-0"
              @click="goToDetail(inquiry)"
            >
              <TableCell class="text-center">
                <span class="text-caption sm:text-body font-semibold text-primary">
                  {{ index + 1 }}
                </span>
              </TableCell>

              <TableCell class="hidden sm:table-cell">
                <Badge variant="outline" class="text-xs">
                  {{ typeLabels[inquiry.type] }}
                </Badge>
              </TableCell>

              <TableCell>
                <div class="flex flex-col gap-1 py-1">
                  <div class="sm:hidden flex items-center gap-1.5 mb-1">
                    <Badge variant="outline" class="text-xs">
                      {{ typeLabels[inquiry.type] }}
                    </Badge>
                  </div>
                  <div class="flex items-center gap-2">
                    <Lock
                      v-if="inquiry.isPrivate"
                      class="w-3.5 h-3.5 text-muted-foreground shrink-0"
                    />
                    <span class="font-medium text-foreground truncate text-caption sm:text-body">
                      <template
                        v-if="
                          inquiry.isPrivate &&
                          authStore.user?.id !== inquiry.userId &&
                          !authStore.user?.isAdmin
                        "
                      >
                        비밀글입니다.
                      </template>
                      <template v-else>{{ inquiry.title }}</template>
                    </span>
                    <div
                      v-if="inquiry.replyCount && inquiry.replyCount > 0"
                      class="flex items-center gap-1.5 shrink-0"
                    >
                      <div class="bg-primary text-white text-xs font-bold px-1.5 py-0.5 rounded">
                        RE
                      </div>
                      <div class="flex items-center gap-0.5 text-xs text-primary">
                        <MessageCircle class="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span class="font-medium">{{ inquiry.replyCount }}</span>
                      </div>
                    </div>
                  </div>
                  <p v-if="inquiry.product" class="text-xs text-muted-foreground truncate">
                    상품: {{ inquiry.product.name }}
                  </p>
                  <div class="md:hidden text-xs text-muted-foreground mt-0.5">
                    <span>{{ inquiry.user?.userName }}</span>
                    <span class="mx-1">·</span>
                    <span>{{ formatDate(inquiry.createdAt) }}</span>
                  </div>
                </div>
              </TableCell>

              <TableCell class="hidden md:table-cell text-center text-caption text-muted-foreground">
                {{ inquiry.user?.userName }}
              </TableCell>

              <TableCell class="hidden lg:table-cell text-center text-caption text-muted-foreground">
                {{ formatDate(inquiry.createdAt) }}
              </TableCell>

              <TableCell class="text-center">
                <Badge :variant="statusVariants[inquiry.status]" class="text-xs font-medium">
                  <span class="sm:hidden">{{ statusLabelsShort[inquiry.status] }}</span>
                  <span class="hidden sm:inline">{{ statusLabels[inquiry.status] }}</span>
                </Badge>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  </main>
</template>
