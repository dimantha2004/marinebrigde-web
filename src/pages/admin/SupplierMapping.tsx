import { useMemo, useState } from 'react';
import {
  Box,
  Card,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  InputAdornment,
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import AccountTree from '@mui/icons-material/AccountTree';
import ChevronRight from '@mui/icons-material/ChevronRight';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Close from '@mui/icons-material/Close';
import Search from '@mui/icons-material/Search';
import BusinessOutlined from '@mui/icons-material/BusinessOutlined';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import type { Port, ServiceCategory, Profile } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

interface MappingRow {
  id: string;
  port_id: string | null;
  service_category_id: string | null;
  supplier_profile_id: string | null;
  active: boolean;
}

export default function AdminSupplierMapping() {
  const queryClient = useQueryClient();
  const [selectedPortId, setSelectedPortId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<ServiceCategory | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [snack, setSnack] = useState<string | null>(null);

  const portsQuery = useQuery({
    queryKey: ['admin', 'ports'],
    queryFn: async (): Promise<Port[]> => {
      const { data, error } = await supabase.from('ports').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const categoriesQuery = useQuery({
    queryKey: ['admin', 'service_categories'],
    queryFn: async (): Promise<ServiceCategory[]> => {
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const suppliersQuery = useQuery({
    queryKey: ['admin', 'suppliers'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'supplier')
        .eq('verified', true)
        .order('full_name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const mappingsQuery = useQuery({
    queryKey: ['admin', 'mappings', selectedPortId],
    enabled: !!selectedPortId,
    queryFn: async (): Promise<MappingRow[]> => {
      const { data, error } = await supabase
        .from('supplier_service_mappings')
        .select('id, port_id, service_category_id, supplier_profile_id, active')
        .eq('port_id', selectedPortId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const supplierById = useMemo(() => {
    const map = new Map<string, Profile>();
    (suppliersQuery.data ?? []).forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliersQuery.data]);

  const mappingByCategory = useMemo(() => {
    const map = new Map<string, MappingRow>();
    (mappingsQuery.data ?? []).forEach((m) => {
      if (m.service_category_id) map.set(m.service_category_id, m);
    });
    return map;
  }, [mappingsQuery.data]);

  const upsertMutation = useMutation({
    mutationFn: async ({ categoryId, supplierId }: { categoryId: string; supplierId: string }) => {
      if (!selectedPortId) throw new Error('No port selected.');
      const { error } = await supabase.from('supplier_service_mappings').upsert(
        { port_id: selectedPortId, service_category_id: categoryId, supplier_profile_id: supplierId, active: true },
        { onConflict: 'port_id,service_category_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      setSnack('Supplier assigned.');
      setActiveCategory(null);
      setSupplierSearch('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'mappings', selectedPortId] });
    },
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to assign supplier.'),
  });

  const filteredSuppliers = useMemo(() => {
    const list = suppliersQuery.data ?? [];
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) => s.full_name.toLowerCase().includes(q) || (s.company_name ?? '').toLowerCase().includes(q)
    );
  }, [suppliersQuery.data, supplierSearch]);

  const loadingTop = portsQuery.isLoading || categoriesQuery.isLoading;
  const topError = portsQuery.error || categoriesQuery.error || suppliersQuery.error;

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        Supplier Mapping
      </Typography>

      {loadingTop ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : topError ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load mapping data.</Typography>
        </Box>
      ) : (
        <>
          <TextField
            select
            label="Port"
            value={selectedPortId}
            onChange={(e) => setSelectedPortId(e.target.value)}
            fullWidth
            sx={{ mb: 2, maxWidth: 480 }}
          >
            {(portsQuery.data ?? []).map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name}
                {p.locode ? ` (${p.locode})` : ''}
              </MenuItem>
            ))}
          </TextField>

          {!selectedPortId ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <AccountTree sx={{ color: palette.hullGray, fontSize: 30 }} />
              <Typography sx={{ color: palette.hullGray, mt: 1 }}>
                Select a port to view and assign suppliers per service.
              </Typography>
            </Box>
          ) : mappingsQuery.isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: palette.steelBlue }} />
            </Box>
          ) : (
            <>
              <Typography sx={{ color: palette.hullGray, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, mb: 1 }}>
                Services
              </Typography>
              {(categoriesQuery.data ?? []).map((cat) => {
                const mapping = mappingByCategory.get(cat.id);
                const supplier = mapping?.supplier_profile_id ? supplierById.get(mapping.supplier_profile_id) : null;
                return (
                  <Card
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat);
                      setSupplierSearch('');
                    }}
                    sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
                  >
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: `${radius.sm}px`,
                        bgcolor: palette.navyDeep,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <ServiceCategoryIcon name={cat.name} size={20} color={palette.steelBlue} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>{cat.name}</Typography>
                      {supplier ? (
                        <Typography noWrap sx={{ color: palette.engineGreen, fontSize: 13 }}>
                          {supplier.full_name}
                          {supplier.company_name ? ` · ${supplier.company_name}` : ''}
                        </Typography>
                      ) : (
                        <Typography sx={{ color: palette.signalAmber, fontSize: 13 }}>Unassigned</Typography>
                      )}
                    </Box>
                    <ChevronRight sx={{ color: palette.hullGray }} />
                  </Card>
                );
              })}
            </>
          )}
        </>
      )}

      <Dialog
        open={!!activeCategory}
        onClose={() => setActiveCategory(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, maxHeight: '80vh' } } }}
      >
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography noWrap sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
              {activeCategory?.name ?? ''}
            </Typography>
            <IconButton onClick={() => setActiveCategory(null)}>
              <Close sx={{ color: palette.fogWhite }} />
            </IconButton>
          </Box>
          <Typography sx={{ color: palette.hullGray, fontSize: 13, mb: 1 }}>Assign one verified supplier</Typography>

          <TextField
            fullWidth
            size="small"
            placeholder="Search suppliers"
            value={supplierSearch}
            onChange={(e) => setSupplierSearch(e.target.value)}
            sx={{ mb: 1 }}
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

          {suppliersQuery.isLoading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: palette.steelBlue }} />
            </Box>
          ) : filteredSuppliers.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <BusinessOutlined sx={{ color: palette.hullGray, fontSize: 28 }} />
              <Typography sx={{ color: palette.hullGray, mt: 1 }}>No verified suppliers found.</Typography>
            </Box>
          ) : (
            filteredSuppliers.map((item) => {
              const current =
                activeCategory && mappingByCategory.get(activeCategory.id)?.supplier_profile_id === item.id;
              return (
                <Box
                  key={item.id}
                  onClick={() =>
                    activeCategory && upsertMutation.mutate({ categoryId: activeCategory.id, supplierId: item.id })
                  }
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1.25,
                    px: 1,
                    cursor: 'pointer',
                    borderBottom: `1px solid ${palette.oceanMid}`,
                    '&:hover': { bgcolor: palette.oceanMid },
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 15 }}>
                      {item.full_name}
                    </Typography>
                    {item.company_name && (
                      <Typography noWrap sx={{ color: palette.hullGray, fontSize: 12 }}>
                        {item.company_name}
                      </Typography>
                    )}
                  </Box>
                  {current ? (
                    <CheckCircle sx={{ color: palette.engineGreen, fontSize: 22 }} />
                  ) : (
                    <ChevronRight sx={{ color: palette.hullGray }} />
                  )}
                </Box>
              );
            })
          )}

          {upsertMutation.isPending && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, pt: 1 }}>
              <CircularProgress size={16} sx={{ color: palette.steelBlue }} />
              <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>Saving…</Typography>
            </Box>
          )}
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
