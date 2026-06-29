'use client';

import type { View } from '@/lib/types';

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'home', label: 'Daily Briefing' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'inspiration', label: 'AI Inspiration' },
  { id: 'occasions', label: 'Occasions' },
  { id: 'planner', label: 'Planner' },
  { id: 'packing', label: 'Packing' },
  { id: 'stylist', label: 'Stylist Network' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' },
];

interface SidebarProps {
  activeView: View;
  onNavigate: (view: View) => void;
}

export default function Sidebar({ activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">A</div>
        <div>
          <strong>AURA</strong>
          <span>Style Intelligence OS</span>
        </div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`nav-item${activeView === item.id ? ' active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-card">
        <span className="eyebrow">v1.3.0 Preview</span>
        <p>Next.js · TypeScript · Supabase · Smart Closet Calendar</p>
      </div>
    </aside>
  );
}
