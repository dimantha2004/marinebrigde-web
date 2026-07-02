import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Card,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import CreditCard from '@mui/icons-material/CreditCard';
import WarningAmber from '@mui/icons-material/WarningAmber';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';

import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { supabase } from '@/lib/supabase';
import { useOrderDetail, useSelectQuotation } from '@/hooks/useOrderDetail';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import { palette, fonts, radius } from '@/constants/theme';
import { openDocument } from '@/lib/storage';
import Description from '@mui/icons-material/Description';

const CLAUSE_SERVICES = ['Bunkering', 'De-bunkering'];

type Decision = 'approve' | 'reject';

function formatAmount(value: number | null | undefined): string {
  if (value == null) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}


export default function CharterOrderDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orderId } = useParams<{ orderId: string }>();

  const { order, lineItems, isLoading, error } = useOrderDetail(orderId);
  const selectQuotation = useSelectQuotation();

  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState<Decision | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    setComments('');
    setSubmitting(null);
    setSnackbar(null);
  }, [orderId]);

  const clauseApplies = useMemo(
    () => lineItems.some((line) => CLAUSE_SERVICES.includes(line.service_categories?.name ?? '')),
    [lineItems]
  );

  const decided = order != null && order.overall_status !== 'pending_charter_approval';
  const hasPendingQuotationActions = lineItems?.some(
    (li) => 
      li.line_status === 'pending_supplier' || li.line_status === 'pending_charter_selection'
  );
  const canPay = (order?.overall_status === 'pending_payment' || order?.overall_status === 'pending_charter_approval') && !hasPendingQuotationActions;

  const submitDecision = async (decision: Decision) => {
    if (!orderId || submitting) return;
    setSubmitting(decision);
    try {
      const { error: invokeError } = await supabase.functions.invoke('process-charter-decision', {
        body: {
          order_id: orderId,
          decision: decision === 'approve' ? 'approved' : 'rejected',
          comments: comments.trim() || null,
        },
      });
      if (invokeError) throw invokeError;
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      navigate(-1);
    } catch (e) {
      setSnackbar({ message: e instanceof Error ? e.message : 'Failed to submit decision.', severity: 'error' });
      setSubmitting(null);
    }
  };

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <IconButton onClick={() => navigate(-1)}>
        <ArrowBack sx={{ color: palette.fogWhite }} />
      </IconButton>
      <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 16 }}>
        {order?.order_number ?? 'Order'}
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
    <Box sx={{ maxWidth: 640 }}>
      {header}

      <Card sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Typography noWrap sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
            {order.vessel_name}
          </Typography>
          <OrderStatusBadge status={order.overall_status} />
        </Box>
        <SummaryRow label="IMO" value={order.imo_number ?? '—'} />
        <SummaryRow label="Port" value={order.port?.name ?? '—'} />
        <SummaryRow label="ETA" value={order.eta ? dayjs(order.eta).format('MMM D, YYYY HH:mm') : '—'} />
        <SummaryRow label="ETD" value={order.etd ? dayjs(order.etd).format('MMM D, YYYY HH:mm') : '—'} />
        <SummaryRow label="Captain" value={order.captain?.full_name ?? '—'} />
      </Card>

      {clauseApplies && (
        <Box sx={{ display: 'flex', gap: 1, bgcolor: palette.signalAmber, borderRadius: `${radius.md}px`, p: 2, mb: 2 }}>
          <ErrorOutlined sx={{ color: palette.navyDeep }} />
          <Box>
            <Typography sx={{ color: palette.navyDeep, fontWeight: 600, fontSize: 14 }}>
              Charter clause review may apply
            </Typography>
            <Typography sx={{ color: palette.navyDeep, fontSize: 12 }}>
              This order includes services (e.g. Bunkering / De-bunkering) that may require special
              charter-party attention before approval.
            </Typography>
          </Box>
        </Box>
      )}

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>
        Line Items
      </Typography>
      {lineItems.length === 0 ? (
        <Typography sx={{ color: palette.hullGray, mb: 2 }}>No line items on this order.</Typography>
      ) : (
        lineItems.map((line) => {
          const name = line.service_categories?.name ?? 'Service';
          return (
            <Card key={line.id} sx={{ p: 2, mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: `${radius.sm}px`,
                    bgcolor: palette.steelBlue,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ServiceCategoryIcon name={name} size={18} color={palette.fogWhite} />
                </Box>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15, flex: 1 }}>
                  {name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                  Qty: {line.quantity ?? '—'} {line.unit ?? ''}
                </Typography>
                {line.unit_price != null && (
                  <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                    @ {formatAmount(line.unit_price)}
                  </Typography>
                )}
              </Box>

              {line.specifications && (
                <Typography sx={{ color: palette.fogWhite, fontSize: 13, mt: 1 }}>{line.specifications}</Typography>
              )}
              {line.total_price != null && (
                <Box sx={{ mt: 1, textAlign: 'right' }}>
                  <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 14 }}>
                    {formatAmount(line.total_price)}
                  </Typography>
                </Box>
              )}

              {line.line_status === 'pending_charter_selection' && line.supplier_quotations && line.supplier_quotations.length > 0 && (
                <Box sx={{ mt: 2, p: 2, borderRadius: `${radius.md}px`, bgcolor: 'rgba(255,255,255,0.03)' }}>
                  <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 14, mb: 1 }}>
                    Select Supplier Quotation
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {line.supplier_quotations.filter(q => !q.is_selected).map((quote) => (
                      <Box
                        key={quote.id}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          p: 1.5,
                          borderRadius: 1,
                          border: `1px solid ${palette.oceanMid}`,
                        }}
                      >
                        <Box>
                          <Typography sx={{ color: palette.fogWhite, fontWeight: 500 }}>
                            {formatAmount(quote.amount)}
                          </Typography>
                          {quote.description && (
                            <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                              {quote.description}
                            </Typography>
                          )}
                          {quote.file_url && (
                            <Button
                              size="small"
                              startIcon={<Description />}
                              onClick={() => openDocument(quote.file_url!)}
                              sx={{ mt: 0.5, color: palette.steelBlue, p: 0, justifyContent: 'flex-start', minWidth: 0, textTransform: 'none', fontSize: 12 }}
                            >
                              View Attachment
                            </Button>
                          )}
                        </Box>
                        <Button
                          variant="contained"
                          size="small"
                          disabled={selectQuotation.isPending}
                          onClick={() => {
                            if (!order) return;
                            selectQuotation.mutate(
                              {
                                orderId: order.id,
                                lineItemId: line.id,
                                quotationId: quote.id,
                                amount: quote.amount,
                                currentTotalAmount: order.total_amount,
                              },
                              {
                                onSuccess: () => setSnackbar({ message: 'Quotation selected successfully.', severity: 'success' }),
                                onError: (err) => setSnackbar({ message: err.message, severity: 'error' }),
                              }
                            );
                          }}
                          sx={{ bgcolor: palette.steelBlue, '&:hover': { bgcolor: palette.oceanMid } }}
                        >
                          {selectQuotation.isPending ? <CircularProgress size={16} sx={{ color: palette.fogWhite }} /> : 'Select'}
                        </Button>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Card>
          );
        })
      )}

      {order?.total_amount != null && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 2, borderTop: `1px solid ${palette.navyDeep}`, borderBottom: `1px solid ${palette.navyDeep}` }}>
            <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16 }}>Total Amount</Typography>
            <Typography sx={{ fontFamily: fonts.display, color: palette.signalAmber, fontSize: 24 }}>
              {formatAmount(order.total_amount)}
            </Typography>
          </Box>
          {canPay && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<CreditCard />}
              sx={{ height: 48, mt: 2, bgcolor: palette.steelBlue, '&:hover': { bgcolor: palette.oceanMid } }}
              onClick={() => navigate(`/charter-party/checkout?id=${order.id}`)}
            >
              Pay Now
            </Button>
          )}
        </Box>
      )}

      {!decided && (
        <>
          <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>Decision</Typography>
          <TextField
            label="Comments (optional)"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            multiline
            minRows={3}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Close />}
              disabled={submitting != null}
              onClick={() => submitDecision('reject')}
              sx={{ bgcolor: palette.alertRed, '&:hover': { bgcolor: palette.alertRed }, height: 46 }}
            >
              {submitting === 'reject' ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Reject'}
            </Button>
            <Button
              variant="contained"
              fullWidth
              startIcon={<Check />}
              disabled={submitting != null}
              onClick={() => submitDecision('approve')}
              sx={{ bgcolor: palette.engineGreen, '&:hover': { bgcolor: palette.engineGreen }, height: 46 }}
            >
              {submitting === 'approve' ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Approve'}
            </Button>
          </Box>
        </>
      )}

      <Snackbar open={snackbar != null} autoHideDuration={4000} onClose={() => setSnackbar(null)}>
        <Alert onClose={() => setSnackbar(null)} variant="filled" severity={snackbar?.severity || 'error'}>
          {snackbar?.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
      <Typography sx={{ color: palette.hullGray, fontSize: 13, width: 64 }}>{label}</Typography>
      <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14, flex: 1 }}>
        {value}
      </Typography>
    </Box>
  );
}
