import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  CircularProgress,
} from '@mui/material';
import LockOutlined from '@mui/icons-material/LockOutlined';
import CheckCircle from '@mui/icons-material/CheckCircle';
import ErrorOutlined from '@mui/icons-material/ErrorOutlined';

import { useUpdateLineStatus } from '@/hooks/useSupplierOrders';
import { SUPPLIER_NEXT_ACTIONS, LINE_STATUS_META, type LineStatus } from '@/constants/orderStatuses';
import type { OrderLineItem } from '@/types/database';
import { palette, fonts } from '@/constants/theme';

export type StatusUpdateConfirmOpts = {
  declineReason?: string | null;
  requiresDocument?: boolean;
};

export type StatusUpdateSheetProps = {
  open: boolean;
  onClose: () => void;
  lineItem: Pick<OrderLineItem, 'id' | 'line_status'> | null;
  hasDocument?: boolean;
  onConfirm?: (nextStatus: LineStatus, opts: StatusUpdateConfirmOpts) => void;
};

export default function StatusUpdateSheet({
  open,
  onClose,
  lineItem,
  hasDocument = false,
  onConfirm,
}: StatusUpdateSheetProps) {
  const updateStatus = useUpdateLineStatus();

  const actions = useMemo(() => {
    if (!lineItem) return [];
    return SUPPLIER_NEXT_ACTIONS[lineItem.line_status as LineStatus] ?? [];
  }, [lineItem]);

  const [selected, setSelected] = useState<LineStatus | null>(null);
  const [reason, setReason] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    // Reset the transient form whenever the sheet opens for a new line item.
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelected(actions.length === 1 ? actions[0].next : null);
      setReason('');
      setErrorText(null);
    }
  }, [open, actions]);

  const selectedAction = actions.find((a) => a.next === selected) ?? null;
  const isDecline = selected === 'supplier_declined';
  const needsDocument = !!selectedAction?.requiresDocument;

  const handleConfirm = () => {
    if (!lineItem || !selected) {
      setErrorText('Choose an action to continue.');
      return;
    }
    if (isDecline && reason.trim().length < 3) {
      setErrorText('Please provide a decline reason.');
      return;
    }
    if (needsDocument && !hasDocument) {
      setErrorText('Upload a delivery document before marking as delivered.');
      return;
    }

    const opts: StatusUpdateConfirmOpts = {
      declineReason: isDecline ? reason.trim() : null,
      requiresDocument: needsDocument,
    };

    updateStatus.mutate(
      { lineItemId: lineItem.id, lineStatus: selected, declineReason: opts.declineReason },
      {
        onSuccess: () => {
          onConfirm?.(selected, opts);
          onClose();
        },
        onError: (err) => setErrorText(err.message),
      }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: palette.navyDeep } } }}
    >
      <DialogContent>
        <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 20 }}>
          Update Status
        </Typography>
        {lineItem && (
          <Typography sx={{ color: palette.hullGray, fontSize: 13, mt: 0.25 }}>
            Currently {LINE_STATUS_META[lineItem.line_status as LineStatus]?.label ?? lineItem.line_status}
          </Typography>
        )}

        <Divider sx={{ borderColor: palette.oceanMid, my: 2 }} />

        {actions.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <LockOutlined sx={{ color: palette.hullGray, fontSize: 24 }} />
            <Typography sx={{ color: palette.hullGray, mt: 1 }}>No further actions available.</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {actions.map((action) => {
              const isSel = selected === action.next;
              const declineStyle = action.next === 'supplier_declined';
              const accent = declineStyle ? palette.alertRed : palette.steelBlue;
              return (
                <Button
                  key={action.next}
                  variant={isSel ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelected(action.next);
                    setErrorText(null);
                  }}
                  sx={{
                    color: isSel ? palette.fogWhite : accent,
                    borderColor: accent,
                    bgcolor: isSel ? accent : 'transparent',
                    '&:hover': { bgcolor: isSel ? accent : 'transparent', borderColor: accent },
                  }}
                >
                  {action.label}
                </Button>
              );
            })}
          </Box>
        )}

        {isDecline && (
          <TextField
            label="Decline reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setErrorText(null);
            }}
            multiline
            minRows={3}
            fullWidth
            sx={{ mt: 2 }}
          />
        )}

        {needsDocument && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mt: 2,
              p: 1,
              borderRadius: 1,
              bgcolor: hasDocument ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            }}
          >
            {hasDocument ? (
              <CheckCircle sx={{ color: palette.engineGreen, fontSize: 18 }} />
            ) : (
              <ErrorOutlined sx={{ color: palette.signalAmber, fontSize: 18 }} />
            )}
            <Typography sx={{ color: palette.fogWhite, fontSize: 13 }}>
              {hasDocument ? 'Delivery document attached.' : 'A delivery document must be uploaded first.'}
            </Typography>
          </Box>
        )}

        {errorText && (
          <Typography sx={{ color: palette.alertRed, fontSize: 13, mt: 2, fontWeight: 500 }}>
            {errorText}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 3 }}>
          <Button onClick={onClose} disabled={updateStatus.isPending} sx={{ color: palette.hullGray }}>
            Cancel
          </Button>
          {actions.length > 0 && (
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={updateStatus.isPending || !selected}
              sx={{ minWidth: 110, bgcolor: isDecline ? palette.alertRed : palette.steelBlue }}
            >
              {updateStatus.isPending ? <CircularProgress size={16} sx={{ color: palette.fogWhite }} /> : 'Confirm'}
            </Button>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
