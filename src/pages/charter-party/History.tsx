import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

function formatAmount(value: number | null): string {
  if (value == null) return '—';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function CharterHistory() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data: orders, isLoading, error } = useOrders('charter_party', userId);

  const decided = useMemo(
    () => orders.filter((o: Order) => o.overall_status !== 'pending_charter_approval'),
    [orders]
  );

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Decision History
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load history.</Typography>
        </Box>
      ) : decided.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Inventory2Outlined sx={{ color: palette.hullGray, fontSize: 36 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No past decisions yet.</Typography>
        </Box>
      ) : (
        decided.map((order) => (
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <DirectionsBoatOutlined sx={{ fontSize: 15, color: palette.hullGray }} />
              <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14, flex: 1 }}>
                {order.vessel_name}
              </Typography>
              <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 13 }}>
                {formatAmount(order.total_amount)}
              </Typography>
            </Box>
            <Typography sx={{ color: palette.hullGray, fontSize: 12, mt: 0.5 }}>
              Updated {dayjs(order.updated_at).format('MMM D, YYYY HH:mm')}
            </Typography>
            {order.charter_comments && (
              <Box sx={{ display: 'flex', gap: 0.75, bgcolor: palette.navyDeep, borderRadius: `${radius.sm}px`, p: 1, mt: 1 }}>
                <ChatBubbleOutlined sx={{ fontSize: 14, color: palette.hullGray, mt: 0.25 }} />
                <Typography sx={{ color: palette.fogWhite, fontSize: 13 }}>{order.charter_comments}</Typography>
              </Box>
            )}
          </Card>
        ))
      )}
    </Box>
  );
}
