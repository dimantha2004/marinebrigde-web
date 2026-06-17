import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, TextField, Autocomplete, Typography, CircularProgress, IconButton } from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import dayjs from 'dayjs';

import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/stores/cartStore';
import type { Port, Profile } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

type Option = { id: string; label: string; secondary?: string };

export default function NewOrderStart() {
  const navigate = useNavigate();
  const setVesselInfo = useCartStore((s) => s.setVesselInfo);
  const cart = useCartStore();

  const [vesselName, setVesselName] = useState(cart.vesselName);
  const [imoNumber, setImoNumber] = useState(cart.imoNumber);
  const [eta, setEta] = useState(cart.eta ? dayjs(cart.eta).format('YYYY-MM-DDTHH:mm') : '');
  const [etd, setEtd] = useState(cart.etd ? dayjs(cart.etd).format('YYYY-MM-DDTHH:mm') : '');

  const [port, setPort] = useState<Option | null>(
    cart.portId ? { id: cart.portId, label: cart.portName } : null
  );
  const [charter, setCharter] = useState<Option | null>(
    cart.charterPartyId ? { id: cart.charterPartyId, label: cart.charterPartyName } : null
  );
  const [agent, setAgent] = useState<Option | null>(
    cart.shipAgentId ? { id: cart.shipAgentId, label: cart.shipAgentName } : null
  );

  const [ports, setPorts] = useState<Option[]>([]);
  const [charters, setCharters] = useState<Option[]>([]);
  const [agents, setAgents] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [portsRes, charterRes, agentRes] = await Promise.all([
          supabase.from('ports').select('*').eq('active', true).order('name'),
          supabase.from('profiles').select('*').eq('role', 'charter_party').order('full_name'),
          supabase.from('profiles').select('*').eq('role', 'ship_agent').order('full_name'),
        ]);
        if (cancelled) return;
        if (portsRes.error) throw portsRes.error;
        if (charterRes.error) throw charterRes.error;
        if (agentRes.error) throw agentRes.error;
        setPorts(
          ((portsRes.data ?? []) as Port[]).map((p) => ({
            id: p.id,
            label: p.name,
            secondary: [p.country, p.locode].filter(Boolean).join(' · '),
          }))
        );
        setCharters(
          ((charterRes.data ?? []) as Profile[]).map((p) => ({
            id: p.id,
            label: p.full_name,
            secondary: p.company_name ?? '',
          }))
        );
        setAgents(
          ((agentRes.data ?? []) as Profile[]).map((p) => ({
            id: p.id,
            label: p.full_name,
            secondary: p.company_name ?? '',
          }))
        );
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canProceed = vesselName.trim().length > 0 && port !== null && charter !== null;

  const handleNext = () => {
    if (!canProceed) return;
    setVesselInfo({
      vesselName: vesselName.trim(),
      imoNumber: imoNumber.trim(),
      portId: port!.id,
      portName: port!.label,
      eta: eta.trim() ? dayjs(eta).toISOString() : null,
      etd: etd.trim() ? dayjs(etd).toISOString() : null,
      charterPartyId: charter!.id,
      charterPartyName: charter!.label,
      shipAgentId: agent?.id ?? null,
      shipAgentName: agent?.label ?? '',
    });
    navigate('/captain/new-order/add-services');
  };

  return (
    <Box sx={{ maxWidth: 560 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack sx={{ color: palette.fogWhite }} />
        </IconButton>
        <Box>
          <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
            New Order
          </Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>Step 1 of 3 · Vessel</Typography>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : loadError ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>{loadError}</Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Autocomplete
            options={ports}
            value={port}
            onChange={(_, v) => setPort(v)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Port" />}
          />
          <TextField label="Vessel Name" value={vesselName} onChange={(e) => setVesselName(e.target.value)} fullWidth />
          <TextField label="IMO Number" value={imoNumber} onChange={(e) => setImoNumber(e.target.value)} fullWidth />
          <TextField
            label="ETA"
            type="datetime-local"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="ETD"
            type="datetime-local"
            value={etd}
            onChange={(e) => setEtd(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Autocomplete
            options={charters}
            value={charter}
            onChange={(_, v) => setCharter(v)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Charter Party" />}
          />
          <Autocomplete
            options={agents}
            value={agent}
            onChange={(_, v) => setAgent(v)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            renderInput={(params) => <TextField {...params} label="Ship Agent (optional)" />}
          />

          <Button variant="contained" disabled={!canProceed} onClick={handleNext} sx={{ height: 50, fontSize: 16 }}>
            Next
          </Button>
        </Box>
      )}
    </Box>
  );
}
