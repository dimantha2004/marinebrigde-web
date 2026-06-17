import { useState } from 'react';
import { Fab } from '@mui/material';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import ChatContactsModal from './ChatContactsModal';
import { palette } from '@/constants/theme';

export default function GlobalChatButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: palette.steelBlue,
          color: palette.fogWhite,
          '&:hover': { bgcolor: palette.steelBlue },
          zIndex: 1200,
        }}
      >
        <ChatBubbleOutlined />
      </Fab>
      <ChatContactsModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
