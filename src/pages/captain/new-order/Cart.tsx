import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Typography, Divider, Snackbar, Alert, IconButton, CircularProgress } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import Add from '@mui/icons-material/Add';
import ShoppingCartOutlined from '@mui/icons-material/ShoppingCartOutlined';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useCartStore } from '@/stores/cartStore';
import { useCreateOrder } from '@/hooks/useOrders';
import { uploadOrderDocument } from '@/lib/storage';
import ServiceCartItem from '@/components/captain/ServiceCartItem';
import { palette, fonts } from '@/constants/theme';

export default function NewOrderCart() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const totalAmount = useCartStore((s) => s.totalAmount);
  const clear = useCartStore((s) => s.clear);
  const vessel = useCartStore();

  const createOrder = useCreateOrder();
  const [submitting, setSubmitting] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const total = useMemo(() => totalAmount(), [items, totalAmount]);

  const handleSubmit = async () => {
    if (!userId || items.length === 0 || submitting) return;
    setSubmitting(true);
    setSnack(null);
    try {
      const { orderId, lineItems } = await createOrder.mutateAsync({
        captainId: userId,
        vessel: {
          vesselName: vessel.vesselName,
          imoNumber: vessel.imoNumber,
          portId: vessel.portId,
          portName: vessel.portName,
          eta: vessel.eta,
          etd: vessel.etd,
          charterPartyId: vessel.charterPartyId,
          charterPartyName: vessel.charterPartyName,
          shipAgentId: vessel.shipAgentId,
          shipAgentName: vessel.shipAgentName,
        },
        items,
        totalAmount: total,
      });

      // Upload attached files if any
      for (const item of items) {
        if (item.file) {
          const matchedLine = lineItems.find((l) => l.service_category_id === item.serviceCategoryId);
          if (matchedLine) {
            const { error: uploadErr } = await uploadOrderDocument({
              orderId,
              lineItemId: matchedLine.id,
              file: item.file,
              documentType: 'other',
            });
            if (uploadErr) {
              console.error(`Error uploading document for ${item.serviceName}:`, uploadErr);
            }
          }
        }
      }



      const submitRes = await supabase.functions.invoke('submit-for-charter-approval', { body: { order_id: orderId } });
      if (submitRes.error) console.warn('submit-for-charter-approval warning:', submitRes.error);

      clear();
      navigate(`/captain/orders/${orderId}`, { replace: true });
    } catch (e) {
      console.error('Order submission error:', e);
      setSnack(e instanceof Error ? e.message : 'Failed to submit order.');
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack sx={{ color: palette.fogWhite }} />
        </IconButton>
        <Box>
          <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
            Review Order
          </Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>Step 3 of 3</Typography>
        </Box>
      </Box>

      <Card sx={{ p: 2, mb: 3 }}>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18, mb: 0.5 }}>
          {vessel.vesselName || 'Vessel'}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <LocationOnOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{vessel.portName || 'Port'}</Typography>
        </Box>
        {vessel.charterPartyName && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
            <BusinessOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
            <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{vessel.charterPartyName}</Typography>
          </Box>
        )}
      </Card>

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>
        Services ({items.length})
      </Typography>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <ShoppingCartOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Your cart is empty.</Typography>
        </Box>
      ) : (
        items.map((item) => (
          <ServiceCartItem
            key={item.serviceCategoryId}
            item={item}
            onEdit={() => navigate('/captain/new-order/add-services')}
            onRemove={(i) => removeItem(i.serviceCategoryId)}
          />
        ))
      )}

      <Button
        startIcon={<Add />}
        onClick={() => navigate('/captain/new-order/add-services')}
        sx={{ color: palette.steelBlue, mt: 0.5 }}
      >
        Add More Services
      </Button>



      <Button
        variant="contained"
        fullWidth
        disabled={items.length === 0 || submitting}
        onClick={handleSubmit}
        sx={{ height: 50, fontSize: 16 }}
      >
        {submitting ? <CircularProgress size={22} sx={{ color: palette.fogWhite }} /> : 'Submit for Charter Approval'}
      </Button>

      <Snackbar open={snack !== null} autoHideDuration={6000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="warning">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
