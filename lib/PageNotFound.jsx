import { useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { T } from '@/components/ui/TerminalCard';


export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);

    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await base44.auth.me();
                return { user, isAuthenticated: true };
            } catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    
    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: T.bg0 }}>
            <div className="max-w-lg w-full terminal-card border p-6 space-y-5" style={{ borderColor: T.border, background: T.bg1 }}>
                <div className="space-y-2 text-center">
                    <h1 style={{ color: T.red, fontSize: "56px", fontFamily: "'Orbitron', monospace", lineHeight: 1 }}>404</h1>
                    <div className="h-px w-20 mx-auto" style={{ background: T.border }} />
                    <h2 style={{ color: T.amber, fontSize: "14px", fontFamily: "'Orbitron', monospace", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                        Page Not Found
                    </h2>
                    <p className="text-sm" style={{ color: T.textDim }}>
                        Route <span style={{ color: T.text }}>"{pageName || "/"}"</span> is not available in this deployment.
                    </p>
                </div>

                {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
                    <div className="border p-3 text-sm" style={{ borderColor: T.border, background: T.bg3, color: T.textDim }}>
                        <div className="flex items-start gap-2">
                            <div className="w-2 h-2 ds-circle mt-1" style={{ background: T.warn }} />
                            <div>
                                <p style={{ color: T.amber, fontFamily: "'Orbitron', monospace", fontSize: "10px", letterSpacing: "0.12em" }}>
                                    ADMIN NOTE
                                </p>
                                <p>This page may not be implemented yet. Trigger generation in Base44 Builder if required.</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="pt-1">
                    <button
                        onClick={() => window.location.href = '/'}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm border transition-opacity hover:opacity-80"
                        style={{ borderColor: T.borderHi, color: T.cyan, background: T.bg3 }}
                    >
                        <span>◀</span>
                        <span>Go Home</span>
                    </button>
                </div>
            </div>
        </div>
    )
}
