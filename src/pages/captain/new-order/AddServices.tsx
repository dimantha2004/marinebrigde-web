import { createElement, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  TextField,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import ArrowBack from '@mui/icons-material/ArrowBack';
import WarningAmber from '@mui/icons-material/WarningAmber';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ShoppingCart from '@mui/icons-material/ShoppingCart';

import { supabase } from '@/lib/supabase';
import { useCartStore } from '@/stores/cartStore';
import { SERVICE_CATEGORIES, COMMON_UNITS, serviceIconFor, muiIconFor } from '@/constants/serviceCategories';
import ServiceCategoryIcon from '@/components/shared/ServiceCategoryIcon';
import type { ServiceCategory } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

export default function NewOrderAddServices() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const addOrUpdateItem = useCartStore((s) => s.addOrUpdateItem);
  const getItem = useCartStore((s) => s.getItem);

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [activeName, setActiveName] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [requestedDatetime, setRequestedDatetime] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase.from('service_categories').select('*').order('name');
      if (cancelled) return;
      if (error) setLoadError(error.message);
      else setCategories((data ?? []) as ServiceCategory[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) map.set(c.name, c.id);
    return map;
  }, [categories]);

  const openSheet = (name: string) => {
    const def = SERVICE_CATEGORIES.find((c) => c.name === name);
    const categoryId = categoryIdByName.get(name);
    const existing = categoryId ? getItem(categoryId) : undefined;
    setActiveName(name);
    setQuantity(existing ? String(existing.quantity) : '1');
    setUnit(existing?.unit ?? def?.defaultUnit ?? COMMON_UNITS[0]);
    setSpecifications(existing?.specifications ?? '');
    setRequestedDatetime(existing?.requestedDatetime ?? '');
    setSpecialInstructions(existing?.specialInstructions ?? '');
    setUnitPrice(existing ? String(existing.estimatedUnitPrice) : '');
  };

  const closeSheet = () => setActiveName(null);

  const saveItem = () => {
    if (!activeName) return;
    const categoryId = categoryIdByName.get(activeName);
    if (!categoryId) {
      setLoadError(`Service "${activeName}" is not configured.`);
      closeSheet();
      return;
    }
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    addOrUpdateItem({
      serviceCategoryId: categoryId,
      serviceName: activeName,
      iconName: serviceIconFor(activeName),
      quantity: qty,
      unit: unit || 'units',
      specifications: specifications.trim(),
      specialInstructions: specialInstructions.trim(),
      requestedDatetime: requestedDatetime.trim() || null,
      estimatedUnitPrice: price,
      estimatedTotalPrice: qty * price,
    });
    closeSheet();
  };

  const isAdded = (name: string) => {
    const id = categoryIdByName.get(name);
    return id ? !!getItem(id) : false;
  };

  const activeIcon = activeName
    ? createElement(muiIconFor(serviceIconFor(activeName)), { sx: { color: palette.steelBlue, fontSize: 24 } })
    : null;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBack sx={{ color: palette.fogWhite }} />
        </IconButton>
        <Box>
          <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
            Add Services
          </Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>Step 2 of 3</Typography>
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
        <>
          <Typography sx={{ color: palette.hullGray, mb: 2 }}>Tap a service to add it to your order.</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
            {SERVICE_CATEGORIES.map((cat) => {
              const added = isAdded(cat.name);
              return (
                <Card
                  key={cat.name}
                  onClick={() => openSheet(cat.name)}
                  sx={{
                    position: 'relative',
                    py: 3,
                    px: 1,
                    textAlign: 'center',
                    cursor: 'pointer',
                    border: `1px solid ${added ? palette.engineGreen : 'transparent'}`,
                    '&:hover': { bgcolor: palette.surfaceVariant },
                  }}
                >
                  {added && (
                    <CheckCircle sx={{ position: 'absolute', top: 8, right: 8, color: palette.engineGreen, fontSize: 20 }} />
                  )}
                  <ServiceCategoryIcon name={cat.name} size={30} color={palette.steelBlue} />
                  <Typography sx={{ color: palette.fogWhite, fontWeight: 500, fontSize: 14, mt: 1 }}>
                    {cat.name}
                  </Typography>
                </Card>
              );
            })}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Button
              variant="contained"
              disabled={items.length === 0}
              startIcon={<ShoppingCart />}
              onClick={() => navigate('/captain/new-order/cart')}
              sx={{ height: 50, fontSize: 16, width: { xs: '100%', sm: 'auto' }, px: 4 }}
            >
              Cart ({items.length}) — Review
            </Button>
          </Box>
        </>
      )}

      <Dialog
        open={activeName !== null}
        onClose={closeSheet}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep } } }}
      >
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            {activeIcon}
            <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>
              {activeName}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              fullWidth
            />
            <Box>
              <Typography sx={{ color: palette.hullGray, fontSize: 12, mb: 0.5 }}>Unit</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {COMMON_UNITS.map((u) => (
                  <Chip
                    key={u}
                    label={u}
                    onClick={() => setUnit(u)}
                    sx={{
                      bgcolor: unit === u ? palette.steelBlue : palette.oceanMid,
                      color: palette.fogWhite,
                      fontWeight: 500,
                    }}
                  />
                ))}
              </Box>
            </Box>
            <TextField
              label="Specifications"
              value={specifications}
              onChange={(e) => setSpecifications(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Requested Date/Time"
              type="datetime-local"
              value={requestedDatetime}
              onChange={(e) => setRequestedDatetime(e.target.value)}
              fullWidth
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Special Instructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Estimated Unit Price"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              fullWidth
              slotProps={{ input: { startAdornment: <InputAdornment position="start">$</InputAdornment> } }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={closeSheet} sx={{ color: palette.hullGray }}>
                Cancel
              </Button>
              <Button variant="contained" onClick={saveItem}>
                Add to Cart
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
