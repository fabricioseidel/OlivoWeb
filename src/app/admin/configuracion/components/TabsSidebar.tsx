"use client";

import { TABS } from "../lib";

interface TabsSidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

export default function TabsSidebar({ activeTab, setActiveTab }: TabsSidebarProps) {
  return (
    <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible space-x-2 lg:space-x-0 lg:space-y-1 sticky top-0 lg:top-24 bg-white/80 backdrop-blur-md lg:bg-transparent p-3 lg:p-0 border-b lg:border-none scrollbar-hide z-30 -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 lg:w-full flex items-center gap-2.5 px-4 py-2.5 lg:py-3 rounded-xl lg:rounded-lg font-bold text-xs lg:text-sm transition-all snap-start ${activeTab === tab.id
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500 ring-offset-2 lg:ring-0"
              : "text-slate-600 hover:bg-slate-50"
              }`}
          >
            <Icon className="h-4 w-4 lg:h-5 lg:w-5" />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
