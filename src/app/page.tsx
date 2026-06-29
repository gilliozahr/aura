'use client';

import { useState } from 'react';
import type { View } from '@/lib/types';
import { AuraProvider } from '@/store';
import { ToastProvider } from '@/store/toast';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toast from '@/components/layout/Toast';
import HomeView from '@/components/views/HomeView';
import WardrobeView from '@/components/views/WardrobeView';
import InspirationView from '@/components/views/InspirationView';
import PackingView from '@/components/views/PackingView';
import StylistView from '@/components/views/StylistView';
import AnalyticsView from '@/components/views/AnalyticsView';
import SettingsView from '@/components/views/SettingsView';
import PlannerView from '@/components/views/PlannerView';

function AuraApp() {
  const [activeView, setActiveView] = useState<View>('home');

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main">
        <Topbar activeView={activeView} />
        {activeView === 'home' && <HomeView onNavigate={setActiveView} />}
        {activeView === 'wardrobe' && <WardrobeView />}
        {activeView === 'inspiration' && <InspirationView />}
        {activeView === 'occasions' && <div className="card" style={{ padding: '2rem' }}><p className="eyebrow">Occasions</p><p>Coming soon.</p></div>}
        {activeView === 'planner' && <PlannerView onNavigate={setActiveView} />}
        {activeView === 'packing' && <PackingView />}
        {activeView === 'shopping' && <div className="card" style={{ padding: '2rem' }}><p className="eyebrow">Shopping</p><p>Coming soon.</p></div>}
        {activeView === 'stylist' && <StylistView />}
        {activeView === 'analytics' && <AnalyticsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuraProvider>
      <ToastProvider>
        <AuraApp />
        <Toast />
      </ToastProvider>
    </AuraProvider>
  );
}
