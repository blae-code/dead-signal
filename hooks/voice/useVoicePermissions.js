import { useAuth } from '@/lib/AuthContext';
import { voiceNetResolver } from '@/lib/voice/voiceNetResolver';

// Roles ranked by authority (higher index = more authority)
const ROLE_RANK = {
  guest: 0,
  member: 1,
  recruit: 1,
  field_operator: 2,
  sergeant: 3,
  lieutenant: 4,
  officer: 4,
  commander: 5,
  admin: 6,
};

const rank = (role) => ROLE_RANK[String(role).toLowerCase()] ?? 2;

/**
 * Role-aware voice permissions.
 * Returns permission check functions based on the current user's role.
 */
export function useVoicePermissions() {
  const { user } = useAuth();
  const userRole = user?.role ?? 'field_operator';
  const userRank = rank(userRole);

  return {
    userRole,

    /**
     * Can this user access a net (connect to it)?
     * @param {string} netId
     */
    canAccessNet(netId) {
      if (userRank >= rank('admin')) return true;
      const net = voiceNetResolver.getNetById(netId);
      if (!net) return false;
      if (!net.roleRestrictions?.length) return true;
      return net.roleRestrictions.some(r => userRank >= rank(r));
    },

    /**
     * Can this user transmit on a net?
     * @param {string} netId
     */
    canTransmitOn(netId) {
      if (userRank >= rank('admin')) return true;
      const net = voiceNetResolver.getNetById(netId);
      if (!net) return false;
      if (!net.allowPTT && !net.allowOpenMic) return false;
      if (net.disciplineMode === 'role-gated') {
        return net.roleRestrictions?.length
          ? net.roleRestrictions.some(r => userRank >= rank(r))
          : false;
      }
      return true;
    },

    /**
     * Is this user the Net Control operator for a net?
     * @param {string} netId
     */
    isNetControl(netId) {
      if (!voiceNetResolver.getNetById(netId)?.netControlEnabled) return false;
      return userRank >= rank('officer');
    },

    /** Can this user open emergency traffic? */
    canOpenEmergency() {
      return userRank >= rank('commander');
    },

    /** Can this user bridge two nets? */
    canBridgeNets() {
      return userRank >= rank('admin');
    },

    /** Can this user access admin-only tools? */
    isAdmin() {
      return userRank >= rank('admin');
    },
  };
}

