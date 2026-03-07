import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap } from 'lucide-react';

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

  if (loading) return <div style={{ color: '#999' }}>Loading analytics...</div>;

  const totalKills = analytics.reduce((s, a) => s + (a.total_kills || 0), 0);
  const avgUptime = (analytics.reduce((s, a) => s + (a.server_uptime_percent || 0), 0) / analytics.length).toFixed(1);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border p-4 space-y-4" 
      style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}>
      <div className="flex items-center gap-2">
        <Zap size={14} style={{ color: '#00e5ff' }} />
        <h3 style={{ color: '#d4d4d4', fontSize: '12px', fontWeight: 'bold' }}>CLAN METRICS (7 DAYS)</h3>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        <div style={{ background: '#0a0a0a', padding: '10px', border: '1px solid #1e1e1e', textAlign: 'center' }}>
          <div style={{ color: '#777', fontSize: '8px' }}>KILLS</div>
          <div style={{ color: '#ff2020', fontSize: '13px', fontWeight: 'bold' }}>{totalKills}</div>
        </div>
        <div style={{ background: '#0a0a0a', padding: '10px', border: '1px solid #1e1e1e', textAlign: 'center' }}>
          <div style={{ color: '#777', fontSize: '8px' }}>UPTIME</div>
          <div style={{ color: '#39ff14', fontSize: '13px', fontWeight: 'bold' }}>{avgUptime}%</div>
        </div>
        <div style={{ background: '#0a0a0a', padding: '10px', border: '1px solid #1e1e1e', textAlign: 'center' }}>
          <div style={{ color: '#777', fontSize: '8px' }}>OPERATIONS</div>
          <div style={{ color: '#ffb000', fontSize: '13px', fontWeight: 'bold' }}>{analytics.length}</div>
        </div>
      </div>

      {analytics.length > 0 && (
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={analytics}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#666" />
            <YAxis tick={{ fontSize: 8 }} stroke="#666" />
            <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }} />
            <Bar dataKey="missions_completed" fill="#39ff14" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </motion.div>
  );
}