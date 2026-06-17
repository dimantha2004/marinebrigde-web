import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Card,
  Dialog,
  Divider,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import LockOutlined from '@mui/icons-material/LockOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import AccessTime from '@mui/icons-material/AccessTime';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import SwapVertOutlined from '@mui/icons-material/SwapVertOutlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import Close from '@mui/icons-material/Close';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSupplierOrders, type SupplierLineItem } from '@/hooks/useSupplierOrders';
import { useOrderDocuments } from '@/hooks/useOrderDetail';
import { uploadOrderDocument, openDocument } from '@/lib/storage';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import DocumentCard from '@/components/shared/DocumentCard';
import MessageThread from '@/components/shared/MessageThread';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import StatusUpdateSheet from '@/components/supplier/StatusUpdateSheet';
import { SUPPLIER_NEXT_ACTIONS, type LineStatus } from '@/constants/orderStatuses';
import type { OrderDocument } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.docx';

export default function SupplierOrderDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const orderId = id ?? null;
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useSupplierOrders(userId);
  const { data: documents, refetch: refetchDocs } = useOrderDocuments(orderId);

  const myLines = useMemo<SupplierLineItem[]>(
    () => data.filter((li) => li.order?.id === orderId),
    [data, orderId]
  );
  const orderContext = myLines[0]?.order ?? null;

  const [sheetLine, setSheetLine] = useState<SupplierLineItem | null>(null);
  const [chatLine, setChatLine] = useState<SupplierLineItem | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadLine = useRef<string | null>(null);

  const docsByLine = useMemo(() => {
    const map = new Map<string, OrderDocument[]>();
    for (const doc of documents) {
      if (!doc.order_line_item_id) continue;
      const arr = map.get(doc.order_line_item_id) ?? [];
      arr.push(doc);
      map.set(doc.order_line_item_id, arr);
    }
    return map;
  }, [documents]);

  useEffect(() => {
    if (!orderId) return;
    const channel = supabase
      .channel(`supplier-order:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_line_items', filter: `order_id=eq.${orderId}` },
        () => queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
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

  const triggerUpload = (lineId: string) => {
    pendingUploadLine.current = lineId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const lineId = pendingUploadLine.current;
    e.target.value = '';
    if (!file || !lineId || !orderId) return;
    setUploadingFor(lineId);
    const { error: uploadError } = await uploadOrderDocument({
      orderId,
      lineItemId: lineId,
      file,
      documentType: 'delivery_note',
    });
    setUploadingFor(null);
    if (uploadError) {
      setSnack(uploadError.message);
      return;
    }
    await refetchDocs();
    setSnack('Document uploaded.');
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

  if (error) {
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

  if (myLines.length === 0 || !orderContext) {
    return (
      <Box>
        {header}
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <LockOutlined sx={{ color: palette.hullGray, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>You have no assigned lines on this order.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {header}
      <input ref={fileInputRef} type="file" accept={ACCEPT} hidden onChange={handleFileChange} />

      <Box sx={{ mb: 2 }}>
        {orderContext.order_number && (
          <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 13 }}>
            {orderContext.order_number}
          </Typography>
        )}
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 24 }}>
          {orderContext.vessel_name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
          <LocationOnOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{orderContext.port?.name ?? 'Port'}</Typography>
          {orderContext.eta && (
            <>
              <AccessTime sx={{ fontSize: 14, color: palette.hullGray, ml: 1 }} />
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                ETA {dayjs(orderContext.eta).format('MMM D, HH:mm')}
              </Typography>
            </>
          )}
          {orderContext.etd && (
            <>
              <LogoutOutlined sx={{ fontSize: 14, color: palette.hullGray, ml: 1 }} />
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                ETD {dayjs(orderContext.etd).format('MMM D, HH:mm')}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>
        Your Assignment{myLines.length > 1 ? 's' : ''}
      </Typography>

      {myLines.map((li) => {
        const lineDocs = docsByLine.get(li.id) ?? [];
        const nextActions = SUPPLIER_NEXT_ACTIONS[li.line_status as LineStatus] ?? [];
        return (
          <Card key={li.id} sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: `${radius.sm}px`,
                  bgcolor: palette.navyDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ServiceCategoryIcon name={li.service_categories?.name ?? ''} size={22} color={palette.steelBlue} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 16 }}>
                  {li.service_categories?.name ?? 'Service'}
                </Typography>
                {li.quantity != null && (
                  <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                    {li.quantity} {li.unit ?? ''}
                  </Typography>
                )}
              </Box>
              <OrderStatusBadge status={li.line_status} kind="line" />
            </Box>

            {li.specifications && <DetailLine label="Specs" value={li.specifications} />}
            {li.special_instructions && <DetailLine label="Instructions" value={li.special_instructions} />}
            {li.requested_datetime && (
              <DetailLine label="Requested" value={dayjs(li.requested_datetime).format('MMM D, YYYY · HH:mm')} />
            )}
            {li.total_price != null && <DetailLine label="Line Total" value={`$${li.total_price.toFixed(2)}`} />}
            {li.supplier_decline_reason && <DetailLine label="Decline Reason" value={li.supplier_decline_reason} />}

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, mb: 0.5 }}>
              <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 14 }}>Delivery Docs</Typography>
              <Button
                variant="outlined"
                size="small"
                disabled={uploadingFor === li.id}
                startIcon={
                  uploadingFor === li.id ? (
                    <CircularProgress size={14} sx={{ color: palette.steelBlue }} />
                  ) : (
                    <CloudUploadOutlined />
                  )
                }
                onClick={() => triggerUpload(li.id)}
                sx={{ color: palette.steelBlue, borderColor: palette.steelBlue }}
              >
                Upload
              </Button>
            </Box>
            {lineDocs.length === 0 ? (
              <Typography sx={{ color: palette.hullGray, fontSize: 13, mb: 0.5 }}>No documents uploaded.</Typography>
            ) : (
              lineDocs.map((doc) => (
                <DocumentCard key={doc.id} document={doc} onOpen={(d) => d.file_url && openDocument(d.file_url)} />
              ))
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              {nextActions.length > 0 ? (
                <Button
                  variant="contained"
                  startIcon={<SwapVertOutlined />}
                  onClick={() => setSheetLine(li)}
                  sx={{ flexGrow: 1 }}
                >
                  Update Status
                </Button>
              ) : (
                <Typography sx={{ color: palette.hullGray, fontSize: 13, flex: 1 }}>
                  No further action required.
                </Typography>
              )}
              <Button
                variant="outlined"
                startIcon={<ChatBubbleOutlined />}
                onClick={() => setChatLine(li)}
                sx={{ color: palette.steelBlue, borderColor: palette.steelBlue }}
              >
                Chat
              </Button>
            </Box>
          </Card>
        );
      })}

      <StatusUpdateSheet
        open={sheetLine !== null}
        onClose={() => setSheetLine(null)}
        lineItem={sheetLine}
        hasDocument={sheetLine ? (docsByLine.get(sheetLine.id)?.length ?? 0) > 0 : false}
        onConfirm={() => {
          setSnack('Status updated.');
          refetch();
        }}
      />

      <Dialog
        open={chatLine !== null}
        onClose={() => setChatLine(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, height: '80vh', borderRadius: `${radius.lg}px` } } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600 }}>
            {chatLine?.service_categories?.name ?? 'Chat'}
          </Typography>
          <IconButton onClick={() => setChatLine(null)}>
            <Close sx={{ color: palette.hullGray }} />
          </IconButton>
        </Box>
        <Divider sx={{ borderColor: palette.oceanMid }} />
        {orderId && chatLine && userId && (
          <MessageThread orderId={orderId} lineItemId={chatLine.id} currentUserId={userId} height="100%" />
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
