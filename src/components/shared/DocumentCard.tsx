import { Card, Box, Typography, Chip, IconButton } from '@mui/material';
import Description from '@mui/icons-material/Description';
import Download from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import type { OrderDocument } from '@/types/database';
import { palette, radius } from '@/constants/theme';

export type DocumentCardProps = {
  document: OrderDocument;
  onOpen?: (doc: OrderDocument) => void;
};

const DOC_TYPE_COLOR: Record<string, string> = {
  invoice: palette.signalAmber,
  delivery_note: palette.steelBlue,
  certificate: palette.engineGreen,
  approval_doc: palette.oceanMid,
  other: palette.hullGray,
};

const DOC_TYPE_LABEL: Record<string, string> = {
  invoice: 'Invoice',
  delivery_note: 'Delivery Note',
  certificate: 'Certificate',
  approval_doc: 'Approval Doc',
  other: 'Other',
};

export default function DocumentCard({ document, onOpen }: DocumentCardProps) {
  const docType = document.document_type ?? 'other';
  const chipColor = DOC_TYPE_COLOR[docType] ?? palette.hullGray;
  const chipLabel = DOC_TYPE_LABEL[docType] ?? docType;
  const fileName = document.file_name ?? 'Untitled document';
  const created = document.created_at ? dayjs(document.created_at).format('MMM D, YYYY · HH:mm') : '';

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
        <Description sx={{ color: palette.fogWhite, fontSize: 22 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
          {fileName}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
          <Chip
            label={chipLabel}
            size="small"
            sx={{ bgcolor: chipColor, color: palette.fogWhite, height: 22, fontSize: 11, fontWeight: 500 }}
          />
          {created && (
            <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>{created}</Typography>
          )}
        </Box>
      </Box>

      <IconButton onClick={() => onOpen?.(document)} aria-label={`Open ${fileName}`}>
        <Download sx={{ color: palette.steelBlue }} />
      </IconButton>
    </Card>
  );
}
