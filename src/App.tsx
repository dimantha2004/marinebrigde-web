import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

import { supabase } from '@/lib/supabase';
import { getProfile, ROLE_HOME } from '@/lib/auth';
import { startHeartbeat, stopHeartbeat, removeActiveSession } from '@/lib/heartbeat';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/database';
import { palette } from '@/constants/theme';

import AppShell from '@/components/AppShell';
import Login from '@/pages/auth/Login';
import Register from '@/pages/auth/Register';
import PendingVerification from '@/pages/auth/PendingVerification';

// Captain
import CaptainDashboard from '@/pages/captain/Dashboard';
import CaptainOrders from '@/pages/captain/Orders';
import CaptainOrderDetail from '@/pages/captain/OrderDetail';
import CaptainNotifications from '@/pages/captain/Notifications';
import CaptainProfile from '@/pages/captain/Profile';
import NewOrderStart from '@/pages/captain/new-order/Start';
import NewOrderAddServices from '@/pages/captain/new-order/AddServices';
import NewOrderCart from '@/pages/captain/new-order/Cart';



// Charter party
import CharterDashboard from '@/pages/charter-party/Dashboard';
import CharterApprovals from '@/pages/charter-party/Approvals';
import CharterPayments from '@/pages/charter-party/Payments';
import CharterActive from '@/pages/charter-party/Active';
import CharterHistory from '@/pages/charter-party/History';
import CharterOrderDetail from '@/pages/charter-party/OrderDetail';
import CharterCheckout from '@/pages/charter-party/Checkout';
import CharterProfile from '@/pages/charter-party/Profile';

// Port authority
import PortDashboard from '@/pages/port-authority/Dashboard';
import PortApprovals from '@/pages/port-authority/Approvals';
import PortProfile from '@/pages/port-authority/Profile';

// Ship agent
import AgentHub from '@/pages/ship-agent/Hub';
import AgentOrders from '@/pages/ship-agent/Orders';
import AgentOrderDetail from '@/pages/ship-agent/OrderDetail';
import AgentDocuments from '@/pages/ship-agent/Documents';
import AgentProfile from '@/pages/ship-agent/Profile';

// Admin
import AdminUsers from '@/pages/admin/Users';
import AdminMonitoring from '@/pages/admin/Monitoring';
import AdminSupplierMapping from '@/pages/admin/SupplierMapping';
import AdminPorts from '@/pages/admin/Ports';
import AdminSettings from '@/pages/admin/Settings';

/**
 * Bootstraps the Supabase session + profile and keeps the auth store in sync.
 * Mirrors the mobile app/_layout.tsx useAuthBootstrap. Returns true once the
 * initial session has resolved.
 */
function useAuthBootstrap(): boolean {
  const setSession = useAuthStore((s) => s.setSession);
  const setProfile = useAuthStore((s) => s.setProfile);
  const reset = useAuthStore((s) => s.reset);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string): Promise<boolean> => {
      const { data, error } = await getProfile(userId);
      if (!mounted) return false;
      if (error || !data) {
        reset();
        return false;
      }
      setProfile(data);
      return true;
    };

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!mounted) return;
      if (session?.user) {
        const loaded = await loadProfile(session.user.id);
        if (loaded) {
          setSession(session);
          void startHeartbeat();
        }
      } else {
        setSession(null);
        setProfile(null);
      }
      if (mounted) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      setTimeout(() => {
        if (!mounted) return;
        if (event === 'SIGNED_OUT') {
          void removeActiveSession();
          stopHeartbeat();
          reset();
          return;
        }
        if (!session?.user) {
          setProfile(null);
          return;
        }
        setSession(session);
        const needsProfile =
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          !useAuthStore.getState().profile;
        if (needsProfile) {
          void loadProfile(session.user.id).then((ok) => {
            if (ok) void startHeartbeat();
          });
        }
      }, 0);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [reset, setProfile, setSession]);

  return ready;
}

