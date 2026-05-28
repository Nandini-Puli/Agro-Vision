import { useNavigate } from 'react-router-dom';
import ProfileDrawer from '../components/ProfileDrawer';

export default function ProfileRoutePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-120px)]">
      <ProfileDrawer isOpen onClose={() => navigate('/dashboard')} />
    </div>
  );
}
