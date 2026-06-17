import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, CircularProgress, Snackbar, Alert, Typography } from '@mui/material';
import AccessTime from '@mui/icons-material/AccessTime';

import { palette, fonts, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { forceClearAuth, getProfile } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';

/**
 * Shown to a signed-in but unverified user. Subscribes to realtime changes on
 * the user's own profiles row; when `verified` flips to true we re-fetch the
 * profile — the auth guard then routes to the role home automatically.
 */
export default function PendingVerification() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const setProfile = useAuthStore((s) => s.setProfile);
  const reset = useAuthStore((s) => s.reset);
  const userId = session?.user.id ?? null;

  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const refetch = async () => {
      const { data } = await getProfile(userId);
      if (data) setProfile(data);
    };

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => {
          const next = payload.new as { verified?: boolean } | null;
          if (next?.verified) void refetch();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, setProfile]);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    setError(null);
    try {
      await forceClearAuth();
      reset();
      navigate('/login', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign out.');
      setSigningOut(false);
    }
  }, [reset, navigate]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: palette.navyDeep,
        p: 3,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: palette.oceanMid,
          borderRadius: `${radius.lg}px`,
          p: 4,
          textAlign: 'center',
          border: `1px solid ${palette.surfaceVariant}`,
        }}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: palette.navyDeep,
            border: `1px solid ${palette.signalAmber}`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
          }}
        >
          <AccessTime sx={{ fontSize: 40, color: palette.signalAmber }} />
        </Box>

        <Typography sx={{ fontFamily: fonts.display, fontSize: 22, color: palette.fogWhite, mb: 2 }}>
          Account pending admin verification
        </Typography>
        <Typography sx={{ color: palette.hullGray, lineHeight: 1.5 }}>
          Your account has been created. A system administrator must verify your access before you
          can continue. You will be routed automatically as soon as your account is approved — no
          need to refresh.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, my: 3 }}>
          <CircularProgress size={18} sx={{ color: palette.steelBlue }} />
          <Typography sx={{ color: palette.steelBlue, fontSize: 13, fontWeight: 500 }}>
            Waiting for approval…
          </Typography>
        </Box>

        <Button
          variant="outlined"
          onClick={onSignOut}
          disabled={signingOut}
          fullWidth
          sx={{ height: 46, color: palette.fogWhite, borderColor: palette.hullGray }}
        >
          {signingOut ? <CircularProgress size={18} sx={{ color: palette.fogWhite }} /> : 'Sign Out'}
        </Button>
      </Box>

      <Snackbar
        open={!!error}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)} variant="filled">
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
