import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  TextField,
  InputAdornment,
  Avatar,
  CircularProgress,
} from '@mui/material';
import Close from '@mui/icons-material/Close';
import ArrowBack from '@mui/icons-material/ArrowBack';
import Search from '@mui/icons-material/Search';
import Send from '@mui/icons-material/Send';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { sendDirectMessage, getAllowedReceiverRoles } from '@/lib/chat';
import type { UserRole } from '@/types/database';
import { palette, radius, fonts } from '@/constants/theme';

interface ChatContact {
  id: string;
  full_name: string;
  username: string | null;
  role: UserRole;
}

interface DirectMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  captain: 'Captain',
  charter_party: 'Charter Party',
  ship_agent: 'Ship Agent',
  port_authority: 'Port Authority',
  supplier: 'Supplier',
  admin: 'Admin',
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function ChatContactsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const currentProfile = useAuthStore((s) => s.profile);

  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [draft, setDraft] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const allowedRoles = useMemo(() => {
    if (!currentProfile?.role) return [];
    return getAllowedReceiverRoles(currentProfile.role as UserRole);
  }, [currentProfile?.role]);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ['chat-contacts', currentUserId, allowedRoles],
    enabled: !!currentUserId && allowedRoles.length > 0 && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, username, role')
        .in('role', allowedRoles)
        .neq('id', currentUserId!)
        .eq('verified', true)
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as ChatContact[];
    },
  });

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts ?? [];
    return (contacts ?? []).filter(
      (c) => c.full_name.toLowerCase().includes(q) || (c.username ?? '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const { data: chatMessages, refetch: refetchChat } = useQuery({
    queryKey: ['direct-chat', currentUserId, selectedContact?.id],
    enabled: !!selectedContact && !!currentUserId,
    queryFn: async () => {
      if (!selectedContact || !currentUserId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .is('order_id', null)
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${selectedContact.id}),and(sender_id.eq.${selectedContact.id},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as DirectMessage[];
    },
  });

  // Realtime: refetch the open thread on any direct-message change.
  useEffect(() => {
    if (!selectedContact || !currentUserId) return;
    const channel = supabase
      .channel(`direct:${currentUserId}:${selectedContact.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        void refetchChat();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedContact, currentUserId, refetchChat]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages?.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !currentUserId || !selectedContact || chatSending) return;
    setChatSending(true);
    setSendError('');
    try {
      const { error } = await sendDirectMessage(currentUserId, selectedContact.id, text);
      if (error) {
        setSendError(error.message);
        return;
      }
      setDraft('');
      void refetchChat();
    } catch (e) {
      setSendError(e instanceof Error ? e.message : 'Failed to send message');
    } finally {
      setChatSending(false);
    }
  }, [draft, currentUserId, selectedContact, chatSending, refetchChat]);

  const handleBack = useCallback(() => {
    setSelectedContact(null);
    setDraft('');
    setSendError('');
  }, []);

  const handleClose = () => {
    onClose();
    handleBack();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, height: '85vh', borderRadius: `${radius.lg}px` } } }}
    >
      {selectedContact ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${palette.oceanMid}`,
              px: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <IconButton onClick={handleBack}>
                <ArrowBack sx={{ color: palette.fogWhite }} />
              </IconButton>
              <Box>
                <Typography sx={{ color: palette.fogWhite, fontWeight: 600 }}>
                  {selectedContact.full_name}
                </Typography>
                <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                  {ROLE_LABEL[selectedContact.role]}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleClose}>
              <Close sx={{ color: palette.fogWhite }} />
            </IconButton>
          </Box>

          <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
            {(chatMessages ?? []).length === 0 ? (
              <Box sx={{ textAlign: 'center', pt: 4 }}>
                <ChatBubbleOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
                <Typography sx={{ color: palette.hullGray, mt: 1 }}>Start a conversation.</Typography>
              </Box>
            ) : (
              (chatMessages ?? []).map((m) => {
                const sent = m.sender_id === currentUserId;
                return (
                  <Box key={m.id} sx={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start', mb: 0.75 }}>
                    <Box
                      sx={{
                        maxWidth: '78%',
                        px: 2,
                        py: 1,
                        borderRadius: `${radius.lg}px`,
                        bgcolor: sent ? palette.steelBlue : palette.oceanMid,
                      }}
                    >
                      <Typography sx={{ color: palette.fogWhite, fontSize: 15 }}>{m.content}</Typography>
                    </Box>
                  </Box>
                );
              })
            )}
          </Box>

          <Box sx={{ borderTop: `1px solid ${palette.surfaceVariant}`, p: 1 }}>
            {sendError && (
              <Typography sx={{ color: palette.alertRed, fontSize: 12, px: 0.5, pb: 0.5 }}>
                {sendError}
              </Typography>
            )}
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder="Type a message..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
              />
              <IconButton
                onClick={handleSend}
                disabled={chatSending || !draft.trim()}
                sx={{ bgcolor: palette.steelBlue, '&:hover': { bgcolor: palette.steelBlue }, color: palette.fogWhite }}
              >
                <Send fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${palette.oceanMid}`,
              px: 2,
              py: 1,
            }}
          >
            <Typography sx={{ fontFamily: fonts.display, fontSize: 18, color: palette.fogWhite }}>
              New Chat
            </Typography>
            <IconButton onClick={handleClose}>
              <Close sx={{ color: palette.fogWhite }} />
            </IconButton>
          </Box>

          <Box sx={{ p: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: palette.hullGray }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5 }}>
            {isLoading ? (
              <Box sx={{ textAlign: 'center', pt: 4 }}>
                <CircularProgress sx={{ color: palette.steelBlue }} />
              </Box>
            ) : filteredContacts.length === 0 ? (
              <Box sx={{ textAlign: 'center', pt: 4 }}>
                <PeopleOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
                <Typography sx={{ color: palette.hullGray, mt: 1 }}>No contacts available.</Typography>
              </Box>
            ) : (
              filteredContacts.map((item) => (
                <Box
                  key={item.id}
                  onClick={() => setSelectedContact(item)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 1.5,
                    mb: 0.5,
                    borderRadius: `${radius.md}px`,
                    bgcolor: palette.oceanMid,
                    cursor: 'pointer',
                    '&:hover': { bgcolor: palette.surfaceVariant },
                  }}
                >
                  <Avatar sx={{ bgcolor: palette.steelBlue, color: palette.fogWhite, width: 40, height: 40 }}>
                    {initials(item.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                      {item.full_name}
                    </Typography>
                    <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
                      {ROLE_LABEL[item.role]}
                    </Typography>
                  </Box>
                  <ChatBubbleOutlined sx={{ color: palette.steelBlue, fontSize: 18 }} />
                </Box>
              ))
            )}
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
