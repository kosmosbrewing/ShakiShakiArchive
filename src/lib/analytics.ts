const GA_ID = import.meta.env.VITE_GA_ID?.trim();

let isInitialized = false;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function initAnalytics() {
  if (!GA_ID || isInitialized || typeof window === "undefined") {
    return;
  }

  window.dataLayer = window.dataLayer || [];

  // Google 표준: function 키워드 + arguments 사용 필수
  // arrow function + rest params는 Array를 push → gtag.js가 커맨드로 인식하지 못함
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments);
  };

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  // SPA 라우터에서 직접 page_view를 보내므로 자동 전송은 비활성화
  window.gtag("config", GA_ID, { send_page_view: false });

  isInitialized = true;
}

export function trackPageView(path: string) {
  if (!GA_ID || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}
