export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: "PENDING" | "PAID" | "CANCELLED";
}
export async function queryOrders(input: OrderQuery) {
  // Mock existing service. MCP search_code 可以搜索到这里。
  return {
    items: [],
    total: 0,
    input
  };
}
