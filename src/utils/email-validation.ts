/**
 * 일회용(임시) 이메일 서비스 도메인 목록
 * 회원가입 시 실제 사용자 확인을 위해 차단
 */
export const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // 주요 일회용 이메일 서비스
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "temp-mail.de",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamail.org",
  "guerrillamail.biz",
  "sharklasers.com",
  "grr.la",
  "guerrillamailblock.com",
  "pokemail.net",
  "spam4.me",
  "mailinator.com",
  "mailinator.net",
  "mailinator2.com",
  "mailinator.org",
  "sogetthis.com",
  "mailin8r.com",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "10minemail.com",
  "throwaway.email",
  "throwawaymail.com",
  "maildrop.cc",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "cool.fr.nf",
  "jetable.fr.nf",
  "nospam.ze.tc",
  "nomail.xl.cx",
  "mega.zik.dj",
  "speed.1s.fr",
  "courriel.fr.nf",
  "moncourrier.fr.nf",
  "monemail.fr.nf",
  "monmail.fr.nf",
  "hide.biz.st",
  "mymail.infos.st",
  "getairmail.com",
  "getairmail.ga",
  "getairmail.gq",
  "getairmail.ml",
  "getairmail.cf",
  "tempinbox.com",
  "tempinbox.co.uk",
  "getnada.com",
  "fakeinbox.com",
  "fakeinbox.net",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trashmail.de",
  "trashmail.ws",
  "trash-mail.com",
  "emailondeck.com",
  "dispostable.com",
  "mintemail.com",
  "anonbox.net",
  "anonymbox.com",
  "emailsensei.com",
  "spam.la",
  "spamex.com",
  "spamgourmet.com",
  "spamgourmet.net",
  "spamgourmet.org",
  "incognitomail.com",
  "incognitomail.net",
  "incognitomail.org",
  "notsharingmy.info",
  "boximail.com",
  "mailinater.com",
  "soodonims.com",
  "spambog.com",
  "spambog.de",
  "spambog.ru",
  "tempail.com",
  "tempemail.com",
  "tempemail.net",
  "tempr.email",
  "mt2015.com",
  "mt2014.com",
  "thankyou2010.com",
  "trash2009.com",
  "mytrashmail.com",
  "mytrashmail.compookmail.com",
  "mailcatch.com",
  "inboxkitten.com",
  "mohmal.com",
  "moakt.com",
  "rootfest.net",
  "33mail.com",
  "crazymailing.com",
  "nervmich.net",
  "nervtmich.net",
  "wegwerfmail.de",
  "wegwerfmail.net",
  "wegwerfmail.org",
  "wegwerfemail.de",
  "wegwerfemail.com",
  "emailtemporar.ro",
  "emailtemporal.org",
  "emailtemporal.net",
  "binkmail.com",
  "bobmail.info",
  "clipmail.eu",
  "despam.it",
  "disposeamail.com",
  "discard.email",
  "discardmail.com",
  "discardmail.de",
  "tmail.ws",
  "bugmenot.com",
  "deadaddress.com",
  "spamspot.com",
  "safetymail.info",
  "safetypost.de",
  "mail-temporaire.fr",
  "meltmail.com",
  "jetable.org",
  "jetable.net",
  "jetable.com",
  "filzmail.com",
  "trillianpro.com",
  "mailmoat.com",
  "10mail.org",
  "mytempemail.com",
  "20minutemail.com",
  "emailias.com",
  "emltmp.com",
  "armyspy.com",
  "cuvox.de",
  "dayrep.com",
  "einrot.com",
  "fleckens.hu",
  "gustr.com",
  "jourrapide.com",
  "rhyta.com",
  "superrito.com",
  "teleworm.us",
  "d3p.dk",
  "h8s.org",
  "email60.com",
  "eml.pp.ua",
  "emailfake.com",
  "emailfake.ml",
  "tmpmail.net",
  "tmpmail.org",
  "snapmail.cc",
  "trbvm.com",
  "trbvn.com",
  "xemaps.com",
  "nwldx.com",
  "txcct.com",
  "dropmail.me",
  "proxymail.eu",
  "spamthisplease.com",
  "mailforspam.com",
  "antichef.com",
  "antichef.net",
  "0815.ru",
  "0815.ry",
  "0815.su",
  "0clickemail.com",
  "1pad.de",
  "20email.eu",
  "2prong.com",
  "30minutemail.com",
  "3d-painting.com",
  "4warding.com",
  "4warding.net",
  "4warding.org",
  "60minutemail.com",
  "675hosting.com",
  "675hosting.net",
  "675hosting.org",
  "9ox.net",
  "a-bc.net",
  "agedmail.com",
  "ama-trade.de",
  "amilegit.com",
  "amiri.net",
  "amiriindustries.com",
  "anonmails.de",
  "anonymail.dk",
]);

/**
 * 이메일 도메인 검증 (RFC 5322/1035 준수)
 */
export function validateEmailDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  // 일회용 이메일 차단
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return false;
  }

  // RFC 준수 도메인 형식 검증
  const parts = domain.split(".");
  if (parts.length < 2) return false;

  for (const part of parts) {
    if (part.length === 0) return false; // 연속 점 방지
    if (part.length > 63) return false; // RFC 1035 제한
    if (part.startsWith("-") || part.endsWith("-")) return false;
    if (!/^[a-z0-9-]+$/i.test(part)) return false;
  }

  const tld = parts[parts.length - 1];
  if (tld.length < 2) return false;
  if (/^\d+$/.test(tld)) return false; // TLD는 숫자만 불가
  if (domain.length > 253) return false; // RFC 1035 전체 길이

  return true;
}

/**
 * 이메일 전체 검증
 */
export function validateEmail(email: string): {
  valid: boolean;
  error?: string;
} {
  // 기본 형식 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "유효한 이메일 주소를 입력해주세요" };
  }

  // 길이 제한
  if (email.length > 255) {
    return { valid: false, error: "이메일은 최대 255자까지 입력 가능합니다" };
  }

  // 도메인 검증
  if (!validateEmailDomain(email)) {
    return {
      valid: false,
      error: "일회용 이메일 주소는 사용할 수 없습니다. 실제 이메일 주소를 입력해주세요",
    };
  }

  return { valid: true };
}
