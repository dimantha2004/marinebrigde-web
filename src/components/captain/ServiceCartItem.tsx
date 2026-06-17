import { createElement } from 'react';
import { Card, Box, Typography, IconButton } from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import type { CartItem } from '@/stores/cartStore';
import { muiIconFor, serviceIconFor } from '@/constants/serviceCategories';
import { palette, radius } from '@/constants/theme';

export type ServiceCartItemProps = {
  item: CartItem;
  onEdit?: (item: CartItem) => void;
  onRemove?: (item: CartItem) => void;
};

export default function ServiceCartItem({ item, onEdit, onRemove }: ServiceCartItemProps) {
  const icon = createElement(muiIconFor(item.iconName || serviceIconFor(item.serviceName)), {
    sx: { color: palette.steelBlue, fontSize: 22 },
  });

  return (
    <Card sx={{ mb: 1, display: 'flex', alignItems: 'center', p: 1.5, gap: 2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: `${radius.sm}px`,
          bgcolor: palette.navyDeep,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
          {item.serviceName}
        </Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>
          {item.quantity} {item.unit} · ${item.estimatedUnitPrice.toFixed(2)}/unit
        </Typography>
        {item.specifications && (
          <Typography noWrap sx={{ color: palette.hullGray, fontSize: 12 }}>
            {item.specifications}
          </Typography>
        )}
      </Box>

      <Box sx={{ textAlign: 'right' }}>
        <Typography sx={{ fontFamily: 'monospace', color: palette.fogWhite, fontSize: 15 }}>
          ${item.estimatedTotalPrice.toFixed(2)}
        </Typography>
        <Box>
          <IconButton size="small" onClick={() => onEdit?.(item)} aria-label="Edit item">
            <EditOutlined sx={{ fontSize: 18, color: palette.steelBlue }} />
          </IconButton>
          <IconButton size="small" onClick={() => onRemove?.(item)} aria-label="Remove item">
            <DeleteOutlined sx={{ fontSize: 18, color: palette.alertRed }} />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
}
