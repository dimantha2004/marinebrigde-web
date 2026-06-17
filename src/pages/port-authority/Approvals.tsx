import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Button,
  Chip,
  Dialog,
  Divider,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import VerifiedUserOutlined from '@mui/icons-material/VerifiedUserOutlined';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import AccessTime from '@mui/icons-material/AccessTime';
import OpenInNew from '@mui/icons-material/OpenInNew';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import LocalOfferOutlined from '@mui/icons-material/LocalOfferOutlined';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import { useOrderDetail, type LineItemDetail } from '@/hooks/useOrderDetail';
import { supabase } from '@/lib/supabase';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import DocumentCard from '@/components/shared/DocumentCard';
import { openDocument } from '@/lib/storage';
import { SERVICE_CATEGORIES } from '@/constants/serviceCategories';
import type { Order } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

const PA_SERVICE_NAMES = new Set(
  SERVICE_CATEGORIES.filter((c) => c.requiresPortAuthorityApproval).map((c) => c.name)
);

function isPaService(name: string | null | undefined): boolean {
  return !!name && PA_SERVICE_NAMES.has(name);
}

function formatQty(qty: number | null, unit: string | null): string {
  if (qty == null) return unit ?? '';
  return `${qty}${unit ? ` ${unit}` : ''}`;
}

