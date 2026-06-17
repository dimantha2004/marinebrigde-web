import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  IconButton,
  Divider,
} from '@mui/material';
import WarningAmber from '@mui/icons-material/WarningAmber';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import Search from '@mui/icons-material/Search';
import CheckCircle from '@mui/icons-material/CheckCircle';
import AccessTime from '@mui/icons-material/AccessTime';
import Check from '@mui/icons-material/Check';
import Close from '@mui/icons-material/Close';
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import LockReset from '@mui/icons-material/LockReset';
import Send from '@mui/icons-material/Send';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';
import { sendDirectMessage } from '@/lib/chat';
import { useAuthStore } from '@/stores/authStore';
import type { Profile, UserRole } from '@/types/database';
import { palette, fonts, radius } from '@/constants/theme';

const ROLE_LABEL: Record<string, string> = {
  captain: 'Captain',
  charter_party: 'Charter Party',
  ship_agent: 'Ship Agent',
  port_authority: 'Port Authority',
  supplier: 'Supplier',
  admin: 'Admin',
};

const ROLE_COLOR: Record<UserRole, string> = {
  captain: palette.steelBlue,
  charter_party: palette.signalAmber,
  ship_agent: palette.engineGreen,
  port_authority: '#8B5CF6',
  supplier: '#06B6D4',
  admin: palette.alertRed,
};

