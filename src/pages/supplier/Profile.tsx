import Storefront from '@mui/icons-material/Storefront';
import ProfilePage from '@/components/shared/ProfilePage';
import { useAuthStore } from '@/stores/authStore';

export default function SupplierProfile() {
  const profile = useAuthStore((s) => s.profile);
  return (
    <ProfilePage
      roleLabel="Supplier"
      roleIcon={Storefront}
      extraFields={[
        { label: 'Business No', value: profile?.business_no },
        { label: 'TIN No', value: profile?.tin_no },
        { label: 'DUNS No', value: profile?.duns_no },
      ]}
    />
  );
}
