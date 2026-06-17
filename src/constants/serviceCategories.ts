import type { SvgIconComponent } from '@mui/icons-material';
import LocalFireDepartment from '@mui/icons-material/LocalFireDepartment';
import Whatshot from '@mui/icons-material/Whatshot';
import Restaurant from '@mui/icons-material/Restaurant';
import MedicalServices from '@mui/icons-material/MedicalServices';
import Groups from '@mui/icons-material/Groups';
import WaterDrop from '@mui/icons-material/WaterDrop';
import Delete from '@mui/icons-material/Delete';
import Construction from '@mui/icons-material/Construction';
import Inventory2 from '@mui/icons-material/Inventory2';

/**
 * The 8 maritime service categories. `name` and `iconName` mirror the
 * service_categories seed data; the canonical source of truth is the DB row
 * (matched by `name`). Ported from the mobile app (Ionicons → MUI icons).
 */
export type ServiceCategoryDef = {
  name: string;
  iconName: string;
  requiresPortAuthorityApproval: boolean;
  defaultUnit: string;
};

export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  { name: 'Bunkering', iconName: 'flame', requiresPortAuthorityApproval: true, defaultUnit: 'MT' },
  { name: 'De-bunkering', iconName: 'flame-outline', requiresPortAuthorityApproval: true, defaultUnit: 'MT' },
  { name: 'Food & Provisions', iconName: 'restaurant', requiresPortAuthorityApproval: false, defaultUnit: 'kg' },
  { name: 'Medical Services', iconName: 'medical', requiresPortAuthorityApproval: false, defaultUnit: 'units' },
  { name: 'Crew Exchange', iconName: 'people', requiresPortAuthorityApproval: false, defaultUnit: 'persons' },
  { name: 'Fresh Water Supply', iconName: 'water', requiresPortAuthorityApproval: true, defaultUnit: 'MT' },
  { name: 'Waste Disposal', iconName: 'trash', requiresPortAuthorityApproval: true, defaultUnit: 'm³' },
  { name: 'Sludge Removal', iconName: 'construct', requiresPortAuthorityApproval: true, defaultUnit: 'm³' },
];

export const COMMON_UNITS = ['MT', 'litres', 'm³', 'kg', 'persons', 'units', 'pallets'] as const;

/** Maps an Ionicons name (stored as service_categories.icon_name) to an MUI icon. */
const ICON_MAP: Record<string, SvgIconComponent> = {
  flame: LocalFireDepartment,
  'flame-outline': Whatshot,
  restaurant: Restaurant,
  medical: MedicalServices,
  people: Groups,
  water: WaterDrop,
  trash: Delete,
  construct: Construction,
  cube: Inventory2,
};

export function serviceIconFor(name: string): string {
  return SERVICE_CATEGORIES.find((c) => c.name === name)?.iconName ?? 'cube';
}

/** Returns the MUI icon component for a given Ionicons icon name. */
export function muiIconFor(iconName: string | null | undefined): SvgIconComponent {
  return (iconName && ICON_MAP[iconName]) || Inventory2;
}
