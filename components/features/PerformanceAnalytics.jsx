import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import SafeResponsiveContainer from '@/components/ui/SafeResponsiveContainer';
import { T } from '@/components/ui/TerminalCard';

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

  if (loading) return <div style={{ color: T.textFaint, padding: '20px' }}>Loading analytics...</div>;

  const avgCpu = (logs.reduce((s, l) => s + (l.cpu_percent || 0), 0) / logs.length).toFixed(1);
  const peakCpu = Math.max(...logs.map(l => l.cpu_percent || 0));

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border p-4 space-y-4" 
      style={{ borderColor: T.border, background: T.bg1, boxShadow: "inset 0 1px 0 rgba(78, 58, 34, 0.2), 0 4px 12px rgba(0, 0, 0, 0.7)" }}>
      <div className="flex items-center gap-2">
        <TrendingUp size={14} style={{ color: T.green }} />
        <h3 style={{ color: T.text, fontSize: '12px', fontWeight: 'bold', fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em" }}>PERFORMANCE HISTORY</h3>
      </div>
      
      {logs.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div style={{ background: T.bg3, padding: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textFaint, fontSize: '9px' }}>AVG CPU</div>
              <div style={{ color: T.green, fontSize: '14px', fontWeight: 'bold' }}>{avgCpu}%</div>
            </div>
            <div style={{ background: T.bg3, padding: '12px', border: `1px solid ${T.border}` }}>
              <div style={{ color: T.textFaint, fontSize: '9px' }}>PEAK CPU</div>
              <div style={{ color: T.amber, fontSize: '14px', fontWeight: 'bold' }}>{peakCpu}%</div>
            </div>
          </div>
          
          <SafeResponsiveContainer height={200} minHeight={160}>
            <LineChart data={logs.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="timestamp" tick={{ fontSize: 8 }} stroke={T.textFaint} />
              <YAxis tick={{ fontSize: 8 }} stroke={T.textFaint} />
              <Tooltip contentStyle={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 0, color: T.text }} />
              <Line type="monotone" dataKey="cpu_percent" stroke={T.green} dot={false} />
            </LineChart>
          </SafeResponsiveContainer>
        </>
      )}
    </motion.div>
  );
}
