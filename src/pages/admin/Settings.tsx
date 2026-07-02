import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Typography, Button, CircularProgress, Divider, Snackbar, Alert } from '@mui/material';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Logout from '@mui/icons-material/Logout';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import type { ServiceCategory } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

export default function AdminSettings() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const [signingOut, setSigningOut] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);

  const { data: categories, isLoading, error } = useQuery({
    queryKey: ['admin', 'service_categories'],
    queryFn: async (): Promise<ServiceCategory[]> => {
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleSignOut = async () => {
    setSigningOut(true);
    const { error: soErr } = await signOut();
    if (soErr) {
      setSigningOut(false);
      setSnack(soErr.message);
      return;
    }
    reset();
    navigate('/login', { replace: true });
  };

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Settings
      </Typography>

      <Card sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: palette.steelBlue,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <VerifiedUser sx={{ color: palette.fogWhite }} />
        </Box>
        <Box>
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 17 }}>
            {profile?.full_name ?? 'Administrator'}
          </Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>Admin</Typography>
        </Box>
      </Card>

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16 }}>Service Catalog</Typography>
      <Typography sx={{ color: palette.hullGray, fontSize: 12, mb: 1 }}>
        Read-only.
      </Typography>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 26 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load catalog.</Typography>
        </Box>
      ) : (categories ?? []).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 3 }}>
          <Inventory2Outlined sx={{ color: palette.hullGray, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No service categories found.</Typography>
        </Box>
      ) : (
        <Card sx={{ mb: 3 }}>
          {(categories ?? []).map((cat, idx) => (
            <Box key={cat.id}>
              {idx > 0 && <Divider sx={{ borderColor: palette.navyDeep }} />}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: `${radius.sm}px`,
                    bgcolor: palette.navyDeep,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ServiceCategoryIcon name={cat.name} size={18} color={palette.steelBlue} />
                </Box>
                <Typography sx={{ flex: 1, color: palette.fogWhite, fontWeight: 500, fontSize: 15 }}>
                  {cat.name}
                </Typography>

              </Box>
            </Box>
          ))}
        </Card>
      )}

      <Typography sx={{ fontWeight: 600, color: palette.fogWhite, fontSize: 16, mb: 1 }}>App Info</Typography>
      <Card sx={{ p: 2, mb: 3 }}>
        <InfoRow label="Application" value="MarineBridge" />
        <InfoRow label="Role" value="Administrator" />
        <InfoRow label="Environment" value="Web (Vite + React)" />
      </Card>

      <Button
        variant="contained"
        startIcon={signingOut ? undefined : <Logout />}
        onClick={handleSignOut}
        disabled={signingOut}
        sx={{ bgcolor: palette.alertRed, '&:hover': { bgcolor: palette.alertRed } }}
      >
        {signingOut ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Sign Out'}
      </Button>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="error">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
      <Typography sx={{ color: palette.hullGray, fontSize: 14 }}>{label}</Typography>
      <Typography sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14 }}>{value}</Typography>
    </Box>
  );
}
