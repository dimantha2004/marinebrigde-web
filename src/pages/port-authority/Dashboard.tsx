import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import HourglassEmpty from '@mui/icons-material/HourglassEmpty';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import DoneAll from '@mui/icons-material/DoneAll';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import ChevronRight from '@mui/icons-material/ChevronRight';
import WarningAmber from '@mui/icons-material/WarningAmber';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useOrders } from '@/hooks/useOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import type { Order } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

const AWAITING_STATUS = 'pending_port_approval';
const ACTIVE_STATUSES = ['active', 'in_execution'];

export default function PortDashboard() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);

  const { data: orders, isLoading, error } = useOrders('port_authority', userId);

  const counts = useMemo(() => {
    let awaiting = 0;
    let active = 0;
    let completed = 0;
    for (const o of orders) {
      if (o.overall_status === AWAITING_STATUS) awaiting += 1;
      else if (ACTIVE_STATUSES.includes(o.overall_status)) active += 1;
      else if (o.overall_status === 'completed') completed += 1;
    }
    return { awaiting, active, completed };
  }, [orders]);

  const recent = useMemo(() => orders.slice(0, 15), [orders]);
  const greeting = profile?.full_name ? profile.full_name.split(' ')[0] : 'Officer';

  return (
    <Box>
      <Typography sx={{ color: palette.hullGray, fontSize: 15 }}>Oversight for</Typography>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 26, mb: 3 }}>
        {greeting}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
        <SummaryCard label="Awaiting" value={counts.awaiting} color={palette.signalAmber} icon={HourglassEmpty} />
        <SummaryCard label="Active" value={counts.active} color={palette.steelBlue} icon={DirectionsBoat} />
        <SummaryCard label="Completed" value={counts.completed} color={palette.engineGreen} icon={DoneAll} />
      </Box>

      {counts.awaiting > 0 && (
        <Card
          onClick={() => navigate('/port-authority/approvals')}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            p: 2,
            mb: 3,
            bgcolor: palette.signalAmber,
            cursor: 'pointer',
          }}
        >
          <VerifiedUser sx={{ color: palette.navyDeep }} />
          <Typography sx={{ flex: 1, color: palette.navyDeep, fontWeight: 600, fontSize: 14 }}>
            {counts.awaiting} order{counts.awaiting === 1 ? '' : 's'} awaiting your sign-off
          </Typography>
          <ChevronRight sx={{ color: palette.navyDeep }} />
        </Card>
      )}

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1.5 }}>
        Recent Orders ({recent.length})
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
          <DirectionsBoatOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No orders at your ports yet.</Typography>
        </Box>
      ) : (
        recent.map((order: Order) => (
          <Card
            key={order.id}
            onClick={() => navigate('/port-authority/approvals')}
            sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
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
    <Card sx={{ flex: 1, p: 2, textAlign: 'center', borderRadius: `${radius.md}px` }}>
      <Icon sx={{ color, fontSize: 22 }} />
      <Typography sx={{ fontFamily: fonts.display, fontSize: 24, color, mt: 0.5 }}>{value}</Typography>
      <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>{label}</Typography>
    </Card>
  );
}
