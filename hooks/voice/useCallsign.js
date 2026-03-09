import { useAuth } from '@/lib/AuthContext';

export function useCallsign() {
    const { user } = useAuth();
    return user?.callsign;
}
