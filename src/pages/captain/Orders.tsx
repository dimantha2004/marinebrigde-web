import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

export default function CaptainOrders() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data: orders, isLoading, error } = useOrders('captain', userId);

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        My Orders
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load your orders.</Typography>
        </Box>
      ) : orders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <AssignmentOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No orders yet.</Typography>
        </Box>
      ) : (
        orders.map((order) => (
          <OrderRow key={order.id} order={order} onClick={() => navigate(`/captain/orders/${order.id}`)} />
        ))
      )}
    </Box>
  );
}

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        mb: 1,
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        cursor: 'pointer',
        '&:hover': { bgcolor: palette.surfaceVariant },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 14 }}>
          {order.order_number ?? 'Draft'}
        </Typography>
        <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 15 }}>
          {order.vessel_name}
        </Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
          {dayjs(order.created_at).format('MMM D, YYYY · HH:mm')}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
        <OrderStatusBadge status={order.overall_status} />
        {order.total_amount != null && (
          <Typography sx={{ fontFamily: 'monospace', color: palette.engineGreen, fontSize: 13 }}>
            ${order.total_amount.toFixed(2)}
          </Typography>
        )}
      </Box>
    </Card>
  );
}
