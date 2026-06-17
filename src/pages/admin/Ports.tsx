import { useState } from 'react';
import {
  Box,
  Card,
  Typography,
  Button,
  TextField,
  Switch,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  FormControlLabel,
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import Add from '@mui/icons-material/Add';
import Close from '@mui/icons-material/Close';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import type { Port } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

export default function AdminPorts() {
  const queryClient = useQueryClient();
  const [snack, setSnack] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [locode, setLocode] = useState('');
  const [active, setActive] = useState(true);

  const { data: ports, isLoading, error } = useQuery({
    queryKey: ['admin', 'ports'],
    queryFn: async (): Promise<Port[]> => {
      const { data, error } = await supabase.from('ports').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Port name is required.');
      const { error: insErr } = await supabase.from('ports').insert({
        name: trimmed,
        country: country.trim() || null,
        locode: locode.trim() ? locode.trim().toUpperCase() : null,
        active,
      });
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      setSnack('Port added.');
      setAddOpen(false);
      setName('');
      setCountry('');
      setLocode('');
      setActive(true);
      queryClient.invalidateQueries({ queryKey: ['admin', 'ports'] });
    },
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to add port.'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error: updErr } = await supabase.from('ports').update({ active: next }).eq('id', id);
      if (updErr) throw updErr;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'ports'] }),
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to update port.'),
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22 }}>Ports</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
          Add Port
        </Button>
      </Box>

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load ports.</Typography>
        </Box>
      ) : (ports ?? []).length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <DirectionsBoatOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>No ports yet. Add your first one.</Typography>
        </Box>
      ) : (
        (ports ?? []).map((item) => (
          <Card key={item.id} sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 16 }}>
                  {item.name}
                </Typography>
                {item.locode && (
                  <Typography sx={{ fontFamily: 'monospace', color: palette.steelBlue, fontSize: 12 }}>
                    {item.locode}
                  </Typography>
                )}
              </Box>
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
                {item.country ?? 'Unknown country'} ·{' '}
                <Box component="span" sx={{ color: item.active ? palette.engineGreen : palette.hullGray, fontWeight: 500 }}>
                  {item.active ? 'Active' : 'Inactive'}
                </Box>
              </Typography>
            </Box>
            <Switch
              checked={item.active}
              onChange={(e) => toggleMutation.mutate({ id: item.id, next: e.target.checked })}
              color="success"
            />
          </Card>
        ))
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { bgcolor: palette.navyDeep } } }}>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>Add Port</Typography>
            <IconButton onClick={() => setAddOpen(false)}>
              <Close sx={{ color: palette.fogWhite }} />
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField label="Country" value={country} onChange={(e) => setCountry(e.target.value)} fullWidth />
            <TextField label="LOCODE (e.g. NLRTM)" value={locode} onChange={(e) => setLocode(e.target.value.toUpperCase())} fullWidth />
            <FormControlLabel
              control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} color="success" />}
              label="Active"
              sx={{ color: palette.fogWhite }}
            />
            <Button
              variant="contained"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !name.trim()}
            >
              {addMutation.isPending ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Add Port'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="info">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}
