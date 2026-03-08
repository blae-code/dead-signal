import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Zap } from 'lucide-react';
import SafeResponsiveContainer from '@/components/ui/SafeResponsiveContainer';
import { T } from '@/components/ui/TerminalCard';

export default function ClanAnalyticsWidget() {
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await base44.entities.ClanAnalytics.list('-date', 7);
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load clan analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div style={{ color: T.textFaint }}>Loading analytics...</div>;

  const totalKills = analytics.reduce((s, a) => s + (a.total_kills || 0), 0);
  const avgUptime = (analytics.reduce((s, a) => s + (a.server_uptime_percent || 0), 0) / analytics.length).toFixed(1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border p-4 space-y-4" 
      style={{ borderColor: T.border, background: T.bg1, boxShadow: "inset 0 1px 0 rgba(78, 58, 34, 0.2), 0 4px 12px rgba(0, 0, 0, 0.7)" }}>
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: T.cyan }} />
        <h3 style={{ color: T.text, fontSize: '12px', fontWeight: 'bold', fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em" }}>CLAN METRICS (7 DAYS)</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div style={{ background: T.bg3, padding: '10px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
          <div style={{ color: T.textFaint, fontSize: '8px' }}>KILLS</div>
          <div style={{ color: T.red, fontSize: '13px', fontWeight: 'bold' }}>{totalKills}</div>
        </div>
        <div style={{ background: T.bg3, padding: '10px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
          <div style={{ color: T.textFaint, fontSize: '8px' }}>UPTIME</div>
          <div style={{ color: T.green, fontSize: '13px', fontWeight: 'bold' }}>{avgUptime}%</div>
        </div>
        <div style={{ background: T.bg3, padding: '10px', border: `1px solid ${T.border}`, textAlign: 'center' }}>
          <div style={{ color: T.textFaint, fontSize: '8px' }}>OPERATIONS</div>
          <div style={{ color: T.amber, fontSize: '13px', fontWeight: 'bold' }}>{analytics.length}</div>
        </div>
      </div>

      {analytics.length > 0 && (
        <SafeResponsiveContainer height={150} minHeight={120}>
          <BarChart data={analytics}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke={T.textFaint} />
            <YAxis tick={{ fontSize: 8 }} stroke={T.textFaint} />
            <Tooltip contentStyle={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 0, color: T.text }} />
            <Bar dataKey="missions_completed" fill={T.green} />
          </BarChart>
        </SafeResponsiveContainer>
      )}
    </motion.div>
  );
}
