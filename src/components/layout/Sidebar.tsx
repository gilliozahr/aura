'use client';

import type { View } from '@/lib/types';
import AuthSection from '@/components/auth/AuthSection';

const NAV_ITEMS: { id: View; label: string }[] = [
  { id: 'home', label: 'Daily Briefing' },
  { id: 'wardrobe', label: 'Wardrobe' },
  { id: 'inspiration', label: 'AI Inspiration' },
  { id: 'packing', label: 'Packing' },
  { id: 'occasions', label: 'Occasions' },
  { id: 'stylist', label: 'Stylist Concierge' },
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
          <span>AI Personal Style OS</span>
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

      <AuthSection />
    </aside>
  );
}
