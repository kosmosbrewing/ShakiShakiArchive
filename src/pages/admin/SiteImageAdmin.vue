<script setup lang="ts">
// src/pages/admin/SiteImageAdmin.vue
// 사이트 이미지 관리 페이지 (Main, Marquee, Journal)

import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useSiteImageStore } from "@/stores/siteImage";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import {
  fetchAdminSiteImages,
  fetchAdminSiteImage,
  createSiteImage,
  updateSiteImage,
  deleteSiteImage,
  reorderSiteImages,
  uploadProductImage,
  fetchEmailTemplates,
  fetchEmailPreview,
} from "@/lib/api";
import type { SiteImage, SiteImageType } from "@/types/api";
import type { EmailTemplateInfo, EmailTemplateType } from "@/lib/api";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDescription } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/common";
import { AdminNavigationTabs } from "@/components/admin";
import {
  Trash2,
  Edit3,
  Plus,
  X,
  Image as ImageIcon,
  GripVertical,
  ExternalLink,
  Upload,
  Mail,
  Eye,
} from "lucide-vue-next";

const router = useRouter();
const authStore = useAuthStore();
const siteImageStore = useSiteImageStore();
const { showAlert, showDestructiveConfirm } = useAlert();

type ImageTab = Exclude<SiteImageType, "hero">;
type AdminTab = ImageTab | "email";

const IMAGE_TYPE_LABELS: Record<SiteImageType, string> = {
  main_desktop: "Main Desktop",
  main_mobile: "Main Mobile",
  hero: "Main Desktop",
  marquee: "Marquee",
  journal: "Journal",
};

const MAX_IMAGES_BY_TYPE: Record<ImageTab, number> = {
  main_desktop: 3,
  main_mobile: 3,
  marquee: 6,
  journal: 30,
};

const isImageTab = (tab: AdminTab): tab is ImageTab => tab !== "email";
const getImageTypeLabel = (type: SiteImageType) => IMAGE_TYPE_LABELS[type];

// 상태
const siteImages = ref<SiteImage[]>([]);
const isLoading = ref(true);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const isEditModalLoading = ref(false);
const isUploading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const activeTab = ref<AdminTab>("main_desktop");

// 이메일 템플릿 미리보기 상태
const emailTemplates = ref<EmailTemplateInfo[]>([]);
const selectedEmailTemplate = ref<EmailTemplateType | null>(null);
const emailPreviewHtml = ref("");
const isEmailLoading = ref(false);
const isEmailPreviewOpen = ref(false);

// 타입별 최대 개수 제한
const MAX_MAIN_DESKTOP_IMAGES = MAX_IMAGES_BY_TYPE.main_desktop;
const MAX_MAIN_MOBILE_IMAGES = MAX_IMAGES_BY_TYPE.main_mobile;
const MAX_MARQUEE_IMAGES = MAX_IMAGES_BY_TYPE.marquee;
const MAX_JOURNAL_IMAGES = MAX_IMAGES_BY_TYPE.journal;

// 폼 데이터
const initialForm = {
  id: 0,
  type: "main_desktop" as SiteImageType,
  imageUrl: "",
  linkUrl: "",
  displayOrder: 0,
  isActive: true,
};
const form = ref({ ...initialForm });

// 타입별 이미지 필터링
const mainDesktopImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "main_desktop" || img.type === "hero")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

const mainMobileImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "main_mobile")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

const marqueeImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "marquee")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

const journalImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "journal")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

// 현재 탭의 이미지
const currentImages = computed(() => {
  if (activeTab.value === "main_desktop") return mainDesktopImages.value;
  if (activeTab.value === "main_mobile") return mainMobileImages.value;
  if (activeTab.value === "marquee") return marqueeImages.value;
  if (activeTab.value === "journal") return journalImages.value;
  return [];
});

const currentImageTypeLabel = computed(() =>
  isImageTab(activeTab.value) ? getImageTypeLabel(activeTab.value) : "",
);

// 추가 가능 여부
const canAddMore = computed(() => {
  if (!isImageTab(activeTab.value)) return false;
  return currentImages.value.length < MAX_IMAGES_BY_TYPE[activeTab.value];
});

