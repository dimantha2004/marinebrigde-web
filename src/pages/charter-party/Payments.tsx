import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import TaskAltOutlined from '@mui/icons-material/TaskAltOutlined';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts } from '@/constants/theme';


export default function CharterPayments() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data: orders, isLoading, error } = useOrders('charter_party', userId);

  const pending = useMemo(
    () => orders.filter((o: Order) => o.overall_status === 'pending_payment'),
    [orders]
  );

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Payments
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load payments.</Typography>
        </Box>
      ) : pending.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <TaskAltOutlined sx={{ color: palette.hullGray, fontSize: 36 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            No pending payments. You're all caught up.
          </Typography>
        </Box>
      ) : (
        pending.map((order) => (
          <Card
            key={order.id}
            onClick={() => navigate(`/charter-party/order/${order.id}`)}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 14 }}>
                {order.order_number ?? 'Draft Order'}
              </Typography>
              <OrderStatusBadge status={order.overall_status} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <DirectionsBoatOutlined sx={{ fontSize: 15, color: palette.hullGray }} />
              <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14 }}>
                {order.vessel_name}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
              <LocationOnOutlined sx={{ fontSize: 15, color: palette.hullGray }} />
              <Typography sx={{ color: palette.fogWhite, fontSize: 14, flex: 1 }}>
                {order.port_id ? 'Port assigned' : 'No port'}
              </Typography>
              <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                {dayjs(order.created_at).format('MMM D, YYYY')}
              </Typography>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
