import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  TextField,
  Divider,
  CircularProgress,
  IconButton,
} from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import AddCircleOutlined from '@mui/icons-material/AddCircleOutlined';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';

import { supabase } from '@/lib/supabase';
import { useSubmitQuotations, type QuotationPayload, type SupplierLineItem } from '@/hooks/useSupplierOrders';
import { palette, fonts } from '@/constants/theme';

export type QuotationSubmitSheetProps = {
  open: boolean;
  onClose: () => void;
  lineItem: SupplierLineItem | null;
  onConfirm?: () => void;
};

export default function QuotationSubmitSheet({
  open,
  onClose,
  lineItem,
  onConfirm,
}: QuotationSubmitSheetProps) {
  const submitQuotes = useSubmitQuotations();
  const [quotes, setQuotes] = useState<QuotationPayload[]>([
    { amount: 0, description: '' },
    { amount: 0, description: '' },
  ]);
  const [quoteFiles, setQuoteFiles] = useState<(File | null)[]>([null, null]);
  const [uploading, setUploading] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuotes([
        { amount: 0, description: '' },
        { amount: 0, description: '' },
      ]);
      setQuoteFiles([null, null]);
      setUploading(false);
      setErrorText(null);
    }
  }, [open]);

  const handleAddQuote = () => {
    if (quotes.length >= 3) return;
    setQuotes([...quotes, { amount: 0, description: '' }]);
    setQuoteFiles([...quoteFiles, null]);
  };

  const handleRemoveQuote = (index: number) => {
    if (quotes.length <= 1) return;
    setQuotes(quotes.filter((_, i) => i !== index));
    setQuoteFiles(quoteFiles.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: keyof QuotationPayload, value: string) => {
    const newQuotes = [...quotes];
    if (field === 'amount') {
      newQuotes[index].amount = parseFloat(value) || 0;
    } else {
      newQuotes[index].description = value;
    }
    setQuotes(newQuotes);
    setErrorText(null);
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newFiles = [...quoteFiles];
    newFiles[index] = file;
    setQuoteFiles(newFiles);
    setErrorText(null);
  };

  const handleConfirm = async () => {
    if (!lineItem || !lineItem.order?.id) {
      setErrorText('Order context missing.');
      return;
    }

    const orderId = lineItem.order.id;

    // Validate
    const validIndexes: number[] = [];
    quotes.forEach((q, idx) => {
      if (q.amount > 0) {
        validIndexes.push(idx);
      }
    });

    if (validIndexes.length === 0) {
      setErrorText('Please provide at least one valid quotation with an amount greater than 0.');
      return;
    }

    setUploading(true);
    setErrorText(null);

    try {
      const finalQuotes: QuotationPayload[] = [];

      for (const idx of validIndexes) {
        const quote = quotes[idx];
        const file = quoteFiles[idx];
        let fileUrl: string | undefined = undefined;

        if (file) {
          const path = `orders/${orderId}/${lineItem.id}/quotation_${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('order-documents')
            .upload(path, file, { upsert: true });

          if (uploadError) {
            throw new Error(`Failed to upload file for Option ${idx + 1}: ${uploadError.message}`);
          }
          fileUrl = path;
        }

        finalQuotes.push({
          amount: quote.amount,
          description: quote.description || undefined,
          fileUrl,
        });
      }

      submitQuotes.mutate(
        { lineItemId: lineItem.id, quotes: finalQuotes },
        {
          onSuccess: () => {
            onConfirm?.();
            onClose();
          },
          onError: (err) => {
            setErrorText(err.message);
            setUploading(false);
          },
        }
      );
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
      setUploading(false);
    }
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
          Submit Quotations
        </Typography>
        <Typography sx={{ color: palette.hullGray, fontSize: 13, mt: 0.5 }}>
          Provide up to 3 pricing options for the charter party to select from.
        </Typography>

        <Divider sx={{ borderColor: palette.oceanMid, my: 2 }} />

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {quotes.map((quote, index) => (
            <Box
              key={index}
              sx={{
                p: 2,
                borderRadius: 1,
                border: `1px solid ${palette.oceanMid}`,
                position: 'relative',
              }}
            >
              <Typography sx={{ color: palette.fogWhite, fontSize: 14, fontWeight: 500, mb: 1 }}>
                Option {index + 1}
              </Typography>
              {quotes.length > 1 && (
                <IconButton
                  size="small"
                  onClick={() => handleRemoveQuote(index)}
                  sx={{ position: 'absolute', top: 8, right: 8, color: palette.hullGray }}
                >
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              )}
              <TextField
                label="Amount ($)"
                type="number"
                value={quote.amount || ''}
                onChange={(e) => handleChange(index, 'amount', e.target.value)}
                fullWidth
                size="small"
                sx={{ mb: 1.5 }}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
              <TextField
                label="Description (e.g. OEM, Aftermarket)"
                value={quote.description}
                onChange={(e) => handleChange(index, 'description', e.target.value)}
                fullWidth
                size="small"
                disabled={uploading || submitQuotes.isPending}
              />
              <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<CloudUploadOutlined />}
                  sx={{ color: palette.steelBlue, borderColor: palette.steelBlue }}
                  disabled={uploading || submitQuotes.isPending}
                >
                  Upload File
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.xls"
                    onChange={(e) => handleFileChange(index, e.target.files?.[0] ?? null)}
                  />
                </Button>
                <Typography sx={{ color: palette.fogWhite, fontSize: 12, flex: 1, minWidth: 0 }} noWrap>
                  {quoteFiles[index]?.name ?? 'No file selected'}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>

        {quotes.length < 3 && (
          <Button
            startIcon={<AddCircleOutlined />}
            onClick={handleAddQuote}
            sx={{ mt: 2, color: palette.steelBlue }}
            disabled={uploading || submitQuotes.isPending}
          >
            Add Another Option
          </Button>
        )}

        {errorText && (
          <Typography sx={{ color: palette.alertRed, fontSize: 13, mt: 2, fontWeight: 500 }}>
            {errorText}
          </Typography>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 3 }}>
          <Button onClick={onClose} disabled={uploading || submitQuotes.isPending} sx={{ color: palette.hullGray }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={uploading || submitQuotes.isPending}
            sx={{ minWidth: 110, bgcolor: palette.steelBlue }}
          >
            {uploading || submitQuotes.isPending ? (
              <CircularProgress size={16} sx={{ color: palette.fogWhite }} />
            ) : (
              'Submit'
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
