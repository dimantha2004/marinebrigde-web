import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import Payments from '@mui/icons-material/Payments';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import type { SvgIconComponent } from '@mui/icons-material';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

export default function CharterDashboard() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: orders, isLoading, error } = useOrders('charter_party', userId);

  const counts = useMemo(() => {
    let approvals = 0;
    let payments = 0;
    let active = 0;
    let history = 0;

    for (const o of orders) {
      if (o.overall_status === 'pending_charter_approval') {
        approvals += 1;
      } else if (o.overall_status === 'pending_payment') {
        payments += 1;
      } else if (['active', 'in_execution', 'pending_port_approval'].includes(o.overall_status)) {
        active += 1;
      } else if (['completed', 'cancelled', 'charter_rejected'].includes(o.overall_status)) {
        history += 1;
      }
    }

    return { approvals, payments, active, history };
  }, [orders]);

  const recent = orders.slice(0, 5);
  const greeting = profile?.full_name ? profile.full_name.split(' ')[0] : 'Charterer';

  return (
    <Box>
      <Typography sx={{ color: palette.hullGray, fontSize: 15 }}>Welcome back,</Typography>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 26, mb: 3 }}>
        {greeting}
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }, gap: 1.5, mb: 4 }}>
        <SummaryCard
          label="Approvals"
          value={counts.approvals}
          color={palette.signalAmber}
          icon={CheckCircleOutlined}
          onClick={() => navigate('/charter-party/approvals')}
        />
        <SummaryCard
          label="Payments"
          value={counts.payments}
          color={palette.signalAmber}
          icon={Payments}
          onClick={() => navigate('/charter-party/payments')}
        />
        <SummaryCard
          label="Active"
          value={counts.active}
          color={palette.steelBlue}
          icon={DirectionsBoat}
          onClick={() => navigate('/charter-party/active')}
        />
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
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <AssignmentOutlined sx={{ color: palette.hullGray, fontSize: 36 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            No orders found.
          </Typography>
        </Box>
      ) : (
        recent.map((order) => (
          <RecentOrderRow
            key={order.id}
            order={order}
            onClick={() => navigate(`/charter-party/order/${order.id}`)}
          />
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
  onClick,
}: {
  label: string;
  value: number;
  color: string;
  icon: SvgIconComponent;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        p: 2,
        textAlign: 'center',
        cursor: 'pointer',
        '&:hover': { bgcolor: palette.surfaceVariant },
      }}
    >
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
        gap: 1.5,
        cursor: 'pointer',
        '&:hover': { bgcolor: palette.surfaceVariant },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 13 }}>
          {order.order_number ?? 'Draft'}
        </Typography>
        <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 15 }}>
          {order.vessel_name}
        </Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
          {dayjs(order.created_at).format('MMM D, YYYY · HH:mm')}
        </Typography>
      </Box>
      <OrderStatusBadge status={order.overall_status} />
    </Card>
  );
}