function detailFields(p: Profile): { label: string; value: string | null }[] {
  const base: { label: string; value: string | null }[] = [
    { label: 'Username', value: p.username },
    { label: 'Email', value: p.email },
    { label: 'Full Name', value: p.full_name },
    { label: 'Role', value: ROLE_LABEL[p.role] },
    { label: 'Company', value: p.company_name },
    { label: 'Phone', value: p.phone },
    { label: 'Verified', value: p.verified ? 'Yes' : 'No' },
  ];
  const extra: { label: string; value: string | null }[] = [];
  switch (p.role) {
    case 'captain':
      extra.push({ label: 'Passport No', value: p.passport_no }, { label: 'SID No', value: p.sid_no });
      break;
    case 'charter_party':
      extra.push({ label: 'CP No', value: p.cp_no }, { label: 'IMO No', value: p.imo_no }, { label: 'Contract Date', value: p.contract_date });
      break;
    case 'ship_agent':
      extra.push({ label: 'Company Reg No', value: p.company_reg_no }, { label: 'IMO Agent Code', value: p.imo_agent_code }, { label: 'TIN No', value: p.tin_no });
      break;
    case 'port_authority':
      extra.push({ label: 'UN/LOCODE', value: p.unlocode }, { label: 'Port ID', value: p.port_id_text }, { label: 'ISPS Code', value: p.isps_code });
      break;
    case 'supplier':
      extra.push({ label: 'Business No', value: p.business_no }, { label: 'TIN No', value: p.tin_no }, { label: 'DUNS No', value: p.duns_no });
      break;
  }
  return [...base, ...extra];
}

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [snack, setSnack] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'verified'>('pending');

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [chatTarget, setChatTarget] = useState<Profile | null>(null);

  const { data: profilesData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('verified', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const profiles = profilesData ?? [];

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: updErr } = await supabase.from('profiles').update({ verified: true }).eq('id', id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      setSnack('Account verified.');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    },
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to verify account.'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (profile: Profile) => {
      const { error: profileErr } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      setSnack('User deleted.');
      setDeleteTarget(null);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    },
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to delete user.'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (profile: Profile) => {
      const { error: profileErr } = await supabase.from('profiles').delete().eq('id', profile.id);
      if (profileErr) throw profileErr;
    },
    onSuccess: () => {
      setSnack('Account rejected and removed.');
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ['admin', 'profiles'] });
    },
    onError: (e: unknown) => setSnack(e instanceof Error ? e.message : 'Failed to reject account.'),
  });

  const handlePasswordReset = async () => {
    if (!resetTarget) return;
    setResetSubmitting(true);
    setResetResult(null);
    try {
      const { data, error: funcError } = await supabase.rpc('admin_initiate_password_reset', {
        target_user_id: resetTarget.id,
      });
      if (funcError) throw funcError;
      setResetResult(`Reset token generated. Share this with the user so they can set a new password.\n\nToken: ${data}`);
    } catch (e) {
      setResetResult(e instanceof Error ? e.message : 'Failed to initiate reset.');
    }
    setResetSubmitting(false);
  };

  const verifiedList = useMemo(() => profiles.filter((p) => p.verified), [profiles]);
  const pendingList = useMemo(() => profiles.filter((p) => !p.verified && p.role !== 'admin'), [profiles]);

  const filterFn = (list: Profile[]) => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        (p.username ?? '').toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        ROLE_LABEL[p.role].toLowerCase().includes(q)
    );
  };

  const currentList = tab === 'pending' ? filterFn(pendingList) : filterFn(verifiedList);

  return (
    <Box>
      <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 22, mb: 2 }}>
        User Management
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="pending" label={`Pending (${pendingList.length})`} />
        <Tab value="verified" label={`Verified (${verifiedList.length})`} />
      </Tabs>

      <TextField
        fullWidth
        size="small"
        placeholder={`Search ${tab} users...`}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ mb: 2 }}
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

      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress sx={{ color: palette.steelBlue }} />
        </Box>
      ) : error ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <WarningAmber sx={{ color: palette.alertRed, fontSize: 28 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>Couldn't load users.</Typography>
          <Button onClick={() => refetch()} sx={{ mt: 1, color: palette.steelBlue }}>Retry</Button>
        </Box>
      ) : currentList.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <PeopleOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
          <Typography sx={{ color: palette.hullGray, mt: 1 }}>
            {tab === 'pending' ? 'No pending users.' : 'No verified users.'}
          </Typography>
        </Box>
      ) : (
        currentList.map((item) => (
          <Card
            key={item.id}
            onClick={() => setSelectedUser(item)}
            sx={{ p: 2, mb: 1, cursor: 'pointer', '&:hover': { bgcolor: palette.surfaceVariant } }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography noWrap sx={{ color: palette.fogWhite, fontWeight: 600, fontSize: 15 }}>
                  {item.full_name}
                </Typography>
                {item.username && (
                  <Typography noWrap sx={{ color: palette.hullGray, fontSize: 12 }}>
                    @{item.username}
                  </Typography>
                )}
                {item.company_name && (
                  <Typography noWrap sx={{ color: palette.hullGray, fontSize: 12 }}>
                    {item.company_name}
                  </Typography>
                )}
              </Box>
              <Chip
                label={ROLE_LABEL[item.role]}
                size="small"
                sx={{ bgcolor: `${ROLE_COLOR[item.role]}33`, color: ROLE_COLOR[item.role], fontWeight: 500 }}
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}>
              {item.verified ? (
                <>
                  <CheckCircle sx={{ fontSize: 16, color: palette.engineGreen }} />
                  <Typography sx={{ color: palette.engineGreen, fontSize: 13 }}>Verified</Typography>
                </>
              ) : (
                <>
                  <AccessTime sx={{ fontSize: 16, color: palette.signalAmber }} />
                  <Typography sx={{ color: palette.signalAmber, fontSize: 13 }}>Awaiting verification</Typography>
                </>
              )}
            </Box>
          </Card>
        ))
      )}

      {/* User detail dialog */}
      <Dialog
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.navyDeep } } }}
      >
        {selectedUser && (
          <DialogContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography sx={{ fontFamily: fonts.display, color: palette.fogWhite, fontSize: 18 }}>User Details</Typography>
              <IconButton onClick={() => setSelectedUser(null)}>
                <Close sx={{ color: palette.fogWhite }} />
              </IconButton>
            </Box>

            <Card sx={{ p: 2, mb: 2 }}>
              {detailFields(selectedUser).map((f) => (
                <Box key={f.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, gap: 2 }}>
                  <Typography sx={{ color: palette.hullGray, fontSize: 13 }}>{f.label}</Typography>
                  <Typography sx={{ color: palette.fogWhite, fontSize: 13, textAlign: 'right', wordBreak: 'break-word' }}>
                    {f.value || '-'}
                  </Typography>
                </Box>
              ))}
            </Card>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {!selectedUser.verified ? (
                <>
                  <Button
                    variant="contained"
                    startIcon={<Check />}
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(selectedUser.id)}
                    sx={{ bgcolor: palette.engineGreen, '&:hover': { bgcolor: palette.engineGreen } }}
                  >
                    Verify
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Close />}
                    disabled={rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(selectedUser)}
                    sx={{ bgcolor: palette.alertRed, '&:hover': { bgcolor: palette.alertRed } }}
                  >
                    Reject
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    startIcon={<ChatBubbleOutlined />}
                    onClick={() => {
                      setChatTarget(selectedUser);
                      setSelectedUser(null);
                    }}
                  >
                    Chat
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<DeleteOutlined />}
                    onClick={() => {
                      setDeleteTarget(selectedUser);
                      setSelectedUser(null);
                    }}
                    sx={{ color: palette.alertRed, borderColor: palette.alertRed }}
                  >
                    Delete User
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LockReset />}
                    onClick={() => {
                      setResetTarget(selectedUser);
                      setResetResult(null);
                      setSelectedUser(null);
                    }}
                    sx={{ color: palette.fogWhite, borderColor: palette.hullGray }}
                  >
                    Reset Password
                  </Button>
                </>
              )}
            </Box>
          </DialogContent>
        )}
      </Dialog>

      {/* Chat dialog */}
      {chatTarget && <ChatDialog target={chatTarget} onClose={() => setChatTarget(null)} />}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} slotProps={{ paper: { sx: { bgcolor: palette.oceanMid } } }}>
        <DialogTitle sx={{ color: palette.fogWhite }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: palette.hullGray }}>
            Are you sure you want to permanently delete{' '}
            <Box component="span" sx={{ color: palette.fogWhite, fontWeight: 600 }}>
              {deleteTarget?.full_name}
            </Box>
            ? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: palette.hullGray }}>
            Cancel
          </Button>
          <Button
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            sx={{ color: palette.alertRed }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password reset */}
      <Dialog
        open={!!resetTarget}
        onClose={() => {
          setResetTarget(null);
          setResetResult(null);
        }}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: palette.oceanMid } } }}
      >
        <DialogTitle sx={{ color: palette.fogWhite }}>Password Reset</DialogTitle>
        <DialogContent>
          {!resetResult ? (
            <>
              <DialogContentText sx={{ color: palette.hullGray, mb: 2 }}>
                Generate a password reset token for{' '}
                <Box component="span" sx={{ color: palette.fogWhite, fontWeight: 600 }}>
                  {resetTarget?.full_name}
                </Box>
                ? The user can use this token to set a new password.
              </DialogContentText>
              <Button variant="contained" fullWidth onClick={handlePasswordReset} disabled={resetSubmitting}>
                {resetSubmitting ? <CircularProgress size={20} sx={{ color: palette.fogWhite }} /> : 'Generate Reset Token'}
              </Button>
            </>
          ) : (
            <>
              <Typography sx={{ color: palette.fogWhite, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {resetResult}
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  setResetTarget(null);
                  setResetResult(null);
                }}
                sx={{ mt: 2, color: palette.fogWhite, borderColor: palette.hullGray }}
              >
                Done
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={3000} onClose={() => setSnack(null)}>
        <Alert onClose={() => setSnack(null)} variant="filled" severity="info">
          {snack}
        </Alert>
      </Snackbar>
    </Box>
  );
}

