import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import AccessTime from '@mui/icons-material/AccessTime';
import DoneAll from '@mui/icons-material/DoneAll';
import WarningAmber from '@mui/icons-material/WarningAmber';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import TimelineTracker from '@/components/shared/TimelineTracker';
import type { Order } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

const ACTIVE_STATUSES = ['active', 'in_execution', 'pending_port_approval'];
const PENDING_STATUSES = ['pending_charter_approval', 'pending_payment', 'draft'];
const TERMINAL_STATUSES = ['completed', 'cancelled', 'charter_rejected'];

export default function AgentHub() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: orders, isLoading, error } = useOrders('ship_agent', userId);

  const counts = useMemo(() => {
    let active = 0;
    let pending = 0;
    let completed = 0;
    for (const o of orders) {
      if (ACTIVE_STATUSES.includes(o.overall_status)) active += 1;
      else if (PENDING_STATUSES.includes(o.overall_status)) pending += 1;
      else if (o.overall_status === 'completed') completed += 1;
    }
    return { active, pending, completed };
  }, [orders]);

  const activeOrders = useMemo(
    () => orders.filter((o: Order) => !TERMINAL_STATUSES.includes(o.overall_status)),
    [orders]
  );

  const greeting = profile?.full_name ? profile.full_name.split(' ')[0] : 'Agent';

  return (
    <Box>
      <Typography sx={{ color: palette.hullGray, fontSize: 15 }}>Managing vessels for</Typography>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 26, mb: 3 }}>
        {greeting}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <SummaryCard label="Active" value={counts.active} color={palette.steelBlue} icon={DirectionsBoat} />
        <SummaryCard label="Pending" value={counts.pending} color={palette.signalAmber} icon={AccessTime} />
        <SummaryCard label="Completed" value={counts.completed} color={palette.engineGreen} icon={DoneAll} />
      </Box>

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1.5 }}>
        Active Coordination ({activeOrders.length})
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load orders.</Typography>
        </Box>
      ) : activeOrders.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <DirectionsBoatOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No active orders to coordinate.</Typography>
        </Box>
      ) : (
        activeOrders.map((order) => (
          <Card
            key={order.id}
            onClick={() => navigate(`/ship-agent/orders/${order.id}`)}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 13 }}>
                  {order.order_number ?? 'Draft'}
                </Typography>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 16 }}>
                  {order.vessel_name}
                </Typography>
                <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                  {order.eta ? `ETA ${dayjs(order.eta).format('MMM D, HH:mm')}` : dayjs(order.created_at).format('MMM D, YYYY')}
                </Typography>
              </Box>
              <OrderStatusBadge status={order.overall_status} />
            </Box>
            <TimelineTracker current={order.overall_status} />
          </Card>
        ))
      )}
    </Box>
  );
}

function SummaryCard({
  label,
  value,
  color,
  icon: Icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: SvgIconComponent;
}) {
  return (
    <Card sx={{ flex: 1, p: 2, textAlign: 'center' }}>
      <Icon sx={{ color, fontSize: 22 }} />
      <Typography sx={{ fontFamily: fonts.display, fontSize: 24, color, mt: 0.5 }}>{value}</Typography>
      <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>{label}</Typography>
    </Card>
  );
}
