import { useMemo, useState } from 'react';
import { Box, Typography, CircularProgress, TextField, InputAdornment } from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import Search from '@mui/icons-material/Search';
import Description from '@mui/icons-material/Description';
import DirectionsBoatOutlined from '@mui/icons-material/DirectionsBoatOutlined';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { openDocument } from '@/lib/storage';
import DocumentCard from '@/components/shared/DocumentCard';
import type { OrderDocument } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

interface AggregatedDocument extends OrderDocument {
  order: { id: string; order_number: string | null; vessel_name: string } | null;
}

function useAgentDocuments(userId: string | null) {
  return useQuery<AggregatedDocument[]>({
    queryKey: ['agent-documents', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_documents')
        .select(
          `*,
           order:orders!order_documents_order_id_fkey ( id, order_number, vessel_name, ship_agent_id )`
        )
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows =
        (data as unknown as (AggregatedDocument & {
          order: (AggregatedDocument['order'] & { ship_agent_id: string | null }) | null;
        })[]) ?? [];
      return rows.filter((d) => d.order && d.order.ship_agent_id === userId);
    },
  });
}

export default function AgentDocuments() {
  const userId = useAuthStore((s) => s.session?.user?.id ?? null);
  const { data, isLoading, error } = useAgentDocuments(userId);
  const [search, setSearch] = useState('');

  const docs = data ?? [];

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? docs.filter((d) =>
          `${d.file_name ?? ''} ${d.order?.vessel_name ?? ''} ${d.order?.order_number ?? ''}`
            .toLowerCase()
            .includes(q)
        )
      : docs;

    const byVessel = new Map<string, { title: string; data: AggregatedDocument[] }>();
    for (const d of filtered) {
      const key = d.order?.id ?? 'unknown';
      const title = d.order?.vessel_name ?? 'Unknown vessel';
      if (!byVessel.has(key)) byVessel.set(key, { title, data: [] });
      byVessel.get(key)!.data.push(d);
    }
    return Array.from(byVessel.values());
  }, [docs, search]);

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Documents
      </Typography>

      <TextField
        fullWidth
        size="small"
        placeholder="Search documents or vessels"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: palette.hullGray }} />
              </InputAdornment>
            ),
          },
        }}
      />

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load documents.</Typography>
        </Box>
      ) : groups.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Description sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            {search.trim() ? 'No documents match your search.' : 'No documents across your vessels yet.'}
          </Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12, mt: 0.5, opacity: 0.8 }}>
            Open an order to upload coordination paperwork.
          </Typography>
        </Box>
      ) : (
        groups.map((group) => (
          <Box key={group.title} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 2, mb: 1 }}>
              <DirectionsBoatOutlined sx={{ fontSize: 16, color: palette.steelBlue }} />
              <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>{group.title}</Typography>
            </Box>
            {group.data.map((doc) => (
              <DocumentCard key={doc.id} document={doc} onOpen={(d) => d.file_url && openDocument(d.file_url)} />
            ))}
          </Box>
        ))
      )}
    </Box>
  );
}
