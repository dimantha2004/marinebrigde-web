import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import DoneAllOutlined from '@mui/icons-material/DoneAllOutlined';
import ChevronRight from '@mui/icons-material/ChevronRight';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useSupplierOrders, type SupplierLineItem } from '@/hooks/useSupplierOrders';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import { LINE_STATUS_META, type LineStatus } from '@/constants/orderStatuses';
import { palette, fonts, radius } from '@/constants/theme';

const ACTIVE_STATUSES: LineStatus[] = ['pending_supplier', 'supplier_accepted', 'preparing', 'ready', 'in_transit'];

export default function SupplierDashboard() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useSupplierOrders(userId);

  useEffect(() => {
    const channel = supabase
      .channel('supplier-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_line_items' }, () =>
        queryClient.invalidateQueries({ queryKey: ['supplier-orders'] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const active = useMemo(
    () => data.filter((li) => ACTIVE_STATUSES.includes(li.line_status as LineStatus)),
    [data]
  );

  const grouped = useMemo(() => {
    const map = new Map<LineStatus, SupplierLineItem[]>();
    for (const status of ACTIVE_STATUSES) map.set(status, []);
    for (const li of active) {
      const key = li.line_status as LineStatus;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(li);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [active]);

  const pendingCount = active.filter((li) => li.line_status === 'pending_supplier').length;

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Supplier
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load your assignments.</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Card sx={{ flex: 1, p: 2 }}>
              <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 28 }}>
                {active.length}
              </Typography>
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>Active Lines</Typography>
            </Card>
            <Card sx={{ flex: 1, p: 2, borderLeft: `3px solid ${palette.signalAmber}` }}>
              <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 28 }}>
                {pendingCount}
              </Typography>
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>Awaiting You</Typography>
            </Card>
          </Box>

          {grouped.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <DoneAllOutlined sx={{ color: palette.hullGray, fontSize: 40 }} />
              <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 16, mt: 1 }}>
                All clear
              </Typography>
              <Typography sx={{ color: palette.hullGray }}>You have no active assignments right now.</Typography>
            </Box>
          ) : (
            grouped.map(([status, items]) => (
              <Box key={status} sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Box sx={{ width: 9, height: 9, borderRadius: 999, bgcolor: LINE_STATUS_META[status].color }} />
                  <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                    {LINE_STATUS_META[status].label}
                  </Typography>
                  <Box
                    sx={{
                      minWidth: 22,
                      px: 0.75,
                      height: 20,
                      borderRadius: 999,
                      bgcolor: palette.oceanMid,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 11 }}>
                      {items.length}
                    </Typography>
                  </Box>
                </Box>

                {items.map((li) => (
                  <Card
                    key={li.id}
                    onClick={() => li.order?.id && navigate(`/supplier/orders/${li.order.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      p: 2,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: palette.surfaceVariant },
                    }}
                  >
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
                      <Typography noWrap sx={{ color: palette.hullGray, fontSize: 13 }}>
                        {li.order?.vessel_name ?? 'Vessel'} · {li.order?.port?.name ?? 'Port'}
                      </Typography>
                      {li.order?.eta && (
                        <Typography sx={{ fontFamily: 'monospace', color: palette.hullGray, fontSize: 11 }}>
                          ETA {dayjs(li.order.eta).format('MMM D, HH:mm')}
                        </Typography>
                      )}
                    </Box>
                    <ChevronRight sx={{ color: palette.hullGray }} />
                  </Card>
                ))}
              </Box>
            ))
          )}
        </>
      )}
    </Box>
  );
}
