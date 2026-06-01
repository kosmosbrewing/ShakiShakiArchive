import type { CartItem } from "@/types/api";

export interface CartItemStockState {
  unavailable: boolean;
  availableStock: number | null;
  message: string;
}

export const getCartItemStockState = (item: CartItem): CartItemStockState => {
  if (item.product?.isAvailable === false) {
    return {
      unavailable: true,
      availableStock: null,
      message: "현재 판매하지 않는 상품입니다.\n장바구니에서 제외해주세요.",
    };
  }

  if (!item.variant) {
    return {
      unavailable: true,
      availableStock: null,
      message: "선택한 옵션을 확인할 수 없습니다.\n장바구니에서 제외한 뒤 다시 담아주세요.",
    };
  }

  if (item.variant.isAvailable === false) {
    return {
      unavailable: true,
      availableStock: item.variant.stockQuantity ?? null,
      message: "선택하신 옵션은 현재 판매하지 않습니다.\n장바구니에서 제외해주세요.",
    };
  }

  const availableStock =
    typeof item.variant.stockQuantity === "number"
      ? item.variant.stockQuantity
      : null;

  if (availableStock === null) {
    return {
      unavailable: false,
      availableStock,
      message: "",
    };
  }

  if (availableStock <= 0) {
    return {
      unavailable: true,
      availableStock,
      message: "재고가 소진되었습니다.\n장바구니에서 제외해주세요.",
    };
  }

  if (item.quantity > availableStock) {
    return {
      unavailable: true,
      availableStock,
      message: `남은 재고보다 수량이 많습니다.\n남은 재고: ${availableStock}개`,
    };
  }

  return {
    unavailable: false,
    availableStock,
    message: "",
  };
};

export const hasUnavailableCartItems = (items: CartItem[]) =>
  items.some((item) => getCartItemStockState(item).unavailable);
