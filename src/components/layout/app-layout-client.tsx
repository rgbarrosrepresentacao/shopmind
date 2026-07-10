"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Header } from "./header";
import { ToastContainer } from "../ui/toast";
import { CommandPalette, useCommandPalette } from "../ui/command-palette";
import { AIAssistantWidget } from "../ai/ai-assistant-widget";
import { signOut } from "@/lib/actions/auth";
import { LojaProvider } from "../providers/loja-context";

interface AppLayoutClientProps {
  children: React.ReactNode;
  store: any;
  profile: any;
  grupo: any;
  lojas: any[];
  lojaAtiva: any;
  perfil: any;
}

export const AppLayoutClient: React.FC<AppLayoutClientProps> = ({
  children,
  store,
  profile,
  grupo,
  lojas,
  lojaAtiva,
  perfil,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const commandPalette = useCommandPalette();

  const handleSignOut = async () => {
    await signOut();
  };

  const primaryColor = lojaAtiva?.cor_primaria || "#3b82f6";
  const dynamicStyles = {
    "--primary": primaryColor,
    "--ring": primaryColor,
  } as React.CSSProperties;

  return (
    <LojaProvider 
      grupo={grupo} 
      lojaAtiva={lojaAtiva} 
      lojas={lojas} 
      perfil={perfil}
    >
      <div 
        className="min-h-screen flex bg-slate-950 text-slate-100 font-sans"
        style={dynamicStyles}
      >
        {/* Toast notifications */}
        <ToastContainer />

        {/* Command Palette (Ctrl+K) */}
        <CommandPalette
          isOpen={commandPalette.isOpen}
          onClose={commandPalette.close}
          userTipo={profile.tipo}
          userEmail={profile.email}
        />

        {/* AI Assistant Widget */}
        <AIAssistantWidget />

        {/* Sidebar for desktop */}
        <div className="hidden md:block flex-shrink-0 h-screen sticky top-0">
          <Sidebar
            store={store}
            profile={profile}
            signOutAction={handleSignOut}
          />
        </div>

        {/* Mobile Drawer Sidebar */}
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          store={store}
          profile={profile}
          signOutAction={handleSignOut}
        />

        {/* Main View Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header
            onMenuClick={() => setMobileSidebarOpen(true)}
            onSearchClick={commandPalette.open}
            store={store}
            profile={profile}
            signOutAction={handleSignOut}
          />

          {/* Core page contents */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-900/20">
            <div className="max-w-7xl mx-auto w-full h-full animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </LojaProvider>
  );
};
