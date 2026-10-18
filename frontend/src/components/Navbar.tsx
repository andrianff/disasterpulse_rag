"use client";

import React from "react";
import { Activity, BookOpen, Database } from "lucide-react";

interface NavbarProps {
    onOpenDocuments: () => void;
    documentCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenDocuments, documentCount = 8 }) => {
    return (
        <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                {/* Brand & Logo */}
                <div className="flex items-center space-x-3">
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                        <Activity className="w-5 h-5 animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <h1 className="text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                                DisasterPulse <span className="text-cyan-400">RAG</span>
                            </h1>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                                v1.0
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 hidden sm:block">
                            Asisten Riset & Operasional Bencana PKL 65 Polstat STIS
                        </p>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-3">
                    {/* Document Knowledge Base Button */}
                    <button
                        onClick={onOpenDocuments}
                        className="flex items-center space-x-2 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition shadow-sm"
                        title="Lihat Dokumen Terindeks"
                    >
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span className="hidden sm:inline">Basis Dokumen</span>
                        <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-cyan-950 text-cyan-300 rounded border border-cyan-800">
                            {documentCount} Dokumen
                        </span>
                    </button>

                    {/* GitHub Repository Link */}
                    <a
                        href="https://github.com/andrianff/disasterpulse_rag"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                        title="GitHub Repository"
                    >
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    </a>
                </div>
            </div>
        </header>
    );
};