// 데이터 로드 (showLoading: 초기 로드 시에만 스피너 표시)
const loadData = async (showLoading = true) => {
  try {
    if (showLoading) isLoading.value = true;
    siteImages.value = await fetchAdminSiteImages();
    siteImageStore.syncFromAdminImages(siteImages.value);
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

// 모달 열기 (추가)
const openCreateModal = () => {
  if (!canAddMore.value) {
    if (!isImageTab(activeTab.value)) return;
    const max = MAX_IMAGES_BY_TYPE[activeTab.value];
    const imageType = getImageTypeLabel(activeTab.value);
    showAlert(
      ADMIN_MESSAGES.imageTypeLimitExceeded
        .replace("{type}", imageType)
        .replace("{max}", String(max)),
      { type: "error" }
    );
    return;
  }
  isEditMode.value = false;
  isEditModalLoading.value = false;
  if (!isImageTab(activeTab.value)) return;
  form.value = {
    ...initialForm,
    type: activeTab.value,
    displayOrder: currentImages.value.length,
  };
  errorMessage.value = "";
  isModalOpen.value = true;
};

// 모달 열기 (수정)
const openEditModal = async (image: SiteImage) => {
  isEditMode.value = true;
  isEditModalLoading.value = true;
  isModalOpen.value = true;

  // 로딩 중에도 이전 이미지가 보이도록 목록 데이터로 우선 세팅
  form.value = {
    id: image.id,
    type: image.type,
    imageUrl: image.imageUrl,
    linkUrl: image.linkUrl || "",
    displayOrder: image.displayOrder,
    isActive: image.isActive,
  };
  errorMessage.value = "";

  try {
    const latestImage = await fetchAdminSiteImage(image.id);
    form.value = {
      id: latestImage.id,
      type: latestImage.type,
      imageUrl: latestImage.imageUrl || image.imageUrl,
      linkUrl: latestImage.linkUrl || "",
      displayOrder: latestImage.displayOrder,
      isActive: latestImage.isActive,
    };
  } catch (error: any) {
    console.error(error);
    errorMessage.value =
      error.message ||
      "DB에 저장된 최신 이미지 URL을 불러오지 못해 목록 데이터를 사용합니다.";
  } finally {
    isEditModalLoading.value = false;
  }
};

// 이미지 업로드
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const file = input.files[0];

  // 파일 타입 검증
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = ADMIN_MESSAGES.supportedImageFormats;
    input.value = "";
    return;
  }

  // 파일 크기 검증 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = ADMIN_MESSAGES.fileSizeLimit;
    input.value = "";
    return;
  }

  isUploading.value = true;
  errorMessage.value = "";

  try {
    const result = await uploadProductImage(file);
    form.value.imageUrl = result.image.url;
  } catch (error: any) {
    errorMessage.value = error.message || ADMIN_MESSAGES.imageUploadFailed;
  } finally {
    isUploading.value = false;
    input.value = "";
  }
};

// 저장
const handleSave = async () => {
  if (isSaving.value || isUploading.value) return;

  try {
    errorMessage.value = "";

    if (!form.value.imageUrl) {
      errorMessage.value = ADMIN_MESSAGES.imageRequired;
      return;
    }

    isSaving.value = true;

    const payload = {
      type: form.value.type,
      imageUrl: form.value.imageUrl,
      linkUrl: form.value.linkUrl || undefined,
      displayOrder: form.value.displayOrder,
      isActive: form.value.isActive,
    };

    if (isEditMode.value) {
      const { image } = await updateSiteImage(form.value.id, payload);
      // 로컬 상태 업데이트
      const idx = siteImages.value.findIndex((img) => img.id === form.value.id);
      if (idx !== -1 && image) siteImages.value[idx] = image;
      siteImageStore.syncFromAdminImages(siteImages.value);
      showAlert(ADMIN_MESSAGES.siteImageUpdateSuccess);
    } else {
      const { image } = await createSiteImage(payload);
      // 로컬 상태에 추가
      if (image) siteImages.value.push(image);
      siteImageStore.syncFromAdminImages(siteImages.value);
      showAlert(ADMIN_MESSAGES.siteImageCreateSuccess);
    }

    isModalOpen.value = false;
  } catch (error: any) {
    errorMessage.value = error.message || ADMIN_MESSAGES.createFailed;
  } finally {
    isSaving.value = false;
  }
};

