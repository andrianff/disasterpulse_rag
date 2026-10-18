"use client";

import React from "react";
import { CitationSource } from "@/types/chat";
import { X, BookOpen, FileText, Check, Copy, Sparkles } from "lucide-react";

interface CitationModalProps {
    source: CitationSource | null;
    isOpen: boolean;
    onClose: () => void;
}

export const CitationModal: React.FC<CitationModalProps> = ({
    source,
    isOpen,
    onClose,
}) => {
    const [copied, setCopied] = React.useState(false);

    if (!isOpen || !source) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(source.snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Hitung persentase skor relevansi (misal 0.85 -> 85%)
    const scorePercent = Math.min(Math.round(source.score * 100), 100);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center space-x-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-mono text-xs font-bold border border-cyan-500/40">
                            [{source.citation_id}]
                        </span>
                        <div>
                            <h3 className="text-sm font-semibold text-white truncate max-w-md">
                                {source.document_title}
                            </h3>
                            <p className="text-xs text-slate-400">Verifikasi Sumber Sitasi</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Metadata Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {/* Kategori */}
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                            <span className="text-[11px] font-medium text-slate-400 block mb-1">
                                Kategori
                            </span>
                            <span className="text-xs font-semibold text-cyan-300 capitalize">
                                {source.category.replace("_", " ")}
                            </span>
                        </div>

                        {/* Halaman */}
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80">
                            <span className="text-[11px] font-medium text-slate-400 block mb-1">
                                Halaman Dokumen
                            </span>
                            <span className="text-xs font-semibold text-white flex items-center space-x-1">
                                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                                <span>Hal. {source.page_number}</span>
                            </span>
                        </div>

                        {/* Relevansi */}
                        <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 col-span-2 sm:col-span-1">
                            <span className="text-[11px] font-medium text-slate-400 block mb-1">
                                Relevansi Reranker
                            </span>
                            <div className="flex items-center space-x-2">
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                                        style={{ width: `${scorePercent}%` }}
                                    />
                                </div>
                                <span className="text-xs font-bold text-cyan-400 font-mono">
                                    {scorePercent}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Snippet Asli */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Teks Kutipan Asli (Verbatim Snippet):</span>
                            </span>
                            <button
                                onClick={handleCopy}
                                className="flex items-center space-x-1 text-xs text-slate-400 hover:text-white transition px-2 py-1 rounded bg-slate-800/80 hover:bg-slate-800"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Tersalin</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Salin Teks</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 text-slate-300 text-xs sm:text-sm leading-relaxed font-sans whitespace-pre-wrap selection:bg-cyan-500/30 selection:text-cyan-200">
                            {source.snippet}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
                    <span>Chunk #{source.chunk_index}</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
