import { ReactNode } from 'react';

interface PublicProfileLayoutProps {
    chatBlock: ReactNode;
    infoBlock?: ReactNode;
    actionsBlock?: ReactNode;
}

export function PublicProfileLayout({
    chatBlock,
    infoBlock,
    actionsBlock,
}: PublicProfileLayoutProps) {
    return (
        <div id="profile-scroll-container" className="h-[100dvh] w-full overflow-hidden bg-base text-primary flex flex-col fixed inset-0 overscroll-none">
            {/* Background Gradient Base - Deep and immersive */}
            <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_30%,_rgba(37,99,235,0.1),_transparent_40%),_radial-gradient(circle_at_80%_70%,_rgba(6,182,212,0.15),_transparent_50%)] pointer-events-none" />

            {/* Main Content Grid (3 Columns) - Fixed to viewport */}
            <main className="relative z-20 flex-1 max-w-[1600px] mx-auto w-full overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full items-stretch">

                    {/* Left Block (Identity/Info) */}
                    <aside className="lg:col-span-3 hidden lg:flex flex-col gap-4">
                        {infoBlock || (
                            <div className="flex-1 p-6 bg-surface/30 backdrop-blur-md rounded-3xl border border-white/5 overflow-y-auto">
                                <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Información</p>
                                <div className="space-y-4">
                                    <div className="h-4 w-3/4 bg-white/5 rounded-full" />
                                    <div className="h-4 w-1/2 bg-white/5 rounded-full" />
                                    <div className="h-20 w-full bg-white/5 rounded-2xl" />
                                </div>
                            </div>
                        )}
                        <div className="p-4 bg-surface/20 backdrop-blur-sm rounded-2xl border border-white/5 text-center">
                            <div className="flex items-center justify-center gap-2 font-bold text-primary opacity-50 text-sm">
                                <div className="w-4 h-4 bg-accent rounded-full" />
                                <span>FluxCore Chat</span>
                            </div>
                        </div>
                    </aside>

                    {/* Central Block (Chat) */}
                    <section className="col-span-1 lg:col-span-6 h-full overflow-hidden relative">
                        <div className="h-full flex flex-col">
                            {chatBlock}
                        </div>
                    </section>

                    {/* Right Block (Extensions/Actions) */}
                    <aside className="lg:col-span-3 hidden lg:flex flex-col gap-4">
                        {actionsBlock || (
                            <div className="flex-1 p-6 bg-surface/30 backdrop-blur-md rounded-3xl border border-white/5 overflow-y-auto">
                                <p className="text-xs font-bold text-muted uppercase tracking-widest mb-4">Extensiones</p>
                                <div className="space-y-4">
                                    <div className="h-10 w-full bg-white/5 rounded-2xl" />
                                    <div className="h-10 w-full bg-white/5 rounded-2xl" />
                                    <div className="h-32 w-full bg-white/5 rounded-2xl" />
                                </div>
                            </div>
                        )}
                    </aside>

                </div>
            </main>
        </div>
    );
}
