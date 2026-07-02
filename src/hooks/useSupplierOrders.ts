import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { OrderLineItem, LineStatus } from '@/types/database';

export interface SupplierLineItem extends OrderLineItem {
  service_categories: { name: string; icon_name: string | null } | null;
  order:
    | {
        id: string;
        order_number: string | null;
        vessel_name: string;
        eta: string | null;
        etd: string | null;
        overall_status: string;
        port: { name: string } | null;
      }
    | null;
}

/**
 * Lists line items assigned to a supplier whose service_category_id matches
 * the supplier's own profile.service_category_id.
 */
export function useSupplierOrders(supplierUserId: string | null | undefined) {
  const profile = useAuthStore((s) => s.profile);

  const query = useQuery<SupplierLineItem[]>({
    queryKey: ['supplier-orders', supplierUserId, profile?.service_category_id],
    enabled: !!supplierUserId && !!profile?.service_category_id,
    queryFn: async () => {
      const catId = profile?.service_category_id;
      if (!catId) return [];
      const { data, error } = await supabase
        .from('order_line_items')
        .select(
          `*,
           service_categories ( name, icon_name ),
           order:orders!order_line_items_order_id_fkey (
             id, order_number, vessel_name, eta, etd, overall_status,
             port:ports!orders_port_id_fkey ( name )
           )`
        )
        .eq('service_category_id', catId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as unknown as SupplierLineItem[]) ?? [];
    },
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export interface UpdateLineStatusPayload {
  lineItemId: string;
  lineStatus: LineStatus;
  declineReason?: string | null;
}

/**
 * Updates a line item's status (and optional decline reason). The status-history
 * audit row is written by a DB trigger, so nothing extra is inserted here.
 */
export function useUpdateLineStatus() {
  const queryClient = useQueryClient();

  return useMutation<OrderLineItem, Error, UpdateLineStatusPayload>({
    mutationFn: async ({ lineItemId, lineStatus, declineReason }) => {
      const patch: { line_status: LineStatus; supplier_decline_reason?: string | null } = {
        line_status: lineStatus,
      };
      if (lineStatus === 'supplier_declined') {
        patch.supplier_decline_reason = declineReason ?? null;
      }

      const { data, error } = await supabase
        .from('order_line_items')
        .update(patch)
        .eq('id', lineItemId)
        .select('*')
        .single();
      if (error) throw error;
      return data as OrderLineItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.order_id] });
    },
  });
}

export interface QuotationPayload {
  amount: number;
  description?: string;
  fileUrl?: string;
}

export function useSubmitQuotations() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { lineItemId: string; quotes: QuotationPayload[] }>({
    mutationFn: async ({ lineItemId, quotes }) => {
      if (!quotes.length) throw new Error('At least one quotation is required.');

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw userError ?? new Error('Not authenticated.');

      // 1. Insert quotations
      const inserts = quotes.map((q) => ({
        order_line_item_id: lineItemId,
        amount: q.amount,
        description: q.description || null,
        file_url: q.fileUrl || null,
        supplier_profile_id: user.id,
      }));

      const { error: insertError } = await supabase.from('supplier_quotations').insert(inserts);
      if (insertError) throw insertError;

      // 2. Update line item status
      const { error: updateError } = await supabase
        .from('order_line_items')
        .update({ line_status: 'pending_charter_selection' })
        .eq('id', lineItemId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-orders'] });
      // We don't have order_id here easily without fetching, but invalidating 'supplier-orders' refreshes the list
    },
  });
}