export default function PortApprovals() {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data: orders, isLoading, error } = useOrders('port_authority', userId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const pending = useMemo(
    () => orders.filter((o: Order) => o.overall_status === 'pending_port_approval'),
    [orders]
  );

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Port Approvals
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load approval requests.</Typography>
        </Box>
      ) : pending.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <VerifiedUserOutlined sx={{ color: palette.hullGray, fontSize: 36 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            No orders awaiting port sign-off. You're all caught up.
          </Typography>
        </Box>
      ) : (
        pending.map((order) => (
          <Card
            key={order.id}
            onClick={() => setSelectedId(order.id)}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 14 }}>
                {order.order_number ?? 'Draft Order'}
              </Typography>
              <OrderStatusBadge status={order.overall_status} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <DirectionsBoatOutlined sx={{ fontSize: 15, color: palette.hullGray }} />
              <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14 }}>
                {order.vessel_name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <AccessTime sx={{ fontSize: 15, color: palette.hullGray }} />
              <Typography sx={{ color: palette.fogWhite, fontSize: 14, flex: 1 }}>
                {order.eta ? `ETA ${dayjs(order.eta).format('MMM D, HH:mm')}` : 'No ETA'}
              </Typography>
              <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                {dayjs(order.created_at).format('MMM D')}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                mt: 1.5,
                pt: 1,
                borderTop: `1px solid ${palette.navyDeep}`,
              }}
            >
              <OpenInNew sx={{ fontSize: 15, color: palette.steelBlue }} />
              <Typography sx={{ color: palette.steelBlue, fontWeight: 500, fontSize: 13 }}>
                Click to review &amp; sign off
              </Typography>
            </Box>
          </Card>
        ))
      )}

      <Dialog
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, maxHeight: '88vh', borderRadius: `${radius.lg}px` } } }}
      >
        {selectedId && (
          <OrderDetailSheet
            orderId={selectedId}
            onClose={() => setSelectedId(null)}
            onApproved={() => {
              setSelectedId(null);
              setSnack('Order activated — stakeholders notified.');
            }}
            onError={(msg) => setSnack(msg)}
          />
        )}
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="info">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function OrderDetailSheet({
  orderId,
  onClose,
  onApproved,
  onError,
}: {
  orderId: string;
  onClose: () => void;
  onApproved: () => void;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const { order, lineItems, documents, isLoading, error } = useOrderDetail(orderId);
  const [submitting, setSubmitting] = useState(false);

  const paItems = lineItems.filter((li: LineItemDetail) => isPaService(li.service_categories?.name));
  const otherItems = lineItems.filter((li: LineItemDetail) => !isPaService(li.service_categories?.name));

  const handleApprove = async () => {
    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ overall_status: 'active' })
        .eq('id', orderId);
      if (updateError) throw updateError;

      const { error: fnError } = await supabase.functions.invoke('notify-stakeholders', {
        body: {
          order_id: orderId,
          event: 'port_authority_approved',
          type: 'order_update',
          title: 'Port Authority Approved',
          body: `${order?.order_number ?? 'Order'} has been activated by the port authority.`,
          recipients: ['captain', 'ship_agent'],
        },
      });
      if (fnError) onError('Order activated, but stakeholder notification failed.');

      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      onApproved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to approve order.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <CircularProgress sx={{ color: palette.steelBlue }} />
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
        <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load this order.</Typography>
        <Button onClick={onClose} sx={{ color: palette.steelBlue, mt: 1 }}>
          Close
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
          p: 2,
          borderBottom: `1px solid ${palette.oceanMid}`,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 13 }}>
            {order.order_number ?? 'Draft Order'}
          </Typography>
          <Typography noWrap sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 20 }}>
            {order.vessel_name}
          </Typography>
        </Box>
        <OrderStatusBadge status={order.overall_status} />
        <IconButton onClick={onClose} size="small">
          <Close sx={{ color: palette.hullGray }} />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        <DetailRow icon={<LocationOnOutlined sx={{ fontSize: 16, color: palette.hullGray }} />} text={order.port?.name ?? 'Port unassigned'} />
        <DetailRow
          icon={<AccessTime sx={{ fontSize: 16, color: palette.hullGray }} />}
          text={`${order.eta ? `ETA ${dayjs(order.eta).format('MMM D, YYYY HH:mm')}` : 'No ETA'}${
            order.etd ? `  ·  ETD ${dayjs(order.etd).format('MMM D, HH:mm')}` : ''
          }`}
        />
        {order.imo_number && (
          <DetailRow icon={<LocalOfferOutlined sx={{ fontSize: 16, color: palette.hullGray }} />} text={`IMO ${order.imo_number}`} />
        )}

        <SectionTitle>Port-Regulated Services ({paItems.length})</SectionTitle>
        {paItems.length === 0 ? (
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>No port-regulated line items on this order.</Typography>
        ) : (
          paItems.map((li) => (
            <Card key={li.id} sx={{ p: 2, mb: 1, borderLeft: `3px solid ${palette.signalAmber}` }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <VerifiedUser sx={{ fontSize: 16, color: palette.signalAmber }} />
                <Typography noWrap sx={{ flex: 1, color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                  {li.service_categories?.name ?? 'Service'}
                </Typography>
                <Chip label="Requires approval" size="small" sx={{ bgcolor: palette.signalAmber, color: palette.navyDeep, fontSize: 10, height: 22 }} />
              </Box>
              <Typography sx={{ fontFamily: 'monospace', color: palette.steelBlue, fontSize: 13, mt: 0.5 }}>
                {formatQty(li.quantity, li.unit)}
              </Typography>
              {li.specifications && (
                <Typography sx={{ color: palette.hullGray, fontSize: 12, mt: 0.5 }}>{li.specifications}</Typography>
              )}
            </Card>
          ))
        )}

        {otherItems.length > 0 && (
          <>
            <SectionTitle>Other Services ({otherItems.length})</SectionTitle>
            <Typography sx={{ color: palette.hullGray, fontSize: 12, mb: 1 }}>
              Read-only — outside port authority remit.
            </Typography>
            {otherItems.map((li) => (
              <Card key={li.id} sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Inventory2Outlined sx={{ fontSize: 16, color: palette.hullGray }} />
                  <Typography noWrap sx={{ flex: 1, color: palette.hullGray, fontWeight: 500, fontSize: 15 }}>
                    {li.service_categories?.name ?? 'Service'}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: 'monospace', color: palette.steelBlue, fontSize: 13, mt: 0.5 }}>
                  {formatQty(li.quantity, li.unit)}
                </Typography>
              </Card>
            ))}
          </>
        )}

        <SectionTitle>Documents ({documents.length})</SectionTitle>
        {documents.length === 0 ? (
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>No documents attached.</Typography>
        ) : (
          documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onOpen={(d) => d.file_url && openDocument(d.file_url)} />
          ))
        )}
      </Box>

      <Divider sx={{ borderColor: palette.oceanMid }} />
      <Box sx={{ display: 'flex', gap: 1, p: 2 }}>
        <Button fullWidth onClick={onClose} disabled={submitting} sx={{ color: palette.hullGray }}>
          Close
        </Button>
        <Button
          fullWidth
          variant="contained"
          startIcon={submitting ? undefined : <CheckCircle />}
          onClick={handleApprove}
          disabled={submitting}
          sx={{ bgcolor: palette.engineGreen, '&:hover': { bgcolor: palette.engineGreen } }}
        >
          {submitting ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Approve (Activate)'}
        </Button>
      </Box>
    </Box>
  );
}

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
      {icon}
      <Typography sx={{ color: palette.fogWhite, fontSize: 14 }}>{text}</Typography>
    </Box>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 15, mt: 2, mb: 1 }}>
      {children}
    </Typography>
  );
}
