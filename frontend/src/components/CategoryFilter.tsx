"use client";

import React from "react";
import { CategoryOption } from "@/types/chat";
import { Layers, ShieldCheck, FileSpreadsheet, FileText } from "lucide-react";

interface CategoryFilterProps {
    categories: CategoryOption[];
    selectedCategory: string | null;
    onSelectCategory: (category: string | null) => void;
    disabled?: boolean;
}

export const CategoryFilter: React.FC<CategoryFilterProps> = ({
    categories,
    selectedCategory,
    onSelectCategory,
    disabled = false,
}) => {
    const getCategoryIcon = (value: string | null) => {
        switch (value) {
            case "sop_lapangan":
                return <ShieldCheck className="w-3.5 h-3.5" />;
            case "kuesioner":
                return <FileSpreadsheet className="w-3.5 h-3.5" />;
            case "laporan_riset":
                return <FileText className="w-3.5 h-3.5" />;
            default:
                return <Layers className="w-3.5 h-3.5" />;
        }
    };

    return (
        <div className="flex items-center space-x-2 overflow-x-auto py-2 no-scrollbar">
            <span className="text-xs font-medium text-slate-400 whitespace-nowrap hidden sm:inline mr-1">
                Filter Dokumen:
            </span>
            {categories.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                    <button
                        key={cat.value || "all"}
                        type="button"
                        disabled={disabled}
                        onClick={() => onSelectCategory(cat.value)}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${isSelected
                                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                                : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200"
                            }`}
                    >
                        <span className={isSelected ? "text-cyan-400" : "text-slate-500"}>
                            {getCategoryIcon(cat.value)}
                        </span>
                        <span>{cat.label}</span>
                    </button>
                );
            })}
        </div>
    );
};
