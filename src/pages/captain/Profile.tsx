import DirectionsBoat from '@mui/icons-material/DirectionsBoat';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAuthStore } from '@/stores/authStore';

export default function CaptainProfile() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ProfilePage
      roleLabel="Captain"
      roleIcon={DirectionsBoat}
      extraFields={[
        { label: 'Passport No', value: profile?.passport_no },
        { label: 'SID No', value: profile?.sid_no },
      ]}
    />
  );
}
