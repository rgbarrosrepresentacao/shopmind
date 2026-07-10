"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { Sidebar } from "./sidebar";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  store: {
    nome_loja: string;
    slug: string;
  };
  profile: {
    nome: string;
    email: string;
    tipo: string;
  };
  signOutAction: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({
  isOpen,
  onClose,
  store,
  profile,
  signOutAction,
}) => {
  // Lock body scroll when mobile drawer is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex md:hidden">
      {/* Backdrop overlay */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative flex w-full max-w-xs flex-1 transition-transform duration-300 ease-in-out animate-slide-up">
        <Sidebar
          store={store}
          profile={profile}
          signOutAction={signOutAction}
          onClose={onClose}
          className="w-full border-r-0"
        />
      </div>
    </div>
  );
};
