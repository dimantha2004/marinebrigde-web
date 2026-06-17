import { useState } from 'react';
import { Box, Avatar, Button, Card, Typography, Divider, CircularProgress } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import CallOutlined from '@mui/icons-material/CallOutlined';
import VerifiedUser from '@mui/icons-material/VerifiedUser';
import Logout from '@mui/icons-material/Logout';

import { signOut } from '@/lib/auth';
import { useAuthStore } from '@/stores/authStore';
import { palette, fonts } from '@/constants/theme';

export type ProfileExtraField = { label: string; value: string | null | undefined };

/**
 * Shared profile screen used by every role. The role label + icon and any
 * role-specific extra fields are passed in; the rest (avatar, company, phone,
 * verification, sign out) is identical across roles.
 */
export default function ProfilePage({
  roleLabel,
  roleIcon: RoleIcon,
  extraFields = [],
}: {
  roleLabel: string;
  roleIcon: SvgIconComponent;
  extraFields?: ProfileExtraField[];
}) {
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    reset();
    setSigningOut(false);
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '—';

  return (
    <Box sx={{ maxWidth: 560, mx: 'auto' }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Avatar
          src={profile?.avatar_url ?? undefined}
          sx={{ width: 84, height: 84, mx: 'auto', bgcolor: palette.steelBlue, fontFamily: fonts.display, fontSize: 30 }}
        >
          {initials}
        </Avatar>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mt: 2 }}>
          {profile?.full_name ?? roleLabel}
        </Typography>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            bgcolor: palette.steelBlue,
            borderRadius: 999,
            px: 2,
            py: 0.5,
            mt: 1,
          }}
        >
          <RoleIcon sx={{ fontSize: 14, color: palette.fogWhite }} />
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 13 }}>{roleLabel}</Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Box sx={{ p: 2 }}>
          <Field icon={BusinessOutlined} label="Company" value={profile?.company_name ?? '—'} />
          <Divider sx={{ borderColor: palette.navyDeep }} />
          <Field icon={CallOutlined} label="Phone" value={profile?.phone ?? '—'} />
          <Divider sx={{ borderColor: palette.navyDeep }} />
          <Field
            icon={VerifiedUser}
            label="Verification"
            value={profile?.verified ? 'Verified' : 'Pending'}
            valueColor={profile?.verified ? palette.engineGreen : palette.signalAmber}
          />
          {extraFields.map((f) => (
            <Box key={f.label}>
              <Divider sx={{ borderColor: palette.navyDeep }} />
              <Field icon={VerifiedUser} label={f.label} value={f.value ?? '—'} hideIcon />
            </Box>
          ))}
        </Box>
      </Card>

      <Button
        variant="outlined"
        fullWidth
        disabled={signingOut}
        startIcon={signingOut ? <CircularProgress size={16} sx={{ color: palette.alertRed }} /> : <Logout />}
        onClick={handleSignOut}
        sx={{ height: 48, color: palette.alertRed, borderColor: palette.alertRed }}
      >
        Sign Out
      </Button>
    </Box>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  valueColor,
  hideIcon,
}: {
  icon: SvgIconComponent;
  label: string;
  value: string;
  valueColor?: string;
  hideIcon?: boolean;
}) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1.25 }}>
      <Box sx={{ width: 20, display: 'flex', justifyContent: 'center' }}>
        {!hideIcon && <Icon sx={{ fontSize: 18, color: palette.hullGray }} />}
      </Box>
      <Typography sx={{ color: palette.hullGray, fontSize: 14, flex: 1, fontWeight: 500 }}>{label}</Typography>
      <Typography sx={{ color: valueColor ?? palette.fogWhite, fontWeight: 600, fontSize: 14 }}>{value}</Typography>
    </Box>
  );
}
