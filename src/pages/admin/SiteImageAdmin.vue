<script setup lang="ts">
// src/pages/admin/SiteImageAdmin.vue
// 사이트 이미지 관리 페이지 (Hero, Marquee)

import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useAlert } from "@/composables/useAlert";
import { ADMIN_MESSAGES } from "@/lib/messages";
import {
  fetchAdminSiteImages,
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
const { showAlert, showDestructiveConfirm } = useAlert();

// 상태
const siteImages = ref<SiteImage[]>([]);
const isLoading = ref(false);
const isModalOpen = ref(false);
const isEditMode = ref(false);
const isUploading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");
const activeTab = ref<"hero" | "marquee" | "email">("hero");

// 이메일 템플릿 미리보기 상태
const emailTemplates = ref<EmailTemplateInfo[]>([]);
const selectedEmailTemplate = ref<EmailTemplateType | null>(null);
const emailPreviewHtml = ref("");
const isEmailLoading = ref(false);
const isEmailPreviewOpen = ref(false);

// 타입별 최대 개수 제한
const MAX_HERO_IMAGES = 3;
const MAX_MARQUEE_IMAGES = 6;

// 폼 데이터
const initialForm = {
  id: 0,
  type: "hero" as SiteImageType,
  imageUrl: "",
  linkUrl: "",
  displayOrder: 0,
  isActive: true,
};
const form = ref({ ...initialForm });

// 타입별 이미지 필터링
const heroImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "hero")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

const marqueeImages = computed(() =>
  siteImages.value
    .filter((img) => img.type === "marquee")
    .sort((a, b) => a.displayOrder - b.displayOrder),
);

// 현재 탭의 이미지
const currentImages = computed(() =>
  activeTab.value === "hero" ? heroImages.value : marqueeImages.value,
);

// 추가 가능 여부
const canAddMore = computed(() => {
  if (activeTab.value === "email") return false;
  if (activeTab.value === "hero") {
    return heroImages.value.length < MAX_HERO_IMAGES;
  }
  return marqueeImages.value.length < MAX_MARQUEE_IMAGES;
});

// 데이터 로드 (showLoading: 초기 로드 시에만 스피너 표시)
const loadData = async (showLoading = true) => {
  try {
    if (showLoading) isLoading.value = true;
    siteImages.value = await fetchAdminSiteImages();
  } catch (error) {
    console.error(error);
  } finally {
    isLoading.value = false;
  }
};

// 모달 열기 (추가)
const openCreateModal = () => {
  if (!canAddMore.value) {
    const max =
      activeTab.value === "hero" ? MAX_HERO_IMAGES : MAX_MARQUEE_IMAGES;
    const imageType = activeTab.value === "hero" ? "Hero" : "Marquee";
    showAlert(
      ADMIN_MESSAGES.imageTypeLimitExceeded
        .replace("{type}", imageType)
        .replace("{max}", String(max)),
      { type: "error" }
    );
    return;
  }
  isEditMode.value = false;
  // email 탭에서는 이미지 추가 불가 (canAddMore에서 이미 false 처리됨)
  const imageType = activeTab.value === "email" ? "hero" : activeTab.value;
  form.value = {
    ...initialForm,
    type: imageType as SiteImageType,
    displayOrder: currentImages.value.length,
  };
  errorMessage.value = "";
  isModalOpen.value = true;
};

// 모달 열기 (수정)
const openEditModal = (image: SiteImage) => {
  isEditMode.value = true;
  form.value = {
    id: image.id,
    type: image.type,
    imageUrl: image.imageUrl,
    linkUrl: image.linkUrl || "",
    displayOrder: image.displayOrder,
    isActive: image.isActive,
  };
  errorMessage.value = "";
  isModalOpen.value = true;
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
    return;
  }

  // 파일 크기 검증 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    errorMessage.value = ADMIN_MESSAGES.fileSizeLimit;
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
      showAlert(ADMIN_MESSAGES.siteImageUpdateSuccess);
    } else {
      const { image } = await createSiteImage(payload);
      // 로컬 상태에 추가
      if (image) siteImages.value.push(image);
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
  const deletedImage = siteImages.value[deletedIndex];
  siteImages.value.splice(deletedIndex, 1);

  try {
    await deleteSiteImage(id);
  } catch (e: any) {
    // 실패 시 복원
    siteImages.value.splice(deletedIndex, 0, deletedImage);
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

  try {
    await updateSiteImage(image.id, { isActive: newValue });
  } catch (e: any) {
    // 실패 시 롤백
    targetImage.isActive = !newValue;
    showAlert(e.message, { type: "error" });
  }
};

// 순서 변경 (위로) - 낙관적 업데이트
const moveUp = async (index: number) => {
  if (index === 0) return;

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
    await reorderSiteImages({ type: activeTab.value as SiteImageType, imageIds });
  } catch (e: any) {
    // 실패 시 롤백
    images[index].displayOrder = images[index - 1].displayOrder;
    images[index - 1].displayOrder = prevOrder;
    showAlert(e.message, { type: "error" });
  }
};

