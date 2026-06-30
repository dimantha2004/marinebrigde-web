import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  MenuItem,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from '@mui/material';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { palette, fonts, radius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { signUp } from '@/lib/auth';
import type { UserRole } from '@/types/database';

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'captain', label: 'Captain' },
  { value: 'charter_party', label: 'Charter Party' },
  { value: 'ship_agent', label: 'Ship Agent' },
  { value: 'port_authority', label: 'Port Authority' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface RoleField {
  key: string;
  label: string;
  required: boolean;
  type?: string;
}

const ROLE_FIELDS: Record<UserRole, RoleField[]> = {
  captain: [
    { key: 'passport_no', label: 'Passport No', required: true },
    { key: 'sid_no', label: 'SID No', required: true },
  ],
  charter_party: [
    { key: 'cp_no', label: 'CP (Charterparty) No', required: true },
    { key: 'imo_no', label: 'IMO No', required: true },
    { key: 'contract_date', label: 'Contract Date', required: true, type: 'date' },
  ],
  ship_agent: [
    { key: 'company_reg_no', label: 'Company Registration No', required: true },
    { key: 'imo_agent_code', label: 'IMO Agent Code', required: true },
    { key: 'tin_no', label: 'TIN No', required: true },
  ],
  port_authority: [
    { key: 'unlocode', label: 'UN/LOCODE', required: true },
    { key: 'port_id_text', label: 'Port ID', required: true },
    { key: 'isps_code', label: 'ISPS Code', required: true },
  ],
  supplier: [],
  admin: [],
};

export default function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<string>('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});

  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceCategories, setServiceCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('service_categories').select('id, name').order('name');
      if (data) setServiceCategories(data);
    })();
  }, []);

  const activeFields = useMemo(() => ROLE_FIELDS[role as UserRole] ?? [], [role]);

  const handleRoleChange = (newRole: string) => {
    setRole(newRole);
    setExtraFields({});
  };

  const setExtra = (key: string, value: string) =>
    setExtraFields((prev) => ({ ...prev, [key]: value }));

  const validate = (): string | null => {
    if (fullName.trim().length < 2) return 'Please enter your full name.';
    if (username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (!role) return 'Please select a role.';
    for (const field of activeFields) {
      if (field.required && !(extraFields[field.key] ?? '').trim()) {
        return `${field.label} is required.`;
      }
    }
    return null;
  };

  const onSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);

    const extra: Record<string, string | null> = {};
    for (const field of activeFields) {
      extra[field.key] = (extraFields[field.key] ?? '').trim() || null;
    }

    const { error: signUpError } = await signUp({
      email: email.trim(),
      username: username.trim(),
      password,
      full_name: fullName.trim(),
      role: role as UserRole,
      company_name: companyName.trim() || null,
      phone: phone.trim() || null,
      ...extra,
    });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message || 'Unable to create account.');
      return;
    }
    navigate('/pending-verification', { replace: true });
  };

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
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        sx={{ width: '100%', maxWidth: 460, py: 4 }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: `${radius.md}px`,
              bgcolor: palette.oceanMid,
              border: `1px solid ${palette.steelBlue}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <DirectionsBoat sx={{ fontSize: 28, color: palette.fogWhite }} />
          </Box>
          <Typography sx={{ fontFamily: fonts.display, fontSize: 26, color: palette.fogWhite }}>
            Create account
          </Typography>
          <Typography sx={{ color: palette.hullGray, mt: 0.5 }}>
            Register to coordinate maritime provisioning.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={submitting} fullWidth />
          <TextField label="Username" value={username} onChange={(e) => setUsername(e.target.value)} disabled={submitting} fullWidth />
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} fullWidth />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            fullWidth
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((v) => !v)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            select
            label="Role"
            value={role}
            onChange={(e) => handleRoleChange(e.target.value)}
            disabled={submitting}
            fullWidth
          >
            <MenuItem value="" disabled>Select role</MenuItem>
            {ROLE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>

          {activeFields.map((field) => {
            if (field.key === 'service_category_id') {
              return (
                <TextField
                  key={field.key}
                  select
                  label={field.label}
                  value={extraFields.service_category_id ?? ''}
                  onChange={(e) => setExtra('service_category_id', e.target.value)}
                  disabled={submitting}
                  fullWidth
                >
                  {serviceCategories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>
              );
            }
            return (
              <TextField
                key={field.key}
                label={field.label}
                type={field.type ?? 'text'}
                value={extraFields[field.key] ?? ''}
                onChange={(e) => setExtra(field.key, e.target.value)}
                disabled={submitting}
                fullWidth
                slotProps={field.type === 'date' ? { inputLabel: { shrink: true } } : undefined}
              />
            );
          })}

          <TextField label="Company name (optional)" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={submitting} fullWidth />
          <TextField label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} fullWidth />

          <Button type="submit" variant="contained" disabled={submitting} sx={{ height: 48, mt: 1 }}>
            {submitting ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Create account'}
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
            <Typography sx={{ color: palette.hullGray }}>Already have an account?&nbsp;</Typography>
            <Link component={RouterLink} to="/login" sx={{ fontWeight: 600, color: palette.steelBlue }}>
              Sign in
            </Link>
          </Box>
        </Box>
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
