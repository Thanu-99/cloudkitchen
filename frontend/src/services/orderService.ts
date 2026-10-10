import api from "./api";

export interface OrderRequest {
  restaurant: string;
  item: string;
  quantity: number;
}

export interface OrderResult {
  restaurant: string;
  item: string;
  quantity: number;
  unitPrice: number;
  total: number;
  processingTimeMs: number;
}

export interface OrderResponse {
  message: string;
  order: OrderResult;
}

export const placeOrder = async (
  restaurant: string,
  item: string,
  quantity: number = 1
): Promise<OrderResponse> => {
  const response = await api.post<OrderResponse>(
    "/api/order",
    {
      restaurant,
      item,
      quantity,
    }
  );

  return response.data;
};