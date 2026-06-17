import { Chip } from '@mui/material';
import Business from '@mui/icons-material/Business';
import HelpOutlined from '@mui/icons-material/HelpOutlined';
import { palette } from '@/constants/theme';

export type SupplierAssignedBadgeProps = {
  supplierName?: string | null;
};

export default function SupplierAssignedBadge({ supplierName }: SupplierAssignedBadgeProps) {
  const assigned = !!supplierName;
  const label = assigned ? (supplierName as string) : 'Unassigned';
  const color = assigned ? palette.steelBlue : palette.hullGray;

  return (
    <Chip
      size="small"
      icon={assigned ? <Business sx={{ fontSize: 14, color: `${palette.fogWhite} !important` }} /> : <HelpOutlined sx={{ fontSize: 14, color: `${palette.fogWhite} !important` }} />}
      label={label}
      sx={{ bgcolor: color, color: palette.fogWhite, fontWeight: 500, fontSize: 11 }}
    />
  );
}
