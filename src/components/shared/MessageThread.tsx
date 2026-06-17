import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, IconButton, TextField, Typography, CircularProgress } from '@mui/material';
import Send from '@mui/icons-material/Send';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import WarningAmber from '@mui/icons-material/WarningAmber';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/types/database';
import { useMessages, useSendMessage, type MessageWithSender } from '@/hooks/useMessages';
import { palette, radius } from '@/constants/theme';

export type MessageThreadProps = {
  orderId: string;
  lineItemId?: string;
  currentUserId: string;
  height?: number | string;
};

export default function MessageThread({ orderId, lineItemId, currentUserId, height = 420 }: MessageThreadProps) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading, error, refetch } = useMessages(orderId, lineItemId);
  const sendMessage = useSendMessage();
  const items = messages ?? [];

  // Mark unread messages as read.
  useEffect(() => {
    if (!items.length) return;
    const unread = items.filter(
      (m: MessageWithSender) => m.sender_id !== currentUserId && !(m.read_by ?? []).includes(currentUserId)
    );
    if (!unread.length) return;
    (async () => {
      await Promise.all(
        unread.map((m: MessageWithSender) =>
          supabase
            .from('messages')
            .update({ read_by: Array.from(new Set([...(m.read_by ?? []), currentUserId])) })
            .eq('id', m.id)
        )
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, currentUserId]);

  // Realtime subscription.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:order:${orderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `order_id=eq.${orderId}` },
        (payload) => {
          const queryKey = ['messages', orderId, lineItemId ?? null];
          const incoming = payload.new as Message | undefined;
          if (payload.eventType === 'INSERT' && incoming) {
            if (lineItemId && incoming.order_line_item_id !== lineItemId) return;
            queryClient.setQueryData<Message[]>(queryKey, (prev) => {
              const existing = prev ?? [];
              if (existing.some((m) => m.id === incoming.id)) return existing;
              return [...existing, incoming];
            });
          } else {
            queryClient.invalidateQueries({ queryKey });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, lineItemId, queryClient]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [items.length]);

  const handleSend = useCallback(() => {
    const content = draft.trim();
    if (!content) return;
    sendMessage.mutate({ orderId, lineItemId, content }, { onSuccess: () => refetch() });
    setDraft('');
  }, [draft, sendMessage, orderId, lineItemId, refetch]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height }}>
      <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {isLoading ? (
          <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: palette.steelBlue }} />
          </Box>
        ) : error ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
            <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn’t load messages.</Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <ChatBubbleOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
            <Typography sx={{ color: palette.hullGray, mt: 1 }}>
              No messages yet. Start the conversation.
            </Typography>
          </Box>
        ) : (
          items.map((item) => {
            const sent = item.sender_id === currentUserId;
            return (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start', mb: 0.75 }}>
                <Box
                  sx={{
                    maxWidth: '78%',
                    px: 2,
                    py: 1,
                    borderRadius: `${radius.lg}px`,
                    bgcolor: sent ? palette.steelBlue : palette.oceanMid,
                    borderBottomRightRadius: sent ? `${radius.sm}px` : undefined,
                    borderBottomLeftRadius: sent ? undefined : `${radius.sm}px`,
                  }}
                >
                  <Typography sx={{ color: palette.fogWhite, fontSize: 15 }}>{item.content}</Typography>
                  <Typography sx={{ color: palette.fogWhite, opacity: 0.6, fontSize: 10, textAlign: 'right' }}>
                    {dayjs(item.created_at).format('HH:mm')}
                  </Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1,
          borderTop: `1px solid ${palette.surfaceVariant}`,
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          size="small"
          placeholder="Type a message…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <IconButton
          onClick={handleSend}
          disabled={!draft.trim() || sendMessage.isPending}
          sx={{ bgcolor: palette.steelBlue, '&:hover': { bgcolor: palette.steelBlue }, color: palette.fogWhite }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}
