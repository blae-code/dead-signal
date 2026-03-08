import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RotateCcw, BarChart3, Loader } from 'lucide-react';
import { T, Panel, FormPanel, Field, ActionBtn, StatusBadge, SectionDivider } from '@/components/ui/TerminalCard';
import { motion } from 'framer-motion';

export default function AutomationDashboard() {
  const [analysis, setAnalysis] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [automationConfig, setAutomationConfig] = useState({
    enableLogAnalysis: true,
    enableAutoRestart: true,
    enableAlertResponses: true,
    restartSchedule: 'weekly',
    cpuThreshold: 85,
    memThreshold: 90,
    gracefulWait: 300,
  });
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const result = await base44.entities.ScheduledCommand.list('-created_date', 20);
      setHistory(result || []);
    } catch (e) {
      console.error('Failed to load history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  const runLogAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const result = await base44.functions.invoke('analyzeServerLogs', {});
      setAnalysis(result.data);
    } catch (e) {
      console.error('Log analysis failed:', e);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const runAutomatedRestart = async () => {
    try {
      const result = await base44.functions.invoke('scheduleServerRestart', {
        restartType: automationConfig.restartSchedule === 'immediate' ? 'performance' : 'scheduled',
        cpuThreshold: automationConfig.cpuThreshold,
        memThreshold: automationConfig.memThreshold,
        gracefulWait: automationConfig.gracefulWait,
      });
      if (result.data?.restart_initiated) {
        await loadHistory();
      }
    } catch (e) {
      console.error('Restart failed:', e);
    }
  };

  return (
    <div className="space-y-3">
      {/* Config Panel */}
      <FormPanel title="AUTOMATION SETTINGS" titleColor={T.green}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'enableLogAnalysis', label: 'Log Analysis' },
              { key: 'enableAutoRestart', label: 'Auto Restart' },
              { key: 'enableAlertResponses', label: 'Alert Responses' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={automationConfig[key]}
                  onChange={(e) => setAutomationConfig(p => ({ ...p, [key]: e.target.checked }))}
                  className="w-3 h-3"
                  style={{ accentColor: T.green }}
                />
                <span style={{ color: T.textFaint, fontSize: '8px' }}>{label}</span>
              </label>
            ))}
          </div>

          <SectionDivider label="RESTART CONFIG" color={T.amber} />

          <Field label="Schedule Type">
            <select
              value={automationConfig.restartSchedule}
              onChange={(e) => setAutomationConfig(p => ({ ...p, restartSchedule: e.target.value }))}
              style={{ width: '100%', padding: '4px 6px', fontSize: '10px' }}
            >
              <option value="weekly">Weekly (Tue/Sat 3AM UTC)</option>
              <option value="performance">Performance-Based</option>
              <option value="manual">Manual Only</option>
              <option value="immediate">Immediate Test</option>
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="CPU Threshold (%)">
              <input
                type="number"
                min="50"
                max="100"
                value={automationConfig.cpuThreshold}
                onChange={(e) => setAutomationConfig(p => ({ ...p, cpuThreshold: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '4px 6px', fontSize: '10px' }}
              />
            </Field>
            <Field label="Memory Threshold (%)">
              <input
                type="number"
                min="50"
                max="100"
                value={automationConfig.memThreshold}
                onChange={(e) => setAutomationConfig(p => ({ ...p, memThreshold: parseInt(e.target.value) }))}
                style={{ width: '100%', padding: '4px 6px', fontSize: '10px' }}
              />
            </Field>
          </div>

          <Field label="Graceful Wait (seconds)">
            <input
              type="number"
              min="60"
              max="1800"
              value={automationConfig.gracefulWait}
              onChange={(e) => setAutomationConfig(p => ({ ...p, gracefulWait: parseInt(e.target.value) }))}
              style={{ width: '100%', padding: '4px 6px', fontSize: '10px' }}
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <ActionBtn color={T.green} onClick={runLogAnalysis} disabled={loadingAnalysis}>
              {loadingAnalysis ? <Loader size={9} className="animate-spin" /> : <BarChart3 size={9} />}
              ANALYZE LOGS
            </ActionBtn>
            <ActionBtn color={T.amber} onClick={runAutomatedRestart}>
              <RotateCcw size={9} />
              RESTART
            </ActionBtn>
          </div>
        </div>
      </FormPanel>

      {/* Log Analysis Results */}
      {analysis && (
        <Panel title="LOG ANALYSIS RESULTS" titleColor={T.cyan}>
          <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
            <div>
              <div style={{ color: T.textFaint, fontSize: '7px', letterSpacing: '0.1em', marginBottom: '3px' }}>SEVERITY</div>
              <StatusBadge label={analysis.overall_severity} color={
                analysis.overall_severity === 'CRITICAL' ? T.red :
                analysis.overall_severity === 'HIGH' ? T.orange :
                analysis.overall_severity === 'MEDIUM' ? T.amber :
                T.green
              } />
            </div>

            {analysis.critical_issues?.length > 0 && (
              <div>
                <div style={{ color: T.red, fontSize: '8px', fontWeight: 'bold', marginBottom: '2px' }}>🔴 CRITICAL ISSUES</div>
                {analysis.critical_issues.map((issue, i) => (
                  <div key={i} style={{ color: T.textFaint, fontSize: '7.5px', lineHeight: '1.3', marginBottom: '2px' }}>
                    • {issue}
                  </div>
                ))}
              </div>
            )}

            {analysis.recommendations?.length > 0 && (
              <div>
                <div style={{ color: T.green, fontSize: '8px', fontWeight: 'bold', marginBottom: '2px' }}>✓ RECOMMENDATIONS</div>
                {analysis.recommendations.slice(0, 3).map((rec, i) => (
                  <div key={i} style={{ color: T.textFaint, fontSize: '7.5px', lineHeight: '1.3', marginBottom: '2px' }}>
                    • {rec}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Automation History */}
      <Panel title="AUTOMATION HISTORY" titleColor={T.steel}>
        <div className="p-3 max-h-64 overflow-y-auto">
          {loadingHistory ? (
            <div style={{ color: T.textFaint, fontSize: '8px', textAlign: 'center', padding: '10px' }}>Loading...</div>
          ) : history.length === 0 ? (
            <div style={{ color: T.textFaint, fontSize: '8px', textAlign: 'center', padding: '10px' }}>No automation history yet</div>
          ) : (
            <div className="space-y-2">
              {history.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="border border-l-4 p-2"
                  style={{
                    borderColor: T.border,
                    borderLeftColor: item.status === 'SUCCESS' ? T.green : T.amber,
                    background: 'rgba(0,0,0,0.2)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span style={{ color: T.textDim, fontSize: '7.5px', fontFamily: "'Orbitron', monospace" }}>
                      {item.command_type}
                    </span>
                    <StatusBadge
                      label={item.status}
                      color={item.status === 'SUCCESS' ? T.green : T.amber}
                    />
                  </div>
                  <div style={{ color: T.textFaint, fontSize: '7px', marginTop: '2px' }}>
                    CPU: {item.cpu_before?.toFixed(0)}% | RAM: {item.memory_before?.toFixed(1)}GB
                  </div>
                  <div style={{ color: T.textFaint, fontSize: '6.5px', marginTop: '1px', opacity: 0.6 }}>
                    {new Date(item.created_date).toLocaleString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}