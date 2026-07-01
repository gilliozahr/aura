'use client';

import { useState } from 'react';
import type { View } from '@/lib/types';
import { AuthProvider, useAuth } from '@/store/auth';
import { AuraProvider } from '@/store';
import { ToastProvider } from '@/store/toast';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import Toast from '@/components/layout/Toast';
import AuthLanding from '@/components/auth/AuthLanding';
import HomeView from '@/components/views/HomeView';
import WardrobeView from '@/components/views/WardrobeView';
import InspirationView from '@/components/views/InspirationView';
import PackingView from '@/components/views/PackingView';
import OccasionsView from '@/components/views/OccasionsView';
import StylistView from '@/components/views/StylistView';
import AnalyticsView from '@/components/views/AnalyticsView';
import SettingsView from '@/components/views/SettingsView';
import ShoppingView from '@/components/views/ShoppingView';
import PlannerView from '@/components/views/PlannerView';

function AuraApp() {
  const [activeView, setActiveView] = useState<View>('home');
  const { user, loading, isSupabaseConfigured } = useAuth();

  if (isSupabaseConfigured && loading) {
    return (
      <div className="loading-screen">
        <div className="loading-brand-mark">A</div>
        <p className="loading-text">Loading AURA…</p>
      </div>
    );
  }

  if (isSupabaseConfigured && !user) {
    return <AuthLanding />;
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} onNavigate={setActiveView} />
      <main className="main">
        <Topbar activeView={activeView} />
        {activeView === 'home' && <HomeView onNavigate={setActiveView} />}
        {activeView === 'wardrobe' && <WardrobeView />}
        {activeView === 'inspiration' && <InspirationView />}
        {activeView === 'packing' && <PackingView />}
        {activeView === 'occasions' && <OccasionsView />}
        {activeView === 'planner' && <PlannerView onNavigate={setActiveView} />}
        {activeView === 'stylist' && <StylistView />}
        {activeView === 'analytics' && <AnalyticsView />}
        {activeView === 'shopping' && <ShoppingView />}
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
