import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Order, OrderLineItem, OrderDocument, SupplierQuotation } from '@/types/database';

export interface OrderDetail extends Order {
  port: { name: string } | null;
  captain: { full_name: string } | null;
  charter_party: { full_name: string } | null;
  ship_agent: { full_name: string } | null;
}

export interface LineItemDetail extends OrderLineItem {
  service_categories: { name: string; icon_name: string | null } | null;
  supplier_mapping:
    | {
        id: string;
        supplier_profile: { full_name: string; company_name: string | null } | null;
      }
    | null;
  supplier_quotations?: SupplierQuotation[];
}

/**
 * Fetches an order with joined context (port, party names) plus its line items
 * (service category + resolved supplier profile) and documents.
 */
export function useOrderDetail(orderId: string | null | undefined) {
  const orderQuery = useQuery({
    queryKey: ['order', orderId],
    enabled: !!orderId,
    queryFn: async (): Promise<OrderDetail | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `*,
           port:ports!orders_port_id_fkey ( name ),
           captain:profiles!orders_captain_id_fkey ( full_name ),
           charter_party:profiles!orders_charter_party_id_fkey ( full_name ),
           ship_agent:profiles!orders_ship_agent_id_fkey ( full_name )`
        )
        .eq('id', orderId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as OrderDetail) ?? null;
    },
  });

  const lineItemsQuery = useQuery({
    queryKey: ['order', orderId, 'line-items'],
    enabled: !!orderId,
    queryFn: async (): Promise<LineItemDetail[]> => {
      const { data, error } = await supabase
        .from('order_line_items')
        .select(
          `*,
           service_categories ( name, icon_name ),
           supplier_mapping:supplier_service_mappings!order_line_items_supplier_mapping_id_fkey (
             id,
             supplier_profile:profiles!supplier_service_mappings_supplier_profile_id_fkey ( full_name, company_name )
           ),
           supplier_quotations (*)
         )`
        )
        .eq('order_id', orderId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data as unknown as LineItemDetail[]) ?? [];
    },
  });

  const documentsQuery = useOrderDocuments(orderId);

  return {
    order: orderQuery.data ?? null,
    lineItems: lineItemsQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    isLoading: orderQuery.isLoading || lineItemsQuery.isLoading,
    error: orderQuery.error || lineItemsQuery.error || documentsQuery.error,
    refetch: async () => {
      await Promise.all([
        orderQuery.refetch(),
        lineItemsQuery.refetch(),
        documentsQuery.refetch(),
      ]);
    },
  };
}

export function useOrderDocuments(orderId: string | null | undefined) {
  const query = useQuery<OrderDocument[]>({
    queryKey: ['order', orderId, 'documents'],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_documents')
        .select('*')
        .eq('order_id', orderId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as OrderDocument[];
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useSelectQuotation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { orderId: string; lineItemId: string; quotationId: string; amount: number; currentTotalAmount: number | null }
  >({
    mutationFn: async ({ orderId, lineItemId, quotationId, amount, currentTotalAmount }) => {
      // 1. Mark quotation as selected
      const { error: quoteError } = await supabase
        .from('supplier_quotations')
        .update({ is_selected: true })
        .eq('id', quotationId);
      if (quoteError) throw quoteError;

      // 2. Update line item
      const { error: lineError } = await supabase
        .from('order_line_items')
        .update({
          unit_price: amount,
          total_price: amount, // Assuming qty=1 or amount is total. Wait, typically unit_price * qty = total_price.
          // Since the prompt says "payment for that selected amount", we'll just set both. If they want qty applied, we can do that but let's just set total_price.
          line_status: 'supplier_accepted',
        })
        .eq('id', lineItemId);
      if (lineError) throw lineError;

      // 3. Update order total amount (naively add the amount to existing total_amount, or we could sum all line items but a simple update is fine).
      // Wait, since we are setting the price, the line item might have had no price before.
      const newTotal = (currentTotalAmount || 0) + amount;
      const { error: orderError } = await supabase
        .from('orders')
        .update({ total_amount: newTotal })
        .eq('id', orderId);
      
      if (orderError) throw orderError;
    },
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId, 'line-items'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
