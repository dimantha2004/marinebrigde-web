import { IconButton, Badge } from '@mui/material';
import Notifications from '@mui/icons-material/Notifications';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import { palette } from '@/constants/theme';

export type NotificationBellProps = {
  count: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export default function NotificationBell({ count, onClick }: NotificationBellProps) {
  const hasUnread = count > 0;
  return (
    <IconButton onClick={onClick} aria-label={hasUnread ? `Notifications, ${count} unread` : 'Notifications'}>
      <Badge badgeContent={count} max={99} color="error">
        {hasUnread ? (
          <Notifications sx={{ color: palette.fogWhite }} />
        ) : (
          <NotificationsNone sx={{ color: palette.fogWhite }} />
        )}
      </Badge>
    </IconButton>
  );
}
