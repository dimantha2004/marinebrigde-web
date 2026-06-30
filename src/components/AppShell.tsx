import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Popover,
  Divider,
  Button,
  IconButton,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import GridView from '@mui/icons-material/GridView';
import ListAlt from '@mui/icons-material/ListAlt';
import NotificationsNone from '@mui/icons-material/NotificationsNone';
import Person from '@mui/icons-material/Person';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import History from '@mui/icons-material/History';
import Speed from '@mui/icons-material/Speed';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Explore from '@mui/icons-material/Explore';
import Description from '@mui/icons-material/Description';
import People from '@mui/icons-material/People';
import MonitorHeart from '@mui/icons-material/MonitorHeart';
import AccountTree from '@mui/icons-material/AccountTree';
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import Menu from '@mui/icons-material/Menu';

import { palette, fonts } from '@/constants/theme';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { useQueryClient } from '@tanstack/react-query';
import type { UserRole } from '@/types/database';
import NotificationBell from '@/components/shared/NotificationBell';
import GlobalChatButton from '@/components/shared/GlobalChatButton';
import dayjs from 'dayjs';

const DRAWER_WIDTH = 240;

type NavItem = { label: string; path: string; icon: SvgIconComponent };

const NAV: Record<UserRole, { base: string; items: NavItem[] }> = {
  captain: {
    base: '/captain',
    items: [
      { label: 'Dashboard', path: 'dashboard', icon: GridView },
      { label: 'Orders', path: 'orders', icon: ListAlt },
      { label: 'Notifications', path: 'notifications', icon: NotificationsNone },
      { label: 'Profile', path: 'profile', icon: Person },
    ],
  },
  supplier: {
    base: '/supplier',
    items: [
      { label: 'Dashboard', path: 'dashboard', icon: GridView },
      { label: 'Orders', path: 'orders', icon: ListAlt },
      { label: 'Profile', path: 'profile', icon: Person },
    ],
  },
  charter_party: {
    base: '/charter-party',
    items: [
      { label: 'Approvals', path: 'approvals', icon: CheckCircleOutlined },
      { label: 'History', path: 'history', icon: History },
      { label: 'Profile', path: 'profile', icon: Person },
    ],
  },
  port_authority: {
    base: '/port-authority',
    items: [
      { label: 'Dashboard', path: 'dashboard', icon: Speed },
      { label: 'Approvals', path: 'approvals', icon: VerifiedUser },
      { label: 'Profile', path: 'profile', icon: Person },
    ],
  },
  ship_agent: {
    base: '/ship-agent',
    items: [
      { label: 'Hub', path: 'hub', icon: Explore },
      { label: 'Orders', path: 'orders', icon: ListAlt },
      { label: 'Documents', path: 'documents', icon: Description },
      { label: 'Profile', path: 'profile', icon: Person },
    ],
  },
  admin: {
    base: '/admin',
    items: [
      { label: 'Users', path: 'users', icon: People },
      { label: 'Live', path: 'monitoring', icon: MonitorHeart },
      { label: 'Ports', path: 'ports', icon: DirectionsBoat },
      { label: 'Settings', path: 'settings', icon: Settings },
    ],
  },
};

export default function AppShell({ role }: { role: UserRole }) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const queryClient = useQueryClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);

  const { data: notifications, unreadCount } = useNotifications(userId);
  const markRead = useMarkNotificationRead();

  // Realtime: refresh notifications when a new row lands for this user.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const { base, items } = NAV[role];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 2.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            bgcolor: palette.oceanMid,
            border: `1px solid ${palette.steelBlue}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <DirectionsBoat sx={{ color: palette.fogWhite }} />
        </Box>
        <Typography sx={{ fontFamily: fonts.display, fontSize: 18, letterSpacing: 1, color: palette.fogWhite }}>
          Marinebridge
        </Typography>
      </Box>
      <Divider sx={{ borderColor: palette.surfaceVariant }} />

      <List sx={{ flex: 1, px: 1, py: 1 }}>
        {items.map((item) => {
          const to = `${base}/${item.path}`;
          const active = location.pathname.startsWith(to);
          const Icon = item.icon;
          return (
            <ListItemButton
              key={item.path}
              selected={active}
              onClick={() => {
                navigate(to);
                setMobileOpen(false);
              }}
              sx={{
                borderRadius: 1.5,
                mb: 0.5,
                '&.Mui-selected': { bgcolor: palette.oceanMid },
                '&.Mui-selected:hover': { bgcolor: palette.oceanMid },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: active ? palette.steelBlue : palette.hullGray }}>
                <Icon />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: {
                    sx: {
                      fontWeight: active ? 600 : 500,
                      color: active ? palette.fogWhite : palette.hullGray,
                    },
                  },
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      <Divider sx={{ borderColor: palette.surfaceVariant }} />
      <Box sx={{ p: 2 }}>
        <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 14 }}>
          {profile?.full_name}
        </Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 12, mb: 1.5 }}>
          {profile?.company_name ?? role.replace('_', ' ')}
        </Typography>
        <Button
          fullWidth
          variant="outlined"
          size="small"
          startIcon={<Logout />}
          onClick={() => signOut()}
          sx={{ color: palette.fogWhite, borderColor: palette.hullGray }}
        >
          Sign Out
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: palette.navyDeep }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: `1px solid ${palette.surfaceVariant}`,
        }}
      >
        <Toolbar>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 1, color: palette.fogWhite }}>
              <Menu />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }} />
          <NotificationBell count={unreadCount} onClick={(e) => setNotifAnchor(e.currentTarget)} />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant={isDesktop ? 'permanent' : 'temporary'}
          open={isDesktop ? true : mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
              bgcolor: palette.navyDeep,
              borderRight: `1px solid ${palette.surfaceVariant}`,
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, width: { md: `calc(100% - ${DRAWER_WIDTH}px)` }, minWidth: 0 }}>
        <Toolbar />
        <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>

      <GlobalChatButton />

      <Popover
        open={!!notifAnchor}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 360, maxHeight: 480, bgcolor: palette.oceanMid } } }}
      >
        <Box sx={{ p: 2, borderBottom: `1px solid ${palette.surfaceVariant}` }}>
          <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite }}>Notifications</Typography>
        </Box>
        {(notifications ?? []).length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ color: palette.hullGray }}>No notifications.</Typography>
          </Box>
        ) : (
          <List sx={{ py: 0 }}>
            {(notifications ?? []).slice(0, 30).map((n) => (
              <ListItemButton
                key={n.id}
                onClick={() => {
                  if (!n.read) markRead.mutate(n.id);
                  if (n.order_id) {
                    setNotifAnchor(null);
                    navigate(`${base}/orders/${n.order_id}`);
                  }
                }}
                sx={{ alignItems: 'flex-start', borderLeft: n.read ? 'none' : `3px solid ${palette.steelBlue}` }}
              >
                <ListItemText
                  primary={n.title ?? 'Notification'}
                  secondary={
                    <>
                      <Typography component="span" sx={{ color: palette.hullGray, fontSize: 13, display: 'block' }}>
                        {n.body}
                      </Typography>
                      <Typography component="span" sx={{ color: palette.hullGray, fontSize: 11 }}>
                        {dayjs(n.created_at).format('MMM D · HH:mm')}
                      </Typography>
                    </>
                  }
                  slotProps={{ primary: { sx: { color: palette.fogWhite, fontWeight: n.read ? 500 : 600, fontSize: 14 } } }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Popover>
    </Box>
  );
}
