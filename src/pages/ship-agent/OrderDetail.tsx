import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Card,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  Divider,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import ExpandMore from '@mui/icons-material/ExpandMore';
import WarningAmber from '@mui/icons-material/WarningAmber';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import AccessTime from '@mui/icons-material/AccessTime';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import Close from '@mui/icons-material/Close';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOrderDetail, type LineItemDetail } from '@/hooks/useOrderDetail';
import { uploadOrderDocument, openDocument } from '@/lib/storage';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import TimelineTracker from '@/components/shared/TimelineTracker';
import DocumentCard from '@/components/shared/DocumentCard';
import MessageThread from '@/components/shared/MessageThread';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import { palette, fonts, radius } from '@/constants/theme';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';

export default function AgentOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? null;
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const queryClient = useQueryClient();

  const { order, lineItems, documents, isLoading, error, refetch } = useOrderDetail(orderId);

  const [chatLineItem, setChatLineItem] = useState<LineItemDetail | null>(null);
  const [uploading, setUploading] = useState(false);
  const [markingInExecution, setMarkingInExecution] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`ship-agent-order:${orderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_line_items', filter: `order_id=eq.${orderId}` },
        () => queryClient.invalidateQueries({ queryKey: ['order', orderId, 'line-items'] })
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_documents', filter: `order_id=eq.${orderId}` },
        () => queryClient.invalidateQueries({ queryKey: ['order', orderId, 'documents'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, queryClient]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !orderId) return;
    setUploading(true);
    const { error: uploadError } = await uploadOrderDocument({
      orderId,
      lineItemId: orderId, // order-level coordination document
      file,
      documentType: 'other',
    });
    setUploading(false);
    if (uploadError) {
      setSnack(uploadError.message);
      return;
    }
    await refetch();
    setSnack('Document uploaded.');
  };

  const handleMarkInExecution = async () => {
    if (!orderId) return;
    setMarkingInExecution(true);
    const { error: updateError } = await supabase
      .from('orders')
      .update({ overall_status: 'in_execution' })
      .eq('id', orderId);
    setMarkingInExecution(false);
    if (updateError) {
      setSnack(updateError.message);
      return;
    }
    await refetch();
    setSnack('Order marked as In Execution.');
  };

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <IconButton onClick={() => navigate(-1)}>
        <ArrowBack sx={{ color: palette.fogWhite }} />
      </IconButton>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
        Order Detail
      </Typography>
    </Box>
  );

  if (isLoading) {
    return (
      <Box>
        {header}
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      </Box>
    );
  }

  if (error || !order) {
    return (
      <Box>
        {header}
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load this order.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {header}
      <input ref={fileInputRef} type="file" accept={ACCEPT} hidden onChange={handleFileChange} />

      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 13 }}>
          {order.order_number ?? 'Draft Order'}
        </Typography>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 24 }}>
          {order.vessel_name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          <LocationOnOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{order.port?.name ?? 'Port'}</Typography>
          {order.eta && (
            <>
              <AccessTime sx={{ fontSize: 14, color: palette.hullGray, ml: 1 }} />
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                ETA {dayjs(order.eta).format('MMM D, HH:mm')}
              </Typography>
            </>
          )}
        </Box>
        {order.captain?.full_name && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <PersonOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
            <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>Captain {order.captain.full_name}</Typography>
          </Box>
        )}
        <Box sx={{ mt: 1 }}>
          <OrderStatusBadge status={order.overall_status} />
        </Box>
      </Box>

      <Card sx={{ mb: 2 }}>
        <TimelineTracker current={order.overall_status} />
      </Card>

      {order.charter_comments && (
        <Card sx={{ mb: 2, p: 2, borderLeft: `3px solid ${palette.signalAmber}` }}>
          <Typography sx={{ color: palette.signalAmber, fontWeight: 600, fontSize: 12, mb: 0.5 }}>
            Charter Note
          </Typography>
          <Typography sx={{ color: palette.fogWhite, fontSize: 14 }}>{order.charter_comments}</Typography>
        </Card>
      )}

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mt: 2, mb: 1 }}>
        Services ({lineItems.length})
      </Typography>
      {lineItems.length === 0 ? (
        <Typography sx={{ color: palette.hullGray, mb: 1 }}>No services on this order.</Typography>
      ) : (
        lineItems.map((li) => {
          const supplierName =
            li.supplier_mapping?.supplier_profile?.company_name ??
            li.supplier_mapping?.supplier_profile?.full_name ??
            'Unassigned';
          return (
            <Accordion key={li.id} disableGutters sx={{ mb: 1, bgcolor: palette.oceanMid, '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ExpandMore sx={{ color: palette.hullGray }} />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ServiceCategoryIcon name={li.service_categories?.name ?? ''} size={22} color={palette.steelBlue} />
                  <Box>
                    <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                      {li.service_categories?.name ?? 'Service'}
                    </Typography>
                    <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                      {`${li.quantity ?? ''} ${li.unit ?? ''}`.trim()}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ bgcolor: palette.navyDeep }}>
                <Box sx={{ mb: 1 }}>
                  <OrderStatusBadge status={li.line_status} kind="line" />
                </Box>
                <DetailLine label="Supplier" value={supplierName} />
                {li.requested_datetime && (
                  <DetailLine label="Requested" value={dayjs(li.requested_datetime).format('MMM D, YYYY · HH:mm')} />
                )}
                {li.specifications && <DetailLine label="Specifications" value={li.specifications} />}
                {li.total_price != null && <DetailLine label="Line Total" value={`$${li.total_price.toFixed(2)}`} />}
                {li.supplier_decline_reason && <DetailLine label="Decline Reason" value={li.supplier_decline_reason} />}
                <Button
                  variant="outlined"
                  startIcon={<ChatBubbleOutlined />}
                  onClick={() => setChatLineItem(li)}
                  sx={{ mt: 1.5, color: palette.steelBlue, borderColor: palette.steelBlue }}
                >
                  Open Chat
                </Button>
              </AccordionDetails>
            </Accordion>
          );
        })
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 1 }}>
        <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16 }}>Documents</Typography>
        <Button
          variant="contained"
          size="small"
          disabled={uploading}
          startIcon={uploading ? <CircularProgress size={14} sx={{ color: palette.fogWhite }} /> : <CloudUploadOutlined />}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </Button>
      </Box>
      {documents.length === 0 ? (
        <Typography sx={{ color: palette.hullGray, mb: 1 }}>No documents yet. Upload coordination paperwork.</Typography>
      ) : (
        documents.map((doc) => (
          <DocumentCard key={doc.id} document={doc} onOpen={(d) => d.file_url && openDocument(d.file_url)} />
        ))
      )}

      <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1, maxWidth: 360 }}>
        {order.overall_status === 'active' && (
          <Button
            variant="contained"
            disabled={markingInExecution}
            onClick={handleMarkInExecution}
            sx={{ height: 48, bgcolor: palette.steelBlue, '&:hover': { bgcolor: '#2C5E8A' } }}
          >
            {markingInExecution ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Mark In Execution'}
          </Button>
        )}
      </Box>

      <Dialog
        open={chatLineItem !== null}
        onClose={() => setChatLineItem(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, height: '80vh', borderRadius: `${radius.lg}px` } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600 }}>
            {chatLineItem?.service_categories?.name ?? 'Chat'}
          </Typography>
          <IconButton onClick={() => setChatLineItem(null)}>
            <Close sx={{ color: palette.hullGray }} />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: palette.oceanMid }} />
        {orderId && chatLineItem && userId && (
          <MessageThread orderId={orderId} lineItemId={chatLineItem.id} currentUserId={userId} height="100%" />
        )}
      </Dialog>

      <Snackbar open={snack !== null} autoHideDuration={4000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="info">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
      <Typography sx={{ color: palette.hullGray, fontSize: 13, fontWeight: 500 }}>{label}:</Typography>
      <Typography sx={{ color: palette.fogWhite, fontSize: 13 }}>{value}</Typography>
    </Box>
  );
}
