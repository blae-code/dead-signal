import React from 'react';
import { T } from '@/components/ui/TerminalCard';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6" style={{ background: T.bg0 }}>
      <div className="max-w-md w-full p-8 terminal-card border" style={{ borderColor: T.border, background: T.bg1 }}>
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-6 ds-circle border" style={{ borderColor: T.borderHi, background: T.bg3 }}>
            <svg className="w-8 h-8" style={{ color: T.amber }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-4" style={{ color: T.red, fontFamily: "'Orbitron', monospace", letterSpacing: "0.12em", textTransform: "uppercase" }}>Access Restricted</h1>
          <p className="mb-8" style={{ color: T.textDim }}>
            You are not registered to use this application. Please contact the app administrator to request access.
          </p>
          <div className="p-4 text-sm border" style={{ color: T.textDim, background: T.bg3, borderColor: T.border }}>
            <p>If you believe this is an error, you can:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Verify you are logged in with the correct account</li>
              <li>Contact the app administrator for access</li>
              <li>Try logging out and back in again</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