function ChatDialog({ target, onClose }: { target: Profile; onClose: () => void }) {
  const currentUserId = useAuthStore((s) => s.session?.user?.id);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const { data: chatMessages, refetch } = useQuery({
    queryKey: ['admin', 'chat', target.id],
    enabled: !!currentUserId,
    queryFn: async () => {
      if (!currentUserId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${currentUserId})`
        )
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as { id: string; sender_id: string; content: string; created_at: string }[];
    },
  });

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [chatMessages?.length]);

  const send = async () => {
    if (!draft.trim() || !currentUserId || sending) return;
    setSending(true);
    await sendDirectMessage(currentUserId, target.id, draft.trim());
    setDraft('');
    setSending(false);
    void refetch();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: palette.navyDeep, height: '80vh', borderRadius: `${radius.lg}px` } } }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
        <Box>
          <Typography sx={{ color: palette.fogWhite, fontWeight: 600 }}>{target.full_name}</Typography>
          <Typography sx={{ color: palette.hullGray, fontSize: 12 }}>
            {ROLE_LABEL[target.role]} — @{target.username ?? 'no username'}
          </Typography>
        </Box>
        <IconButton onClick={onClose}>
          <Close sx={{ color: palette.fogWhite }} />
        </IconButton>
      </Box>
      <Divider sx={{ borderColor: palette.oceanMid }} />

      <Box ref={listRef} sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
        {(chatMessages ?? []).length === 0 ? (
          <Box sx={{ textAlign: 'center', pt: 4 }}>
            <ChatBubbleOutlined sx={{ color: palette.hullGray, fontSize: 32 }} />
            <Typography sx={{ color: palette.hullGray, mt: 1 }}>Start a conversation with this user.</Typography>
          </Box>
        ) : (
          (chatMessages ?? []).map((m) => {
            const sent = m.sender_id === currentUserId;
            return (
              <Box key={m.id} sx={{ display: 'flex', justifyContent: sent ? 'flex-end' : 'flex-start', mb: 0.75 }}>
                <Box sx={{ maxWidth: '78%', px: 2, py: 1, borderRadius: `${radius.lg}px`, bgcolor: sent ? palette.steelBlue : palette.oceanMid }}>
                  <Typography sx={{ color: palette.fogWhite, fontSize: 15 }}>{m.content}</Typography>
                </Box>
              </Box>
            );
          })
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, p: 1, borderTop: `1px solid ${palette.surfaceVariant}` }}>
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
              void send();
            }
          }}
        />
        <IconButton
          onClick={send}
          disabled={!draft.trim() || sending}
          sx={{ bgcolor: palette.steelBlue, '&:hover': { bgcolor: palette.steelBlue }, color: palette.fogWhite }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
    </Dialog>
  );
}
