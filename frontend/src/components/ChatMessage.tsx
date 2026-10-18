"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage as ChatMessageType, CitationSource } from "@/types/chat";
import { Bot, User, Copy, Check, BookOpen, Layers } from "lucide-react";

interface ChatMessageProps {
    message: ChatMessageType;
    onSelectSource: (source: CitationSource) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    onSelectSource,
}) => {
    const [copied, setCopied] = React.useState(false);
    const isAssistant = message.role === "assistant";

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className={`py-6 px-4 sm:px-6 transition-colors ${isAssistant
                    ? "bg-slate-900/40 border-y border-slate-800/40"
                    : "bg-transparent"
                }`}
        >
            <div className="max-w-4xl mx-auto flex space-x-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    {isAssistant ? (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                            <Bot className="w-4 h-4" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                            <User className="w-4 h-4" />
                        </div>
                    )}
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0 space-y-3">
                    {/* Header Role & Copy Action */}
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-300">
                            {isAssistant ? "DisasterPulse AI" : "Anda"}
                        </span>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleCopy}
                                className="p-1 rounded text-slate-500 hover:text-slate-300 transition"
                                title="Salin jawaban"
                            >
                                {copied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Markdown Content */}
                    <div className="text-sm leading-relaxed text-slate-200 prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-cyan-300 prose-headings:text-white">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                        </ReactMarkdown>

                        {/* Blinking streaming cursor */}
                        {message.isStreaming && (
                            <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                        )}
                    </div>

                    {/* Citation Cards (Jika ada sitasi) */}
                    {isAssistant && message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-slate-800/80">
                            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 mb-2.5">
                                <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                                <span>Sumber Terverifikasi ({message.sources.length}):</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {message.sources.map((src) => {
                                    const scorePercent = Math.min(Math.round(src.score * 100), 100);
                                    return (
                                        <button
                                            key={src.citation_id}
                                            onClick={() => onSelectSource(src)}
                                            className="flex flex-col text-left p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all duration-150 group cursor-pointer"
                                        >
                                            <div className="flex items-center justify-between w-full mb-1">
                                                <span className="text-[11px] font-bold font-mono text-cyan-400 group-hover:text-cyan-300">
                                                    [{src.citation_id}] Hal. {src.page_number}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-900">
                                                    {scorePercent}% Match
                                                </span>
                                            </div>
                                            <p className="text-xs font-medium text-slate-300 truncate w-full group-hover:text-white">
                                                {src.document_title}
                                            </p>
                                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                                {src.snippet}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
