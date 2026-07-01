import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Snackbar,
  Alert,
  TextField,
  Typography,
} from '@mui/material';
import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

import { palette, fonts, radius } from '@/constants/theme';
import { signIn } from '@/lib/auth';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  const onSignIn = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(username.trim(), password);
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message || 'Unable to sign in. Check your credentials.');
    }
    // On success the auth guard routes the user to their role home.
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
          onSignIn();
        }}
        sx={{ width: '100%', maxWidth: 420 }}
      >
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: `${radius.lg}px`,
              bgcolor: palette.oceanMid,
              border: `1px solid ${palette.steelBlue}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <DirectionsBoat sx={{ fontSize: 34, color: palette.fogWhite }} />
          </Box>
          <Typography
            sx={{ fontFamily: fonts.display, fontSize: 40, letterSpacing: 4, color: palette.fogWhite }}
          >
            MarineBridge
          </Typography>
          <Typography sx={{ color: palette.hullGray, mt: 0.5 }}>
            Maritime provisioning, coordinated.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            disabled={submitting}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={submitting}
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined />
                  </InputAdornment>
                ),
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

          <Button
            type="submit"
            variant="contained"
            disabled={!canSubmit}
            sx={{ height: 48, mt: 1 }}
          >
            {submitting ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Sign In'}
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
            <Typography sx={{ color: palette.hullGray }}>New to MarineBridge?&nbsp;</Typography>
            <Link component={RouterLink} to="/register" sx={{ fontWeight: 600, color: palette.steelBlue }}>
              Create an account
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
