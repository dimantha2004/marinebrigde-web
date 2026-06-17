import { createElement } from 'react';
import { muiIconFor, serviceIconFor } from '@/constants/serviceCategories';
import { palette } from '@/constants/theme';

export type ServiceCategoryIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export default function ServiceCategoryIcon({
  name,
  size = 24,
  color = palette.fogWhite,
}: ServiceCategoryIconProps) {
  return createElement(muiIconFor(serviceIconFor(name)), { sx: { fontSize: size, color } });
}
