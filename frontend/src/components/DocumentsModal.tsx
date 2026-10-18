"use client";

import React, { useState, useEffect } from "react";
import { DocumentInfo } from "@/types/chat";
import { fetchDocuments } from "@/lib/api";
import { X, Database, FileText, Search, HardDrive, CheckCircle2 } from "lucide-react";

interface DocumentsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
    isOpen,
    onClose,
}) => {
    const [documents, setDocuments] = useState<DocumentInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            fetchDocuments()
                .then((docs) => setDocuments(docs))
                .finally(() => setLoading(false));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const filteredDocs = documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-white">
                                Basis Pengetahuan Dokumen PKL 65
                            </h3>
                            <p className="text-xs text-slate-400">
                                Total {documents.length} dokumen PDF terindeks dalam ChromaDB
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
                    <div className="relative">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari judul dokumen atau kategori..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                </div>

                {/* List Dokumen */}
                <div className="p-6 overflow-y-auto space-y-3 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs">Memuat katalog dokumen...</span>
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-xs">
                            Tidak ada dokumen yang sesuai dengan pencarian.
                        </div>
                    ) : (
                        filteredDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition"
                            >
                                <div className="flex items-start space-x-3 min-w-0">
                                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 mt-0.5 flex-shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-semibold text-slate-200 truncate">
                                            {doc.title}
                                        </h4>
                                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                            {doc.filename}
                                        </p>
                                        <div className="flex items-center space-x-2 mt-1.5">
                                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950/60 text-cyan-400 border border-cyan-800/60 capitalize font-medium">
                                                {doc.category.replace("_", " ")}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {doc.total_pages} Halaman
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-1.5 pl-3 flex-shrink-0 text-emerald-400 text-xs font-medium">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-[11px] hidden sm:inline">Terindeks</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-500">
                    <span>DisasterPulse Knowledge Base</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium transition cursor-pointer"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};
