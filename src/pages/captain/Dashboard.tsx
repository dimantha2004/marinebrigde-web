import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, Typography, CircularProgress } from '@mui/material';
import AddCircle from '@mui/icons-material/AddCircle';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import AccessTime from '@mui/icons-material/AccessTime';
import DoneAll from '@mui/icons-material/DoneAll';
import WarningAmber from '@mui/icons-material/WarningAmber';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

const ACTIVE_STATUSES = ['active', 'in_execution', 'pending_port_approval'];
const PENDING_STATUSES = ['pending_charter_approval', 'pending_payment', 'draft'];

export default function CaptainDashboard() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: orders, isLoading, error } = useOrders('captain', userId);

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

  const recent = orders.slice(0, 5);
  const greeting = profile?.full_name ? profile.full_name.split(' ')[0] : 'Captain';

  return (
    <Box>
      <Typography sx={{ color: palette.hullGray, fontSize: 15 }}>Welcome aboard,</Typography>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 26, mb: 3 }}>
        {greeting}
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddCircle />}
        onClick={() => navigate('/captain/new-order')}
        sx={{ height: 54, fontSize: 16, mb: 3, width: { xs: '100%', sm: 'auto' }, px: 4 }}
      >
        New Order
      </Button>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <SummaryCard label="Active" value={counts.active} color={palette.steelBlue} icon={DirectionsBoat} />
        <SummaryCard label="Pending" value={counts.pending} color={palette.signalAmber} icon={AccessTime} />
        <SummaryCard label="Completed" value={counts.completed} color={palette.engineGreen} icon={DoneAll} />
      </Box>

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1.5 }}>
        Recent Orders
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
      ) : recent.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <AssignmentOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            No orders yet. Create your first order.
          </Typography>
        </Box>
      ) : (
        recent.map((order) => (
          <RecentOrderRow key={order.id} order={order} onClick={() => navigate(`/captain/orders/${order.id}`)} />
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

function RecentOrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
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
          {dayjs(order.created_at).format('MMM D, YYYY')}
        </Typography>
      </Box>
      <OrderStatusBadge status={order.overall_status} />
    </Card>
  );
}
