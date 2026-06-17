import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Typography,
  CircularProgress,
  Radio,
  Snackbar,
  Alert,
  IconButton,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import CreditCard from '@mui/icons-material/CreditCard';
import Payments from '@mui/icons-material/Payments';
import { useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

import { supabase } from '@/lib/supabase';
import { stripePromise } from '@/lib/stripe';
import { useOrderDetail } from '@/hooks/useOrderDetail';
import { muiTheme, palette, fonts } from '@/constants/theme';
import type { PaymentMethod } from '@/types/database';

export default function NewOrderCheckout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const orderId = params.get('id');

  const { order, isLoading, error } = useOrderDetail(orderId);

  const [method, setMethod] = useState<PaymentMethod>('online');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const finish = () => {
    if (orderId) navigate(`/captain/orders/${orderId}`, { replace: true });
    else navigate(-1);
  };

  const startOnlinePayment = async () => {
    if (!orderId) return;
    setProcessing(true);
    setSnack(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: { order_id: orderId },
      });
      if (fnError || !data?.paymentIntent) {
        setSnack('Could not start payment. Please try again.');
        setProcessing(false);
        return;
      }
      setClientSecret(data.paymentIntent as string);
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Payment failed.');
    } finally {
      setProcessing(false);
    }
  };

  const payCod = async () => {
    if (!orderId) return;
    setProcessing(true);
    try {
      const { error: updError } = await supabase
        .from('orders')
        .update({ payment_method: 'cod' })
        .eq('id', orderId);
      if (updError) {
        setSnack(updError.message);
        setProcessing(false);
        return;
      }
      const { error: actError } = await supabase.functions.invoke('activate-order', {
        body: { order_id: orderId },
      });
      if (actError) {
        setSnack('Could not activate the order. Please try again.');
        setProcessing(false);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', orderId] });
      setSnack('Order confirmed with Cash on Delivery.');
      setProcessing(false);
      setTimeout(finish, 800);
    } catch (e) {
      setSnack(e instanceof Error ? e.message : 'Failed to confirm order.');
      setProcessing(false);
    }
  };

  const onPaid = () => {
    setSnack('Payment received. Activating your order…');
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    if (orderId) queryClient.invalidateQueries({ queryKey: ['order', orderId] });
    setTimeout(finish, 800);
  };

  const header = (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <IconButton onClick={() => navigate(-1)}>
        <ArrowBack sx={{ color: palette.fogWhite }} />
      </IconButton>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>Checkout</Typography>
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
    <Box sx={{ maxWidth: 560 }}>
      {header}

      <Card sx={{ p: 2, mb: 3 }}>
        <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 13 }}>
          {order.order_number ?? 'Order'}
        </Typography>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
          {order.vessel_name}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
          <Typography sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 15 }}>Amount Due</Typography>
          <Typography sx={{ fontFamily: fonts.display, color: palette.engineGreen, fontSize: 22 }}>
            ${(order.total_amount ?? 0).toFixed(2)}
          </Typography>
        </Box>
      </Card>

      {clientSecret ? (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: 'night',
              variables: { colorPrimary: palette.steelBlue, colorBackground: muiTheme.palette.background.paper },
            },
          }}
        >
          <StripeForm onPaid={onPaid} onError={setSnack} />
        </Elements>
      ) : (
        <>
          <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>
            Payment Method
          </Typography>

          <MethodRow
            selected={method === 'online'}
            onClick={() => setMethod('online')}
            icon={<CreditCard sx={{ color: method === 'online' ? palette.steelBlue : palette.hullGray }} />}
            title="Pay Online"
            subtitle="Secure card payment via Stripe"
          />
          <MethodRow
            selected={method === 'cod'}
            onClick={() => setMethod('cod')}
            icon={<Payments sx={{ color: method === 'cod' ? palette.steelBlue : palette.hullGray }} />}
            title="Cash on Delivery"
            subtitle="Settle directly with suppliers on delivery"
          />

          <Button
            variant="contained"
            fullWidth
            disabled={processing}
            onClick={() => (method === 'online' ? startOnlinePayment() : payCod())}
            sx={{ height: 50, fontSize: 16, mt: 3 }}
          >
            {processing ? (
              <CircularProgress size={22} sx={{ color: palette.fogWhite }} />
            ) : method === 'online' ? (
              'Continue to Payment'
            ) : (
              'Confirm Order'
            )}
          </Button>
        </>
      )}

      <Snackbar open={snack !== null} autoHideDuration={5000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="info">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function MethodRow({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        mb: 1,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        cursor: 'pointer',
        border: `1px solid ${selected ? palette.steelBlue : 'transparent'}`,
      }}
    >
      {icon}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>{title}</Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>{subtitle}</Typography>
      </Box>
      <Radio checked={selected} />
    </Card>
  );
}

function StripeForm({ onPaid, onError }: { onPaid: () => void; onError: (msg: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (error) {
      onError(error.message ?? 'Payment failed.');
      return;
    }
    onPaid();
  };

  return (
    <Box>
      <Card sx={{ p: 2, mb: 2 }}>
        <PaymentElement />
      </Card>
      <Button variant="contained" fullWidth disabled={!stripe || submitting} onClick={handlePay} sx={{ height: 50, fontSize: 16 }}>
        {submitting ? <CircularProgress size={22} sx={{ color: palette.fogWhite }} /> : 'Pay Now'}
      </Button>
    </Box>
  );
}
