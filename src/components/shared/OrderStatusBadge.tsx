import { Box } from '@mui/material';
import {
  OVERALL_STATUS_META,
  LINE_STATUS_META,
  type OverallStatus,
  type LineStatus,
} from '@/constants/orderStatuses';
import { palette, fonts } from '@/constants/theme';

type StatusMeta = { label: string; color: string; pulsing?: boolean };

export type OrderStatusBadgeProps = {
  status: OverallStatus | LineStatus;
  kind?: 'overall' | 'line';
};

export default function OrderStatusBadge({ status, kind = 'overall' }: OrderStatusBadgeProps) {
  const meta: StatusMeta | undefined =
    kind === 'line'
      ? LINE_STATUS_META[status as LineStatus]
      : OVERALL_STATUS_META[status as OverallStatus];

  const resolved: StatusMeta = meta ?? { label: String(status), color: palette.hullGray };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        bgcolor: resolved.color,
        borderRadius: 999,
        px: 1.25,
        py: 0.5,
      }}
    >
      {resolved.pulsing && (
        <Box
          className="mb-pulse"
          sx={{ width: 7, height: 7, borderRadius: 999, bgcolor: palette.fogWhite }}
        />
      )}
      <Box
        component="span"
        sx={{
          color: palette.fogWhite,
          fontFamily: fonts.body,
          fontWeight: 600,
          fontSize: 12,
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
        }}
      >
        {resolved.label}
      </Box>
    </Box>
  );
}
