import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Card, Typography, Chip, CircularProgress } from '@mui/material';
import MonitorHeart from '@mui/icons-material/MonitorHeart';
import WifiOff from '@mui/icons-material/WifiOff';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

const ROLE_LABEL: Record<UserRole, string> = {
  captain: 'Captain',
  charter_party: 'Charter Party',
  ship_agent: 'Ship Agent',
  port_authority: 'Port Authority',
  supplier: 'Supplier',
  admin: 'Admin',
};

const ROLE_COLOR: Record<UserRole, string> = {
  captain: palette.steelBlue,
  charter_party: palette.signalAmber,
  ship_agent: palette.engineGreen,
  port_authority: '#8B5CF6',
  supplier: '#06B6D4',
  admin: palette.alertRed,
};

const STALE_THRESHOLD_MS = 120_000;

export default function AdminMonitoring() {
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: allProfiles, isLoading } = useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });

  const fetchActive = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('active_sessions')
        .select('*')
        .gte('last_heartbeat', new Date(Date.now() - STALE_THRESHOLD_MS).toISOString());
      if (error) throw error;
      setActiveUserIds(new Set((data ?? []).map((s) => s.user_id)));
    } catch {
      // Silently retry on next interval.
    }
  }, []);

  useEffect(() => {
    // Poll active sessions immediately, then every 15s. State updates happen in
    // the async callback (not synchronously in the effect body).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchActive();
    intervalRef.current = setInterval(fetchActive, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActive]);

  const liveUsers = useMemo(
    () => (allProfiles ?? []).filter((p) => activeUserIds.has(p.id)),
    [allProfiles, activeUserIds]
  );

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Live Monitoring
      </Typography>

      <Card sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2, mb: 2 }}>
        <MonitorHeart sx={{ color: palette.engineGreen }} />
        <Typography sx={{ flex: 1, color: palette.fogWhite, fontSize: 14 }}>
          <Box component="span" sx={{ color: palette.engineGreen, fontWeight: 600, fontSize: 18 }}>
            {liveUsers.length}
          </Box>{' '}
          active user{liveUsers.length !== 1 ? 's' : ''} online
        </Typography>
        <Box className="mb-pulse" sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: palette.engineGreen }} />
      </Card>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : liveUsers.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <WifiOff sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No active users at the moment.</Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12, mt: 0.5 }}>
            Active sessions appear here when users are online.
          </Typography>
        </Box>
      ) : (
        liveUsers.map((item) => (
          <Card key={item.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: palette.engineGreen }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                {item.full_name}
              </Typography>
              {item.username && (
                <Typography noWrap sx={{ color: palette.hullGray, fontSize: 12 }}>
                  @{item.username}
                </Typography>
              )}
            </Box>
            <Chip
              label={ROLE_LABEL[item.role]}
              size="small"
              sx={{ bgcolor: `${ROLE_COLOR[item.role]}33`, color: ROLE_COLOR[item.role], fontWeight: 500 }}
            />
          </Card>
        ))
      )}
    </Box>
  );
}
