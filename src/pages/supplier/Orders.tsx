import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress, TextField, InputAdornment } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Search from '@mui/icons-material/Search';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import LocationOnOutlined from '@mui/icons-material/LocationOnOutlined';
import AccessTime from '@mui/icons-material/AccessTime';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useSupplierOrders, type SupplierLineItem } from '@/hooks/useSupplierOrders';
import OrderStatusBadge from '@/components/shared/OrderStatusBadge';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import { palette, fonts, radius } from '@/constants/theme';

export default function SupplierOrders() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data, isLoading, error } = useSupplierOrders(userId);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((li: SupplierLineItem) =>
      [li.service_categories?.name, li.order?.vessel_name, li.order?.port?.name, li.order?.order_number]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [data, query]);

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        My Orders
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Search vessel, port, service…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: palette.hullGray }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load your orders.</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Inventory2Outlined sx={{ color: palette.hullGray, fontSize: 40 }} />
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600, mt: 1 }}>No assigned lines</Typography>
          <Typography sx={{ color: palette.hullGray }}>
            {query ? 'No results match your search.' : 'Assignments will appear here.'}
          </Typography>
        </Box>
      ) : (
        filtered.map((li) => (
          <Card
            key={li.id}
            onClick={() => li.order?.id && navigate(`/supplier/orders/${li.order.id}`)}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: `${radius.sm}px`,
                  bgcolor: palette.navyDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ServiceCategoryIcon name={li.service_categories?.name ?? ''} size={22} color={palette.steelBlue} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                  {li.service_categories?.name ?? 'Service'}
                </Typography>
                {li.order?.order_number && (
                  <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 11 }}>
                    {li.order.order_number}
                  </Typography>
                )}
              </Box>
              <OrderStatusBadge status={li.line_status} kind="line" />
            </Box>

            <MetaRow icon={<DirectionsBoatOutlined sx={{ fontSize: 14, color: palette.hullGray }} />} text={li.order?.vessel_name ?? 'Vessel'} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
              <LocationOnOutlined sx={{ fontSize: 14, color: palette.hullGray }} />
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{li.order?.port?.name ?? 'Port'}</Typography>
              {li.order?.eta && (
                <>
                  <AccessTime sx={{ fontSize: 14, color: palette.hullGray, ml: 1 }} />
                  <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                    ETA {dayjs(li.order.eta).format('MMM D, HH:mm')}
                  </Typography>
                </>
              )}
            </Box>
            {li.quantity != null && (
              <MetaRow icon={<Inventory2Outlined sx={{ fontSize: 14, color: palette.hullGray }} />} text={`${li.quantity} ${li.unit ?? ''}`} />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <ChatBubbleOutlined sx={{ color: palette.steelBlue, fontSize: 20 }} />
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}

function MetaRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
      {icon}
      <Typography noWrap sx={{ color: palette.hullGray, fontSize: 13 }}>
        {text}
      </Typography>
    </Box>
  );
}
