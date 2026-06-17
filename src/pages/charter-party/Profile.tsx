import BusinessCenter from '@mui/icons-material/BusinessCenter';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAuthStore } from '@/stores/authStore';

export default function CharterProfile() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ProfilePage
      roleLabel="Charter Party"
      roleIcon={BusinessCenter}
      extraFields={[
        { label: 'CP No', value: profile?.cp_no },
        { label: 'IMO No', value: profile?.imo_no },
        { label: 'Contract Date', value: profile?.contract_date },
      ]}
    />
  );
}
