import Explore from '@mui/icons-material/Explore';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAuthStore } from '@/stores/authStore';

export default function AgentProfile() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ProfilePage
      roleLabel="Ship Agent"
      roleIcon={Explore}
      extraFields={[
        { label: 'Company Reg No', value: profile?.company_reg_no },
        { label: 'IMO Agent Code', value: profile?.imo_agent_code },
        { label: 'TIN No', value: profile?.tin_no },
      ]}
    />
  );
}