/** Gate for a role area: redirects anon → login, unverified → pending, wrong role → home. */
function RequireRole({ role, children }: { role: UserRole; children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);

  if (status === 'anon') return <Navigate to="/login" replace />;
  if (status === 'unverified') return <Navigate to="/pending-verification" replace />;
  if (status === 'loading') return <FullScreenLoader />;
  if (profile && profile.role !== role) {
    return <Navigate to={ROLE_HOME[profile.role as UserRole]} replace />;
  }
  return <>{children}</>;
}

/** Auth pages: if already authed+verified, bounce to role home. */
function AnonOnly({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  if (status === 'authed' && profile) {
    return <Navigate to={ROLE_HOME[profile.role as UserRole]} replace />;
  }
  return <>{children}</>;
}

function FullScreenLoader() {
  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: palette.navyDeep,
      }}
    >
      <CircularProgress sx={{ color: palette.steelBlue }} />
    </Box>
  );
}

/** Sends "/" to the right place based on auth state. */
function RootRedirect() {
  const status = useAuthStore((s) => s.status);
  const profile = useAuthStore((s) => s.profile);
  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'authed' && profile) {
    return <Navigate to={ROLE_HOME[profile.role as UserRole]} replace />;
  }
  if (status === 'unverified') return <Navigate to="/pending-verification" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  const ready = useAuthBootstrap();
  // Re-render guards on navigation.
  useLocation();

  if (!ready) return <FullScreenLoader />;

  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Auth */}
      <Route path="/login" element={<AnonOnly><Login /></AnonOnly>} />
      <Route path="/register" element={<AnonOnly><Register /></AnonOnly>} />
      <Route path="/pending-verification" element={<PendingVerification />} />

      {/* Captain */}
      <Route path="/captain" element={<RequireRole role="captain"><AppShell role="captain" /></RequireRole>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CaptainDashboard />} />
        <Route path="orders" element={<CaptainOrders />} />
        <Route path="orders/:id" element={<CaptainOrderDetail />} />
        <Route path="notifications" element={<CaptainNotifications />} />
        <Route path="profile" element={<CaptainProfile />} />
        <Route path="new-order" element={<NewOrderStart />} />
        <Route path="new-order/add-services" element={<NewOrderAddServices />} />
        <Route path="new-order/cart" element={<NewOrderCart />} />
      </Route>



      {/* Charter party */}
      <Route path="/charter-party" element={<RequireRole role="charter_party"><AppShell role="charter_party" /></RequireRole>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<CharterDashboard />} />
        <Route path="approvals" element={<CharterApprovals />} />
        <Route path="payments" element={<CharterPayments />} />
        <Route path="active" element={<CharterActive />} />
        <Route path="history" element={<CharterHistory />} />
        <Route path="order/:orderId" element={<CharterOrderDetail />} />
        <Route path="checkout" element={<CharterCheckout />} />
        <Route path="profile" element={<CharterProfile />} />
      </Route>

      {/* Port authority */}
      <Route path="/port-authority" element={<RequireRole role="port_authority"><AppShell role="port_authority" /></RequireRole>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PortDashboard />} />
        <Route path="approvals" element={<PortApprovals />} />
        <Route path="profile" element={<PortProfile />} />
      </Route>

      {/* Ship agent */}
      <Route path="/ship-agent" element={<RequireRole role="ship_agent"><AppShell role="ship_agent" /></RequireRole>}>
        <Route index element={<Navigate to="hub" replace />} />
        <Route path="hub" element={<AgentHub />} />
        <Route path="orders" element={<AgentOrders />} />
        <Route path="orders/:id" element={<AgentOrderDetail />} />
        <Route path="documents" element={<AgentDocuments />} />
        <Route path="profile" element={<AgentProfile />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RequireRole role="admin"><AppShell role="admin" /></RequireRole>}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="monitoring" element={<AdminMonitoring />} />
        <Route path="supplier-mapping" element={<AdminSupplierMapping />} />
        <Route path="ports" element={<AdminPorts />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}
