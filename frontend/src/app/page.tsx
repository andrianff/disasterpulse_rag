"use client";

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/Navbar";
import { CategoryFilter } from "@/components/CategoryFilter";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { CitationModal } from "@/components/CitationModal";
import { DocumentsModal } from "@/components/DocumentsModal";
import {
  ChatMessage as ChatMessageType,
  CitationSource,
  CategoryOption,
} from "@/types/chat";
import { streamChatQuery, fetchCategories } from "@/lib/api";
import { Activity, ShieldCheck, Sparkles, Database, FileText } from "lucide-react";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<CitationSource | null>(null);
  const [isCitationOpen, setIsCitationOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Ambil daftar kategori dari backend saat mount
  useEffect(() => {
    fetchCategories().then((cats) => setCategories(cats));
  }, []);

  // Auto-scroll ke bawah saat ada pesan baru atau streaming teks
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handler kirim pesan chat
  const handleSendMessage = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const newUserMessage: ChatMessageType = {
      id: userMessageId,
      role: "user",
      content: queryText,
      timestamp: new Date(),
    };

    const newAssistantMessage: ChatMessageType = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      sources: [],
    };

    setMessages((prev) => [...prev, newUserMessage, newAssistantMessage]);
    setIsLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Convert past messages to conversation history
    const conversationHistory = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    await streamChatQuery({
      query: queryText,
      conversationHistory,
      categoryFilter: selectedCategory,
      onToken: (token: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: msg.content + token }
              : msg
          )
        );
      },
      onSources: (sources: CitationSource[]) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, sources } : msg
          )
        );
      },
      onError: (errorMsg: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  content:
                    msg.content +
                    `\n\n> ⚠️ **Terjadi Kendala Koneksi:** ${errorMsg}`,
                  isStreaming: false,
                }
              : msg
          )
        );
        setIsLoading(false);
      },
      onDone: () => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, isStreaming: false }
              : msg
          )
        );
        setIsLoading(false);
        abortControllerRef.current = null;
      },
      signal: abortController.signal,
    });
  };

  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        )
      );
    }
  };

  const handleOpenCitation = (source: CitationSource) => {
    setSelectedSource(source);
    setIsCitationOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Navbar Atas */}
      <Navbar onOpenDocuments={() => setIsDocumentsOpen(true)} />

      {/* Main Container */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto overflow-hidden">
        {/* Sub-header Filter Kategori */}
        <div className="px-4 sm:px-6 py-2 border-b border-slate-900 bg-slate-950/40">
          <CategoryFilter
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            disabled={isLoading}
          />
        </div>

        {/* Area Pesan Chat */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* Welcome Hero Section */
            <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16 text-center space-y-8 animate-in fade-in duration-300">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-xs font-medium">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Two-Stage Hybrid Reranker + Gemini Flash</span>
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Asisten Cerdas Dokumen Riset Kebencanaan
                </h2>
                <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Dapatkan jawaban presisi berbasis bukti dari SOP Lapangan, Pedoman Kuesioner, dan Laporan Riset PKL 65 Polstat STIS dengan sitasi dokumen terverifikasi.
                </p>
              </div>

              {/* 3 Fitur Unggulan Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-white mb-1">
                    Sitasi Ilmiah & Halaman
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setiap jawaban dilengkapi kutipan teks asli dan nomor halaman untuk verifikasi akurasi.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                    <Activity className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-white mb-1">
                    Two-Stage Reranker
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pencarian awal ChromaDB disaring kembali oleh BGE-Reranker untuk hasil paling relevan.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-semibold text-white mb-1">
                    Filter Kategori Presisi
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Saring konteks secara spesifik ke dokumen SOP, kuesioner, atau laporan riset sesuai kebutuhan.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Daftar Pesan Chat */
            <div className="divide-y divide-slate-800/20">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSelectSource={handleOpenCitation}
                />
              ))}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Area Input Bawah (Sticky) */}
        <div className="sticky bottom-0 z-30 pb-4 pt-2 bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent">
          <ChatInput
            onSendMessage={handleSendMessage}
            onStopStreaming={handleStopStreaming}
            isLoading={isLoading}
          />
        </div>
      </main>

      {/* Modal Sitasi */}
      <CitationModal
        source={selectedSource}
        isOpen={isCitationOpen}
        onClose={() => setIsCitationOpen(false)}
      />

      {/* Modal Katalog Dokumen */}
      <DocumentsModal
        isOpen={isDocumentsOpen}
        onClose={() => setIsDocumentsOpen(false)}
      />
    </div>
  );
}
