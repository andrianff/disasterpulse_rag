"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Square, Sparkles } from "lucide-react";

interface ChatInputProps {
    onSendMessage: (query: string) => void;
    onStopStreaming: () => void;
    isLoading: boolean;
    disabled?: boolean;
}

const SAMPLE_PROMPTS = [
    "Apa aturan pengambilan foto responden menurut SOP Lapangan?",
    "Jelaskan variabel yang diukur pada kuesioner Blok V!",
    "Apa saja rekomendasi mitigasi dari Laporan Riset PKL?",
    "Bagaimana prosedur verifikasi data saat kuesioner tidak lengkap?",
];

export const ChatInput: React.FC<ChatInputProps> = ({
    onSendMessage,
    onStopStreaming,
    isLoading,
    disabled = false,
}) => {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-resize tinggi textarea sesuai jumlah teks
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = `${Math.min(
                textareaRef.current.scrollHeight,
                160
            )}px`;
        }
    }, [input]);

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || disabled) return;
        onSendMessage(input.trim());
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6">
            {/* Sample Quick Prompts (Tampil hanya jika input masih kosong dan tidak loading) */}
            {!isLoading && input.length === 0 && (
                <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">
                        Saran Pertanyaan:
                    </span>
                    {SAMPLE_PROMPTS.map((prompt, idx) => (
                        <button
                            key={idx}
                            type="button"
                            onClick={() => onSendMessage(prompt)}
                            className="text-xs px-2.5 py-1 rounded-full bg-slate-900/90 text-slate-300 border border-slate-800 hover:border-cyan-500/50 hover:text-white whitespace-nowrap transition cursor-pointer flex-shrink-0 shadow-sm"
                        >
                            {prompt}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Box */}
            <form
                onSubmit={handleSubmit}
                className="relative flex items-end bg-slate-900/90 border border-slate-800 focus-within:border-cyan-500/50 rounded-2xl p-2 shadow-xl shadow-black/40 backdrop-blur-md transition-all"
            >
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanyakan dokumen SOP, kuesioner, atau laporan riset PKL 65..."
                    rows={1}
                    disabled={disabled}
                    className="w-full resize-none bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none max-h-40 overflow-y-auto"
                />

                <div className="flex items-center space-x-2 pb-1 pr-1">
                    {isLoading ? (
                        <button
                            type="button"
                            onClick={onStopStreaming}
                            className="p-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition shadow-sm cursor-pointer"
                            title="Hentikan respons"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </button>
                    ) : (
                        <button
                            type="submit"
                            disabled={!input.trim() || disabled}
                            className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-md shadow-cyan-500/20 cursor-pointer"
                            title="Kirim (Enter)"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </form>
            <div className="text-center mt-2">
                <span className="text-[11px] text-slate-500">
                    DisasterPulse RAG dapat memverifikasi jawaban langsung dari kutipan sumber PKL 65 BPS.
                </span>
            </div>
        </div>
    );
};
