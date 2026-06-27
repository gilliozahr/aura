'use client';

import { useState } from 'react';
import type { View } from '@/lib/types';
import { AuthProvider } from '@/store/auth';
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

function AuraApp() {
  const [activeView, setActiveView] = useState<View>('home');

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main">
        <Topbar activeView={activeView} />
        {activeView === 'home' && <HomeView />}
        {activeView === 'wardrobe' && <WardrobeView />}
        {activeView === 'inspiration' && <InspirationView />}
        {activeView === 'packing' && <PackingView />}
        {activeView === 'stylist' && <StylistView />}
        {activeView === 'analytics' && <AnalyticsView />}
        {activeView === 'settings' && <SettingsView />}
      </main>
    </div>
  );
}

export default function Page() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuraProvider>
          <AuraApp />
          <Toast />
        </AuraProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
