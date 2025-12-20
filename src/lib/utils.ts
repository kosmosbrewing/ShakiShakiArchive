import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const getDayName = (
  dateInput: string | Date | null | undefined,
  full: boolean = false
): string => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = weekDays[date.getDay()];

  return full ? `${dayName}` : dayName;
};
