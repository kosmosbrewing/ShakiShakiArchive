// src/composables/useSeo.ts
// SEO 메타 태그 동적 관리 Composable

import { useHead } from '@vueuse/head';
import type { SeoData } from '@/types/api';

/**
 * SEO 메타 태그를 동적으로 설정합니다.
 * OpenGraph와 Twitter Card를 포함한 모든 메타 태그를 설정합니다.
 *
 * @param seoData 백엔드 SEO API에서 받은 데이터
 */
export const useSeo = (seoData: SeoData) => {
  useHead({
    title: seoData.openGraph.title,
    meta: [
      // 기본 메타 태그
      { name: 'description', content: seoData.openGraph.description },

      // OpenGraph (카카오톡, 페이스북 등)
      { property: 'og:title', content: seoData.openGraph.title },
      { property: 'og:description', content: seoData.openGraph.description },
      { property: 'og:url', content: seoData.openGraph.url },
      { property: 'og:type', content: seoData.openGraph.type },
      { property: 'og:site_name', content: seoData.openGraph.siteName },
      { property: 'og:locale', content: seoData.openGraph.locale },

      // 이미지가 있는 경우만 추가
      ...(seoData.openGraph.image
        ? [{ property: 'og:image', content: seoData.openGraph.image }]
        : []
      ),

      // Twitter Card
      { name: 'twitter:card', content: seoData.openGraph.twitter.card },
      { name: 'twitter:title', content: seoData.openGraph.twitter.title },
      { name: 'twitter:description', content: seoData.openGraph.twitter.description },

      // Twitter 이미지가 있는 경우만 추가
      ...(seoData.openGraph.twitter.image
        ? [{ name: 'twitter:image', content: seoData.openGraph.twitter.image }]
        : []
      ),
    ],
  });
};