// 삭제 (낙관적 업데이트)
const handleDelete = async (id: number) => {
  const confirmed = await showDestructiveConfirm("정말 삭제하시겠습니까?");
  if (!confirmed) return;

  // 낙관적 업데이트: UI에서 먼저 제거
  const deletedIndex = siteImages.value.findIndex((img) => img.id === id);
  if (deletedIndex === -1) return;
  const deletedImage = siteImages.value[deletedIndex];
  siteImages.value.splice(deletedIndex, 1);
  siteImageStore.syncFromAdminImages(siteImages.value);

  try {
    await deleteSiteImage(id);
  } catch (e: any) {
    // 실패 시 복원
    siteImages.value.splice(deletedIndex, 0, deletedImage);
    siteImageStore.syncFromAdminImages(siteImages.value);
    showAlert(e.message, { type: "error" });
  }
};

// 활성화/비활성화 토글 (낙관적 업데이트)
const toggleActive = async (image: SiteImage) => {
  const targetImage = siteImages.value.find((img) => img.id === image.id);
  if (!targetImage) return;

  const newValue = !targetImage.isActive;
  // 낙관적 업데이트: UI 먼저 변경
  targetImage.isActive = newValue;
  siteImageStore.syncFromAdminImages(siteImages.value);

  try {
    await updateSiteImage(image.id, { isActive: newValue });
  } catch (e: any) {
    // 실패 시 롤백
    targetImage.isActive = !newValue;
    siteImageStore.syncFromAdminImages(siteImages.value);
    showAlert(e.message, { type: "error" });
  }
};

// 순서 변경 (위로) - 낙관적 업데이트
const moveUp = async (index: number) => {
  if (index === 0 || !isImageTab(activeTab.value)) return;

  const images = currentImages.value;
  const imageIds = images.map((img) => img.id);
  [imageIds[index - 1], imageIds[index]] = [
    imageIds[index],
    imageIds[index - 1],
  ];

  // 낙관적 업데이트: displayOrder 스왑
  const prevOrder = images[index - 1].displayOrder;
  images[index - 1].displayOrder = images[index].displayOrder;
  images[index].displayOrder = prevOrder;

  try {
    await reorderSiteImages({ type: activeTab.value, imageIds });
    siteImageStore.syncFromAdminImages(siteImages.value);
  } catch (e: any) {
    // 실패 시 롤백
    images[index].displayOrder = images[index - 1].displayOrder;
    images[index - 1].displayOrder = prevOrder;
    siteImageStore.syncFromAdminImages(siteImages.value);
    showAlert(e.message, { type: "error" });
  }
};

// 순서 변경 (아래로) - 낙관적 업데이트
const moveDown = async (index: number) => {
  if (index === currentImages.value.length - 1 || !isImageTab(activeTab.value)) return;

  const images = currentImages.value;
  const imageIds = images.map((img) => img.id);
  [imageIds[index], imageIds[index + 1]] = [
    imageIds[index + 1],
    imageIds[index],
  ];

  // 낙관적 업데이트: displayOrder 스왑
  const currentOrder = images[index].displayOrder;
  images[index].displayOrder = images[index + 1].displayOrder;
  images[index + 1].displayOrder = currentOrder;

  try {
    await reorderSiteImages({ type: activeTab.value, imageIds });
    siteImageStore.syncFromAdminImages(siteImages.value);
  } catch (e: any) {
    // 실패 시 롤백
    images[index + 1].displayOrder = images[index].displayOrder;
    images[index].displayOrder = currentOrder;
    siteImageStore.syncFromAdminImages(siteImages.value);
    showAlert(e.message, { type: "error" });
  }
};

// 이메일 템플릿 목록 로드
const loadEmailTemplates = async () => {
  try {
    isEmailLoading.value = true;
    const { templates } = await fetchEmailTemplates();
    emailTemplates.value = templates;
  } catch (error) {
    console.error(error);
  } finally {
    isEmailLoading.value = false;
  }
};