// 순서 변경 (아래로) - 낙관적 업데이트
const moveDown = async (index: number) => {
  if (index === currentImages.value.length - 1) return;

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
    await reorderSiteImages({ type: activeTab.value as SiteImageType, imageIds });
  } catch (e: any) {
    // 실패 시 롤백
    images[index + 1].displayOrder = images[index].displayOrder;
    images[index].displayOrder = currentOrder;
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
  <div class="w-11/12 max-w-screen-2xl mx-auto px-4 py-24 sm:py-16">
    <AdminNavigationTabs />
    <div class="flex justify-between items-end">
      <div>
        <h3 class="text-heading text-admin tracking-wider">
          사이트 이미지 관리
        </h3>
        <p class="text-body text-admin-muted mt-1 mb-3">
          Hero 및 Marquee 이미지를 관리합니다.
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
    <Separator class="mb-6"></Separator>

    <!-- 탭 -->
    <div class="flex gap-2 mb-6">
      <Button
        @click="activeTab = 'hero'"
        :variant="activeTab === 'hero' ? undefined : 'outline'"
        :class="
          activeTab === 'hero'
            ? 'gap-2 bg-primary hover:bg-primary/80 text-white font-semibold'
            : 'gap-2'
        "
      >
        <ImageIcon class="w-4 h-4" />
        Hero ({{ heroImages.length }}/{{ MAX_HERO_IMAGES }})
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
    <Card v-if="activeTab === 'email'" class="overflow-hidden border-none shadow-lg">
      <CardContent class="p-0">
        <LoadingSpinner v-if="isEmailLoading && !isEmailPreviewOpen" />
        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[600px]">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-5">템플릿명</th>
                <th class="px-6 py-5">설명</th>
                <th class="px-6 py-5 text-right pr-10">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="template in emailTemplates"
                :key="template.type"
                class="hover:bg-muted/30 transition-colors group"
              >
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="p-2 bg-primary/10 rounded-lg">
                      <Mail class="w-4 h-4 text-primary" />
                    </div>
                    <span class="text-body font-medium text-foreground">
                      {{ template.name }}
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span class="text-body text-muted-foreground">
                    {{ template.description }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
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
    <Card v-else-if="!isLoading" class="overflow-hidden border-none shadow-lg">
      <CardContent class="p-0">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-[800px]">
            <thead
              class="bg-muted/50 text-caption font-bold text-admin-muted uppercase tracking-tight"
            >
              <tr>
                <th class="px-6 py-5 w-12">순서</th>
                <th class="px-6 py-5">이미지</th>
                <th class="px-6 py-5">링크 URL</th>
                <th class="px-6 py-5 text-center">상태</th>
                <th class="px-6 py-5 text-right pr-10">작업</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr
                v-for="(image, index) in currentImages"
                :key="image.id"
                class="hover:bg-muted/30 transition-colors group"
              >
                <td class="px-6 py-4">
                  <div class="flex flex-col gap-1">
                    <button
                      @click="moveUp(index)"
                      :disabled="index === 0"
                      class="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <GripVertical class="w-4 h-4 rotate-90" />
                    </button>
                    <span class="text-center text-caption text-admin-muted">
                      {{ index + 1 }}
                    </span>
                    <button
                      @click="moveDown(index)"
                      :disabled="index === currentImages.length - 1"
                      class="p-1 hover:bg-muted rounded disabled:opacity-30"
                    >
                      <GripVertical class="w-4 h-4 -rotate-90" />
                    </button>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div
                    class="h-20 w-32 bg-muted rounded-xl overflow-hidden border border-border shadow-sm group-hover:scale-105 transition-transform"
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
                <td class="px-6 py-4">
                  <div v-if="image.linkUrl" class="flex items-center gap-2">
                    <a
                      :href="image.linkUrl"
                      target="_blank"
                      class="text-caption text-primary hover:underline flex items-center gap-1"
                    >
                      {{ image.linkUrl.substring(0, 40)
                      }}{{ image.linkUrl.length > 40 ? "..." : "" }}
                      <ExternalLink class="w-3 h-3" />
                    </a>
                  </div>
                  <span v-else class="text-caption text-admin-muted">-</span>
                </td>
                <td class="px-6 py-4 text-center">
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
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      @click="openEditModal(image)"
                      class="text-muted-foreground hover:text-primary"
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
                  등록된
                  {{ activeTab === "hero" ? "Hero" : "Marquee" }} 이미지가
                  없습니다.
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
        class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200"
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
              :disabled="isSaving || isUploading"
              class="mb-2"
            >
              <X class="w-5 h-5" />
            </Button>
          </div>
          <Separator></Separator>

          <form @submit.prevent="handleSave" class="space-y-6 mt-6">
            <!-- 타입 표시 -->
            <div class="space-y-2">
              <Label class="text-admin">타입</Label>
              <div class="px-4 py-2 bg-muted rounded-lg text-body">
                {{ form.type === "hero" ? "Hero" : "Marquee" }}
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
                    isUploading
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
                    :disabled="isUploading"
                    @change="handleFileSelect"
                  />
                </label>
                <span class="text-caption text-admin-muted">
                  JPEG, PNG, GIF, WebP (최대 10MB)
                </span>
              </div>

              <!-- 이미지 미리보기 -->
              <div
                v-if="form.imageUrl"
                class="relative w-full h-48 bg-muted rounded-lg overflow-hidden border border-border"
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
                  class="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X class="w-4 h-4" />
                </button>
              </div>
              <div
                v-else
                class="border-2 border-dashed border-border rounded-lg p-8 text-center text-admin-muted"
              >
                <ImageIcon class="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p class="text-body">이미지를 업로드해주세요</p>
              </div>
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
                :disabled="isSaving || isUploading"
              >
                취소
              </Button>
              <Button
                type="submit"
                :disabled="isSaving || isUploading || !form.imageUrl"
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
        class="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col"
      >
        <div class="p-6 border-b border-border flex justify-between items-center">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-primary/10 rounded-lg">
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

        <div class="flex-1 overflow-auto bg-muted/30 p-4">
          <div class="bg-white rounded-lg shadow-sm overflow-hidden">
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
