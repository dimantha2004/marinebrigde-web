import { Box, Typography } from '@mui/material';
import Check from '@mui/icons-material/Check';
import Cancel from '@mui/icons-material/Cancel';
import Block from '@mui/icons-material/Block';
import { ORDER_STEPPER, type OverallStatus } from '@/constants/orderStatuses';
import { palette, fonts } from '@/constants/theme';

export type TimelineTrackerProps = { current: OverallStatus };

/** Folds each OverallStatus onto the canonical ORDER_STEPPER index. */
const STATUS_TO_STEP_KEY: Record<OverallStatus, OverallStatus | null> = {
  draft: 'draft',
  pending_charter_approval: 'pending_charter_approval',
  charter_rejected: null,
  pending_payment: 'pending_payment',
  pending_port_approval: 'active',
  active: 'active',
  in_execution: 'in_execution',
  completed: 'completed',
  cancelled: null,
};

function TerminalState({
  label,
  color,
  icon,
}: {
  label: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          bgcolor: color,
          borderRadius: 999,
          px: 3,
          py: 1.5,
        }}
      >
        {icon}
        <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export default function TimelineTracker({ current }: TimelineTrackerProps) {
  if (current === 'charter_rejected') {
    return (
      <TerminalState
        label="Charter Rejected"
        color={palette.alertRed}
        icon={<Cancel sx={{ color: palette.fogWhite, fontSize: 18 }} />}
      />
    );
  }
  if (current === 'cancelled') {
    return (
      <TerminalState
        label="Order Cancelled"
        color={palette.alertRed}
        icon={<Block sx={{ color: palette.fogWhite, fontSize: 18 }} />}
      />
    );
  }

  const activeKey = STATUS_TO_STEP_KEY[current] ?? 'draft';
  const currentIndex = ORDER_STEPPER.findIndex((s) => s.key === activeKey);

  return (
    <Box sx={{ display: 'flex', overflowX: 'auto', py: 2, px: 1 }}>
      {ORDER_STEPPER.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const nodeColor = isCompleted
          ? palette.engineGreen
          : isCurrent
            ? palette.steelBlue
            : palette.hullGray;

        return (
          <Box key={step.key} sx={{ width: 100, flexShrink: 0, textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Box
                sx={{
                  flex: 1,
                  height: 3,
                  borderRadius: 1,
                  bgcolor: index > 0 && index <= currentIndex ? palette.engineGreen : index > 0 ? palette.hullGray : 'transparent',
                }}
              />
              <Box
                className={isCurrent ? 'mb-pulse' : undefined}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: nodeColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {isCompleted ? (
                  <Check sx={{ color: palette.fogWhite, fontSize: 16 }} />
                ) : (
                  <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 13 }}>
                    {index + 1}
                  </Typography>
                )}
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: 3,
                  borderRadius: 1,
                  bgcolor:
                    index < ORDER_STEPPER.length - 1
                      ? index < currentIndex
                        ? palette.engineGreen
                        : palette.hullGray
                      : 'transparent',
                }}
              />
            </Box>
            <Typography
              sx={{
                mt: 0.75,
                fontSize: 11,
                fontFamily: fonts.body,
                fontWeight: isCurrent || isCompleted ? 600 : 500,
                color: isCurrent ? palette.steelBlue : isCompleted ? palette.engineGreen : palette.hullGray,
              }}
            >
              {step.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