// 이메일 템플릿 미리보기 열기
const openEmailPreview = async (type: EmailTemplateType) => {
  try {
    selectedEmailTemplate.value = type;
    isEmailLoading.value = true;
    emailPreviewHtml.value = await fetchEmailPreview(type);
    isEmailPreviewOpen.value = true;
  } catch (error: any) {
    showAlert(error.message || "미리보기를 불러오는데 실패했습니다.", { type: "error" });
  } finally {
    isEmailLoading.value = false;
  }
};

// 이메일 미리보기 닫기
const closeEmailPreview = () => {
  isEmailPreviewOpen.value = false;
  selectedEmailTemplate.value = null;
  emailPreviewHtml.value = "";
};

// 초기화
onMounted(async () => {
  if (!authStore.user) await authStore.loadUser();
  if (!authStore.user?.isAdmin) {
    router.replace("/");
    return;
  }
  loadData();
  loadEmailTemplates();
});
</script>

<template>
  <div class="site-image-admin-page w-11/12 max-w-screen-2xl mx-auto px-4 pt-6 pb-12 sm:pt-8 sm:pb-16">
    <AdminNavigationTabs />
    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div class="min-w-0">
        <h3 class="text-heading text-admin tracking-wider">
          사이트 이미지 관리
        </h3>
        <p class="mt-1 mb-3 text-body text-admin-muted">
          총
          <span class="text-body font-bold text-admin">{{ siteImages.length }}</span>개 이미지
          <span class="text-caption text-admin-muted">/ Main, Marquee, Journal 관리</span>
        </p>
      </div>
      <Button
        @click="openCreateModal"
        class="mb-2 gap-2 bg-primary hover:bg-primary/80 text-white font-semibold"
        :disabled="!canAddMore"
      >
        <Plus class="w-4 h-4" />
        이미지 추가
      </Button>
    </div>
    <Separator class="mb-4 bg-border/70"></Separator>

    <!-- 탭 -->
    <div class="mb-4 flex flex-wrap gap-2 border-y border-border/70 bg-card/60 px-3 py-3">
      <Button
        @click="activeTab = 'main_desktop'"
        :variant="activeTab === 'main_desktop' ? undefined : 'outline'"
        :class="
          activeTab === 'main_desktop'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <ImageIcon class="w-4 h-4" />
        Main PC ({{ mainDesktopImages.length }}/{{ MAX_MAIN_DESKTOP_IMAGES }})
      </Button>
      <Button
        @click="activeTab = 'main_mobile'"
        :variant="activeTab === 'main_mobile' ? undefined : 'outline'"
        :class="
          activeTab === 'main_mobile'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <ImageIcon class="w-4 h-4" />
        Main Mobile ({{ mainMobileImages.length }}/{{ MAX_MAIN_MOBILE_IMAGES }})
      </Button>
      <Button
        @click="activeTab = 'marquee'"
        :variant="activeTab === 'marquee' ? undefined : 'outline'"
        :class="
          activeTab === 'marquee'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <ImageIcon class="w-4 h-4" />
        Marquee ({{ marqueeImages.length }}/{{ MAX_MARQUEE_IMAGES }})
      </Button>
      <Button
        @click="activeTab = 'journal'"
        :variant="activeTab === 'journal' ? undefined : 'outline'"
        :class="
          activeTab === 'journal'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <ImageIcon class="w-4 h-4" />
        Journal ({{ journalImages.length }}/{{ MAX_JOURNAL_IMAGES }})
      </Button>
      <Button
        @click="activeTab = 'email'"
        :variant="activeTab === 'email' ? undefined : 'outline'"
        :class="
          activeTab === 'email'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <Mail class="w-4 h-4" />
        이메일 템플릿
      </Button>
    </div>

    <!-- 로딩 -->
    <LoadingSpinner v-if="isLoading && activeTab !== 'email'" />

    <!-- 이메일 템플릿 목록 -->
    <Card v-if="activeTab === 'email'" class="overflow-hidden border-x-0 border-y border-border/70 bg-card shadow-none">
      <CardContent class="p-0">
        <LoadingSpinner v-if="isEmailLoading && !isEmailPreviewOpen" />
        <div v-else class="overflow-x-auto">
          <table class="site-image-admin-table w-full min-w-[600px] border-separate border-spacing-0 text-left">
            <thead
              class="border-b border-border/70 bg-transparent text-caption font-semibold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-5 py-2.5">템플릿명</th>
                <th class="px-5 py-2.5">설명</th>
                <th class="px-5 py-2.5 text-right pr-8">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="template in emailTemplates"
                :key="template.type"
                class="group transition-colors hover:bg-primary/[0.03]"
              >
                <td class="px-5 py-2.5">
                  <div class="flex items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center border border-border/70 bg-muted/20">
                      <Mail class="h-4 w-4 text-primary" />
                    </div>
                    <span class="text-[14px] font-medium leading-[1.25] text-admin">
                      {{ template.name }}
                    </span>
                  </div>
                </td>
                <td class="px-5 py-2.5">
                  <span class="text-[12px] leading-[1.25] text-admin-muted">
                    {{ template.description }}
                  </span>
                </td>
                <td class="px-5 py-2.5 text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    class="gap-2"
                    @click="openEmailPreview(template.type)"
                    :disabled="isEmailLoading"
                  >
                    <Eye class="w-4 h-4" />
                    미리보기
                  </Button>
                </td>
              </tr>
              <tr v-if="emailTemplates.length === 0">
                <td
                  colspan="3"
                  class="px-6 py-16 text-center text-admin-muted text-caption"
                >
                  등록된 이메일 템플릿이 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- 이미지 목록 -->
    <Card v-else-if="!isLoading" class="overflow-hidden border-x-0 border-y border-border/70 bg-card shadow-none">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="site-image-admin-table w-full min-w-[860px] border-separate border-spacing-0 text-left">
            <thead
              class="border-b border-border/70 bg-transparent text-caption font-semibold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-5 py-2.5 w-16">순서</th>
                <th class="px-5 py-2.5 w-44">이미지</th>
                <th class="px-5 py-2.5">이미지 URL</th>
                <th class="px-5 py-2.5 text-center w-28">상태</th>
                <th class="px-5 py-2.5 text-right pr-8 w-28">작업</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(image, index) in currentImages"
                :key="image.id"
                class="group transition-colors hover:bg-primary/[0.03]"
              >
                <td class="px-5 py-2.5">
                  <div class="flex flex-col gap-1">
                    <button
                      @click="moveUp(index)"
                      :disabled="index === 0"
                      class="p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <GripVertical class="w-4 h-4 rotate-90" />
                    </button>
                    <span class="text-center text-caption text-admin-muted">
                      {{ index + 1 }}
                    </span>
                    <button
                      @click="moveDown(index)"
                      :disabled="index === currentImages.length - 1"
                      class="p-1 hover:bg-muted disabled:opacity-30"
                    >
                      <GripVertical class="w-4 h-4 -rotate-90" />
                    </button>
                  </div>
                </td>
                <td class="px-5 py-2.5">
                  <div
                    class="h-16 w-28 overflow-hidden border border-border/70 bg-muted/20 transition-colors group-hover:border-primary/20"
                  >
                    <img
                      v-if="image.imageUrl"
                      :src="image.imageUrl"
                      loading="lazy"
                      decoding="async"
                      crossorigin="anonymous"
                      class="h-full w-full object-cover"
                    />
                    <div
                      v-else
                      class="h-full w-full flex items-center justify-center text-admin-muted opacity-20"
                    >
                      <ImageIcon class="w-6 h-6" />
                    </div>
                  </div>
                </td>
                <td class="px-5 py-2.5">
                  <div v-if="image.imageUrl" class="flex items-center gap-2">
                    <a
                      :href="image.imageUrl"
                      target="_blank"
                      class="flex items-center gap-1 text-[12px] leading-[1.25] text-primary hover:underline"
                    >
                      {{ image.imageUrl.substring(0, 48)
                      }}{{ image.imageUrl.length > 48 ? "..." : "" }}
                      <ExternalLink class="w-3 h-3" />
                    </a>
                  </div>
                  <span v-else class="text-[12px] text-admin-muted">-</span>
                </td>
                <td class="px-5 py-2.5 text-center">
                  <button
                    @click="toggleActive(image)"
                    :class="
                      image.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    "
                    class="px-3 py-1 rounded-full text-caption font-bold cursor-pointer hover:opacity-80"
                  >
                    {{ image.isActive ? "활성화" : "비활성화" }}
                  </button>
                </td>
                <td class="px-5 py-2.5 text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditModal(image)"
                      class="text-muted-foreground hover:text-primary"
                      :disabled="isEditModalLoading"
                    >
                      <Edit3 class="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="handleDelete(image.id)"
                      class="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 class="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
              <tr v-if="currentImages.length === 0">
                <td
                  colspan="5"
                  class="px-6 py-16 text-center text-admin-muted text-caption"
                >
                  등록된 {{ currentImageTypeLabel }} 이미지가 없습니다.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <!-- 모달 -->
    <div
      v-if="isModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div class="p-8">
          <div class="flex justify-between items-end">
            <h2
              class="text-heading font-semibold text-admin tracking-wide mb-3"
            >
              {{ isEditMode ? "이미지 수정" : "이미지 추가" }}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              @click="isModalOpen = false"
              :disabled="isSaving || isUploading || isEditModalLoading"
              class="mb-2"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator></Separator>

          <div
            v-if="isEditMode && isEditModalLoading"
            class="py-12 text-center space-y-3"
          >
            <LoadingSpinner />
            <p class="text-caption text-admin-muted">
              DB에 저장된 이미지 정보를 불러오는 중입니다.
            </p>
          </div>

          <form v-else @submit.prevent="handleSave" class="space-y-6 mt-6">
            <!-- 타입 표시 -->
            <div class="space-y-2">
              <Label class="text-admin">타입</Label>
              <div class="border border-border/70 bg-background px-4 py-2 text-body">
                {{ getImageTypeLabel(form.type) }}
              </div>
            </div>

            <!-- 이미지 업로드 -->
            <div class="space-y-3">
              <Label class="text-admin">
                이미지 <span class="text-primary">*</span>
              </Label>

              <div class="flex items-center gap-3">
                <label
                  class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg transition-colors text-body font-medium"
                  :class="
                    isUploading || isEditModalLoading
                      ? 'opacity-50 cursor-not-allowed pointer-events-none'
                      : 'cursor-pointer hover:bg-primary/80'
                  "
                >
                  <LoadingSpinner
                    v-if="isUploading"
                    variant="spinner"
                    size="sm"
                    color="white"
                    :center="false"
                    class="w-4 h-4"
                  />
                  <Upload v-else class="w-4 h-4" />
                  {{ isUploading ? "업로드 중..." : "이미지 선택" }}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    class="hidden"
                    :disabled="isUploading || isEditModalLoading"
                    @change="handleFileSelect"
                  />
                </label>
                <span class="text-caption text-admin-muted">
                  JPG/PNG/GIF/WebP · 10MB
                </span>
              </div>

              <!-- 이미지 미리보기 -->
              <div
                v-if="form.imageUrl"
                class="relative h-48 w-full overflow-hidden border border-border/70 bg-muted/20"
              >
                <img
                  :src="form.imageUrl"
                  alt="미리보기"
                  class="w-full h-full object-cover"
                  crossorigin="anonymous"
                />
                <button
                  type="button"
                  @click="form.imageUrl = ''"
                  :disabled="isUploading || isSaving"
                  class="absolute right-2 top-2 bg-red-500 p-1 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
              <div
                v-else
                class="border-2 border-dashed border-border p-8 text-center text-admin-muted"
              >
                <ImageIcon class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p class="text-body">이미지를 업로드해주세요</p>
              </div>
            </div>

            <!-- 이미지 URL -->
            <div class="space-y-2">
              <Label class="text-admin">이미지 URL</Label>
              <Input
                v-model="form.imageUrl"
                type="url"
                placeholder="https://example.com/image.jpg"
                :disabled="isUploading || isSaving || isEditModalLoading"
              />
              <p class="text-caption text-admin-muted">
                수정 모달에서는 DB에 저장된 URL을 자동으로 불러옵니다.
              </p>
            </div>

            <!-- 링크 URL -->
            <div class="space-y-2">
              <Label class="text-admin">링크 URL (선택)</Label>
              <Input
                v-model="form.linkUrl"
                type="url"
                placeholder="https://example.com/..."
              />
              <p class="text-caption text-admin-muted">
                이미지 클릭 시 이동할 URL을 입력하세요.
              </p>
            </div>

            <!-- 활성화 -->
            <div class="flex items-center gap-3 py-1">
              <input
                v-model="form.isActive"
                type="checkbox"
                id="isActive"
                class="w-4 h-4 rounded border-border accent-primary focus:ring-primary/20"
              />
              <Label for="isActive" class="cursor-pointer">
                활성화 (체크 해제 시 사이트에 표시되지 않음)
              </Label>
            </div>

            <!-- 에러 메시지 -->
            <AlertDescription v-if="errorMessage" class="animate-pulse">
              {{ errorMessage }}
            </AlertDescription>

            <!-- 버튼 -->
            <div
              class="flex justify-end gap-3 pt-6 border-t border-border mt-4"
            >
              <Button
                type="button"
                variant="outline"
                class="font-medium"
                @click="isModalOpen = false"
                :disabled="isSaving || isUploading || isEditModalLoading"
              >
                취소
              </Button>
              <Button
                type="submit"
                :disabled="isSaving || isUploading || isEditModalLoading || !form.imageUrl"
                class="gap-2 bg-primary hover:bg-primary/80 text-white font-semibold"
              >
                <LoadingSpinner
                  v-if="isSaving"
                  variant="spinner"
                  size="sm"
                  color="white"
                  :center="false"
                  class="w-4 h-4"
                />
                {{
                  isSaving
                    ? "저장 중..."
                    : isEditMode
                      ? "수정 완료"
                      : "추가하기"
                }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 이메일 미리보기 모달 -->
    <div
      v-if="isEmailPreviewOpen"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
    >
      <div
        class="flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden border border-border bg-card shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        <div class="p-6 border-b border-border flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="flex h-9 w-9 items-center justify-center border border-border/70 bg-primary/10">
              <Mail class="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 class="text-heading font-semibold text-admin tracking-wide">
                이메일 미리보기
              </h2>
              <p class="text-caption text-muted-foreground mt-0.5">
                {{ emailTemplates.find(t => t.type === selectedEmailTemplate)?.name }}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            @click="closeEmailPreview"
          >
            <X class="w-5 h-5" />
          </Button>
        </div>

        <div class="flex-1 overflow-auto bg-muted/20 p-4">
          <div class="overflow-hidden border border-border/70 bg-white">
            <iframe
              v-if="emailPreviewHtml"
              :srcdoc="emailPreviewHtml"
              class="w-full h-[600px] border-0"
              title="이메일 미리보기"
            />
          </div>
        </div>

        <div class="p-4 border-t border-border flex justify-end">
          <Button
            variant="outline"
            class="font-medium"
            @click="closeEmailPreview"
          >
            닫기
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.site-image-admin-page :deep(input),
.site-image-admin-page :deep([role="combobox"]) {
  border-radius: 0;
  border-color: hsl(var(--border) / 0.7);
  background: hsl(var(--card));
  box-shadow: none;
}

.site-image-admin-page :deep(input:focus-visible),
.site-image-admin-page :deep([role="combobox"]:focus) {
  outline: none;
  box-shadow: none;
}

.site-image-admin-table th,
.site-image-admin-table td {
  border-left: 1px solid hsl(var(--border) / 0.42);
  vertical-align: middle;
}

.site-image-admin-table th:first-child,
.site-image-admin-table td:first-child {
  border-left: 0;
}

.site-image-admin-table tbody td {
  border-top: 1px solid hsl(var(--border) / 0.62);
}

.site-image-admin-table thead th {
  line-height: 1.2;
}
</style>
