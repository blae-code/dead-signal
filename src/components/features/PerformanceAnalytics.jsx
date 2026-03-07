import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

export default function PerformanceAnalytics() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await base44.entities.ServerPerformanceLog.list('-timestamp', 50);
        setLogs(data.reverse());
      } catch (err) {
        console.error('Failed to load performance logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  if (loading) return <div style={{ color: '#999', padding: '20px' }}>Loading analytics...</div>;

  const avgCpu = (logs.reduce((s, l) => s + (l.cpu_percent || 0), 0) / logs.length).toFixed(1);
  const peakCpu = Math.max(...logs.map(l => l.cpu_percent || 0));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border p-4 space-y-4" 
      style={{ borderColor: '#2a2a2a', background: '#0f0f0f' }}>
      <div className="flex items-center gap-2">
        <TrendingUp size={14} style={{ color: '#39ff14' }} />
        <h3 style={{ color: '#d4d4d4', fontSize: '12px', fontWeight: 'bold' }}>PERFORMANCE HISTORY</h3>
      </div>
      
      {logs.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div style={{ background: '#0a0a0a', padding: '12px', border: '1px solid #1e1e1e' }}>
              <div style={{ color: '#777', fontSize: '9px' }}>AVG CPU</div>
              <div style={{ color: '#39ff14', fontSize: '14px', fontWeight: 'bold' }}>{avgCpu}%</div>
            </div>
            <div style={{ background: '#0a0a0a', padding: '12px', border: '1px solid #1e1e1e' }}>
              <div style={{ color: '#777', fontSize: '9px' }}>PEAK CPU</div>
              <div style={{ color: '#ffb000', fontSize: '14px', fontWeight: 'bold' }}>{peakCpu}%</div>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={logs.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="timestamp" tick={{ fontSize: 8 }} stroke="#666" />
              <YAxis tick={{ fontSize: 8 }} stroke="#666" />
              <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #2a2a2a' }} />
              <Line type="monotone" dataKey="cpu_percent" stroke="#39ff14" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </motion.div>
  );
}