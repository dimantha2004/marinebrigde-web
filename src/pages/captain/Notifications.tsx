import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, CircularProgress } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import NotificationsOff from '@mui/icons-material/NotificationsOff';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Inventory2 from '@mui/icons-material/Inventory2';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import dayjs from 'dayjs';

import { useAuthStore } from '@/stores/authStore';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import type { Notification, NotificationType } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

const TYPE_ICON: Record<NotificationType, SvgIconComponent> = {
  approval_request: VerifiedUser,
  order_update: Inventory2,
  message: ChatBubbleOutlined,
  system: InfoOutlined,
};

export default function CaptainNotifications() {
  const navigate = useNavigate();
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data: notifications, isLoading, error } = useNotifications(userId);
  const markRead = useMarkNotificationRead();

  const handleClick = (n: Notification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.order_id) navigate(`/captain/orders/${n.order_id}`);
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Notifications
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load notifications.</Typography>
        </Box>
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <NotificationsOff sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>You're all caught up.</Typography>
        </Box>
      ) : (
        notifications.map((n) => {
          const Icon = TYPE_ICON[(n.type ?? 'system') as NotificationType] ?? InfoOutlined;
          return (
            <Card
              key={n.id}
              onClick={() => handleClick(n)}
              sx={{
                mb: 1,
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                cursor: 'pointer',
                borderLeft: n.read ? 'none' : `3px solid ${palette.steelBlue}`,
                '&:hover': { bgcolor: palette.surfaceVariant },
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: `${radius.sm}px`,
                  bgcolor: palette.navyDeep,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon sx={{ color: palette.steelBlue, fontSize: 20 }} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                  {n.title ?? 'Notification'}
                </Typography>
                {n.body && (
                  <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{n.body}</Typography>
                )}
                <Typography sx={{ color: palette.hullGray, fontSize: 11, mt: 0.5 }}>
                  {dayjs(n.created_at).format('MMM D, YYYY · HH:mm')}
                </Typography>
              </Box>
              {!n.read && (
                <Box sx={{ width: 8, height: 8, borderRadius: 999, bgcolor: palette.steelBlue }} />
              )}
            </Card>
          );
        })
      )}
    </Box>
  );
}
