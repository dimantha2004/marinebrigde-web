import Anchor from '@mui/icons-material/Anchor';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAuthStore } from '@/stores/authStore';

export default function PortProfile() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ProfilePage
      roleLabel="Port Authority"
      roleIcon={Anchor}
      extraFields={[
        { label: 'UN/LOCODE', value: profile?.unlocode },
        { label: 'Port ID', value: profile?.port_id_text },
        { label: 'ISPS Code', value: profile?.isps_code },
      ]}
    />
  );
}
