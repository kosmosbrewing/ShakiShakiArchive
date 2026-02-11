import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const getDayName = (
  dateInput: string | Date | null | undefined,
): string => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  // DB가 KST를 저장하고 pg 드라이버가 UTC로 전달하므로 UTC로 해석해야 이중 변환 방지
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
};
