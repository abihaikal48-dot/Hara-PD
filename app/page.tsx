"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart3, Users, BookOpen, AlertTriangle, Menu, X, 
  Settings as SettingsIcon, LogOut, Moon, Sun, Search, 
  Trash2, Edit, Save, Plus, FileText, Award, Calendar, HelpCircle 
} from 'lucide-react';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // App Shell States
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [selectedDivisi, setSelectedDivisi] = useState('');

  // Global Data Memory
  const [outlets, setOutlets] = useState<any[]>([]);
  const [kru, setKru] = useState<any[]>([]);
  const [bankSop, setBankSop] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>({
    totalOutlet: 0,
    totalKru: 0,
    openTna: 0,
    openComplaints: 0
  });

  // Dynamic Forms States
  const [activeTableData, setActiveTableData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Dynamic Assessment States
  const [selectedKruObj, setSelectedKruObj] = useState<any>(null);
  const [sopSteps, setSopSteps] = useState<string[]>([]);
  const [assessmentScores, setAssessmentScores] = useState<any>({});
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [evaluatorName, setEvaluatorName] = useState('Haikal');

  // Monitor Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync Dark Mode state
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch Master Data on Success Login
  useEffect(() => {
    if (session) {
      loadMasterData();
    }
  }, [session, selectedOutlet, selectedDivisi]);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Outlets
      const { data: outData } = await supabase.from('outlets').select('*');
      setOutlets(outData || []);

      // 2. Fetch Kru
      let kruQuery = supabase.from('kru').select('*');
      if (selectedOutlet) kruQuery = kruQuery.eq('kode_outlet', selectedOutlet);
      if (selectedDivisi) kruQuery = kruQuery.eq('divisi', selectedDivisi);
      const { data: krData } = await kruQuery;
      setKru(krData || []);

      // 3. Fetch SOP
      const { data: sopData } = await supabase.from('bank_sop').select('*').eq('status_aktif', 'Aktif');
      setBankSop(sopData || []);

      // 4. Calculate Quick Metrics for Dashboard
      const { count: outCount } = await supabase.from('outlets').select('*', { count: 'exact', head: true });
      const { count: kruCount } = await supabase.from('kru').select('*', { count: 'exact', head: true });
      const { count: tnaCount } = await supabase.from('tna').select('*', { count: 'exact', head: true }).neq('status', 'Selesai');
      const { count: complaintCount } = await supabase.from('kartu_keluhan').select('*', { count: 'exact', head: true }).neq('status', 'Selesai');

      setDashboardStats({
        totalOutlet: outCount || 0,
        totalKru: kruCount || 0,
        openTna: tnaCount || 0,
        openComplaints: complaintCount || 0
      });

    } catch (error) {
      console.error("Gagal memuat basis data: ", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
    }
    setIsLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Generic CRUD Navigation & Fetch Controller
  const navigateToCrud = async (tableKey: string) => {
    setCurrentPage(tableKey);
    setIsLoading(true);
    try {
      let query = supabase.from(tableKey).select('*');
      const { data, error } = await query;
      if (error) throw error;
      setActiveTableData(data || []);
    } catch (err: any) {
      alert("Error memuat tabel: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generic Save Logic
  const handleSaveForm = async (tableKey: string) => {
    setIsLoading(true);
    try {
      if (editId) {
        const { error } = await supabase.from(tableKey).update(formData).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(tableKey).insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setFormData({});
      setEditId(null);
      navigateToCrud(tableKey);
    } catch (err: any) {
      alert("Gagal menyimpan data: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generic Delete Logic (Safe Permanent Delete)
  const handleDeleteItem = async (tableKey: string, id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini secara permanen dari Supabase?")) return;
    setIsLoading(true);
    try {
      const { error } = await supabase.from(tableKey).delete().eq('id', id);
      if (error) throw error;
      navigateToCrud(tableKey);
    } catch (err: any) {
      alert("Gagal menghapus: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic Checklists Loader (SOP Integration)
  const handleSopChange = (sopId: string) => {
    const selectedSop = bankSop.find(s => s.id === sopId);
    if (selectedSop) {
      const steps = selectedSop.langkah_langkah.split('\n').filter((s: string) => s.trim());
      setSopSteps(steps);
      const initialScores: any = {};
      steps.forEach((_step: string, i: number) => {
        initialScores[i] = 1; // Default: 'Belum' / 'Tidak'
      });
      setAssessmentScores(initialScores);
    }
  };

  // Auto-Populate Kru Details
  const handleKruSelection = (namaKru: string) => {
    const selected = kru.find(k => k.nama_kru === namaKru);
    if (selected) {
      setSelectedKruObj(selected);
      setFormData((prev: any) => ({
        ...prev,
        nama_kru: selected.nama_kru,
        divisi: selected.divisi,
        kode_outlet: selected.kode_outlet
      }));
    }
  };

  // Save Penilaian Praktik
  const submitPraktikAssessment = async () => {
    if (!selectedKruObj || sopSteps.length === 0) {
      alert("Pilih kru dan SOP terlebih dahulu.");
      return;
    }
    const scoresArray = Object.keys(assessmentScores).map(key => ({
      langkah: sopSteps[parseInt(key)],
      skor: assessmentScores[key]
    }));
    const total = scoresArray.reduce((acc, curr) => acc + curr.skor, 0);
    const average = +(total / sopSteps.length).toFixed(2);

    setIsLoading(true);
    const { error } = await supabase.from('penilaian_praktik').insert([{
      nama_kru: selectedKruObj.nama_kru,
      kode_outlet: selectedKruObj.kode_outlet,
      judul_sop: "SOP Terpilih",
      skor_total: average,
      detail_skor_langkah: scoresArray,
      catatan: assessmentNotes,
      penilai: evaluatorName
    }]);

    setIsLoading(false);
    if (error) {
      alert("Gagal menyimpan penilaian: " + error.message);
    } else {
      alert("Penilaian berhasil disimpan secara real-time!");
      setCurrentPage('dashboard');
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#4A1810] to-[#1B0F0C] p-4">
        <div className="w-full max-w-md bg-white rounded-xlarge p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-hara-redDark via-hara-yellow to-hara-red" />
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-tr from-hara-yellow to-hara-red mx-auto flex items-center justify-center font-bold text-white text-2xl shadow-md">
              H
            </div>
            <h1 className="text-2xl font-bold mt-4 text-hara-ink">Hara Chicken</h1>
            <p className="text-sm text-hara-muted uppercase tracking-wider font-semibold">People Development System</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-hara-muted uppercase mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg focus:outline-none focus:ring-2 focus:ring-hara-red/20 text-hara-ink"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-hara-muted uppercase mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg focus:outline-none focus:ring-2 focus:ring-hara-red/20 text-hara-ink"
                required
              />
            </div>
            {loginError && (
              <div className="p-3 bg-red-100 text-hara-bad rounded-lg text-sm font-semibold">
                ⚠️ {loginError}
              </div>
            )}
            <button 
              type="submit" 
              className="w-full p-3 bg-hara-red hover:bg-hara-redDark text-white font-bold rounded-lg shadow-md transition-colors duration-200"
              disabled={isLoading}
            >
              {isLoading ? 'Memeriksa...' : 'Masuk'}
            </button>
          </form>
          <div className="text-center text-xs text-hara-muted mt-6">
            HARA-PD SYSTEM V2.0 · Portal Penonaktifan & Evaluasi
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-hara-bg dark:bg-[#181614] text-hara-ink dark:text-[#F1EDE9]">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-[#221F1C] border-b border-hara-border dark:border-[#332F2B] z-20">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-hara-red flex items-center justify-center font-black text-white text-lg">
            H
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight">Hara Chicken</h1>
            <p className="text-[9px] uppercase tracking-wider text-hara-muted">PD System Pro</p>
          </div>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-hara-ink dark:text-white">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar Shell */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-[#8E2A1F] to-[#C0392B] text-white p-6 z-30 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:static flex flex-col`}>
        <div className="hidden md:flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#FFDD7A] to-hara-yellow flex items-center justify-center font-extrabold text-[#8E2A1F] text-xl shadow-lg">
            H
          </div>
          <div>
            <h1 className="font-black text-base leading-tight">Hara Chicken</h1>
            <p className="text-[9px] uppercase tracking-widest text-white/80">PD System Pro</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
          <div className="text-[10px] uppercase font-bold text-white/50 px-3 mb-2 tracking-widest">Utama</div>
          <button 
            onClick={() => { setCurrentPage('dashboard'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'dashboard' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <BarChart3 size={18} /> Dashboard
          </button>

          <div className="text-[10px] uppercase font-bold text-white/50 px-3 py-4 tracking-widest">Siklus Pengembangan</div>
          <button 
            onClick={() => { navigateToCrud('tna'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'tna' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <AlertTriangle size={18} /> Training Need (TNA)
          </button>
          <button 
            onClick={() => { navigateToCrud('rencana_training'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'rencana_training' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <Calendar size={18} /> Rencana Training
          </button>
          <button 
            onClick={() => { navigateToCrud('observasi_lapangan'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'observasi_lapangan' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <Users size={18} /> Observasi Lapangan
          </button>
          <button 
            onClick={() => { navigateToCrud('coaching_log'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'coaching_log' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <BookOpen size={18} /> Coaching Log
          </button>

          <div className="text-[10px] uppercase font-bold text-white/50 px-3 py-4 tracking-widest">Asesmen Mandiri</div>
          <button 
            onClick={() => { setCurrentPage('praktik'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'praktik' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <Award size={18} /> Penilaian Praktik
          </button>
          
          <div className="text-[10px] uppercase font-bold text-white/50 px-3 py-4 tracking-widest">Sistem</div>
          <button 
            onClick={() => { navigateToCrud('outlets'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'outlets' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <SettingsIcon size={18} /> Master Outlet
          </button>
          <button 
            onClick={() => { navigateToCrud('kru'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'kru' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <Users size={18} /> Master Kru
          </button>
          <button 
            onClick={() => { navigateToCrud('bank_sop'); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${currentPage === 'bank_sop' ? 'bg-white text-[#8E2A1F] shadow-md' : 'hover:bg-white/10'}`}
          >
            <FileText size={18} /> Bank SOP
          </button>
        </nav>

        {/* User Status Card */}
        <div className="pt-4 border-t border-white/20 flex flex-col gap-2">
          <div className="text-xs">
            <p className="font-extrabold opacity-90">{session.user.email}</p>
            <p className="text-[10px] opacity-75">Supervisor / Evaluator</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 hover:bg-white/10 rounded-lg">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 p-2 hover:bg-white/10 rounded-lg text-xs font-bold text-yellow-300">
              <LogOut size={16} /> Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="hidden md:flex items-center justify-between p-6 bg-white dark:bg-[#221F1C] border-b border-hara-border dark:border-[#332F2B]">
          <div>
            <h2 className="text-xl font-bold capitalize">{currentPage.replace('_', ' ')}</h2>
            <p className="text-xs text-hara-muted">Sistem Terintegrasi Pengembangan Kru — Hara Chicken</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Filter Global */}
            <select 
              value={selectedOutlet} 
              onChange={e => setSelectedOutlet(e.target.value)}
              className="p-2 border border-hara-border dark:border-[#3A3530] rounded-lg bg-hara-bg dark:bg-[#221F1C] text-sm focus:outline-none"
            >
              <option value="">Semua Outlet</option>
              {outlets.map(o => (
                <option key={o.id} value={o.kode_outlet}>{o.nama_outlet}</option>
              ))}
            </select>
            <select 
              value={selectedDivisi} 
              onChange={e => setSelectedDivisi(e.target.value)}
              className="p-2 border border-hara-border dark:border-[#3A3530] rounded-lg bg-hara-bg dark:bg-[#221F1C] text-sm focus:outline-none"
            >
              <option value="">Semua Divisi</option>
              <option>Kitchen</option>
              <option>Helper</option>
              <option>Geprek</option>
              <option>Kasir</option>
            </select>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-hara-border border-t-hara-red rounded-full animate-spin" />
              <p className="text-sm text-hara-muted">Menghubungkan ke basis data Supabase...</p>
            </div>
          ) : (
            <div className="animate-fade-in space-y-6">
              
              {/* PAGE: DASHBOARD */}
              {currentPage === 'dashboard' && (
                <>
                  <div className="bg-gradient-to-r from-hara-redDark to-[#D9583F] text-white p-6 rounded-large shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <span className="text-[10px] uppercase font-bold bg-white/25 px-2 py-1 rounded-md tracking-widest">System Operational</span>
                      <h3 className="text-2xl font-black mt-2">Selamat Datang di Portal PD Pro 👋</h3>
                      <p className="text-sm opacity-90 mt-1 max-w-xl">
                        Semua data telah bermigrasi secara aman ke database Supabase Cloud. Anda dapat memantau observasi perilaku dan melacak kompetensi dengan performa responsif.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentPage('praktik')} className="px-4 py-2 bg-hara-yellow text-[#8E2A1F] font-bold text-xs uppercase tracking-wider rounded-lg hover:shadow-md transition">
                        🛠️ Mulai Observasi SOP
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-[#221F1C] p-5 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm">
                      <p className="text-xs text-hara-muted font-bold uppercase tracking-wider">Total Outlet</p>
                      <h4 className="text-3xl font-black text-hara-red mt-2">{dashboardStats.totalOutlet}</h4>
                      <p className="text-[10px] text-hara-muted mt-1">Outlet Terdaftar</p>
                    </div>
                    <div className="bg-white dark:bg-[#221F1C] p-5 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm">
                      <p className="text-xs text-hara-muted font-bold uppercase tracking-wider">Kru Aktif</p>
                      <h4 className="text-3xl font-black text-[#2E7D32] mt-2">{dashboardStats.totalKru}</h4>
                      <p className="text-[10px] text-hara-muted mt-1">Personel Terdata</p>
                    </div>
                    <div className="bg-white dark:bg-[#221F1C] p-5 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm">
                      <p className="text-xs text-hara-muted font-bold uppercase tracking-wider">TNA Terbuka</p>
                      <h4 className="text-3xl font-black text-hara-yellow mt-2">{dashboardStats.openTna}</h4>
                      <p className="text-[10px] text-hara-muted mt-1">Butuh Tindakan Segera</p>
                    </div>
                    <div className="bg-white dark:bg-[#221F1C] p-5 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm">
                      <p className="text-xs text-hara-muted font-bold uppercase tracking-wider">Keluhan Aktif</p>
                      <h4 className="text-3xl font-black text-red-600 mt-2">{dashboardStats.openComplaints}</h4>
                      <p className="text-[10px] text-hara-muted mt-1">Dalam Penyelidikan</p>
                    </div>
                  </div>

                  {/* Quick Shortcut and Dashboard Guide */}
                  <div className="bg-white dark:bg-[#221F1C] p-6 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm space-y-4">
                    <h4 className="font-extrabold text-base flex items-center gap-2">📌 Panduan Navigasi Cepat</h4>
                    <p className="text-xs text-hara-muted">
                      Sebagai evaluator, Anda dapat menambahkan data Master Kru dan langsung melakukan audit kepatuhan perilaku di tab <strong>Penilaian Praktik</strong>. Data dihitung instan tanpa perlu sinkronisasi manual.
                    </p>
                  </div>
                </>
              )}

              {/* PAGE: PENILAIAN PRAKTIK (SOP CHECKLISTS INTEGRATION) */}
              {currentPage === 'praktik' && (
                <div className="bg-white dark:bg-[#221F1C] p-6 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm space-y-6">
                  <div className="border-b border-hara-border pb-4">
                    <h3 className="text-lg font-extrabold">Form Penilaian Praktik (Kepatuhan SOP)</h3>
                    <p className="text-xs text-hara-muted">Penilaian objektif berdasarkan butir-butir kerja SOP yang tersimpan dalam Bank SOP.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Nama Kru *</label>
                      <select 
                        onChange={e => handleKruSelection(e.target.value)}
                        className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#221F1C]"
                      >
                        <option value="">-- Pilih Kru --</option>
                        {kru.map(k => (
                          <option key={k.id} value={k.nama_kru}>{k.nama_kru} ({k.divisi})</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Pilih SOP Acuan *</label>
                      <select 
                        onChange={e => handleSopChange(e.target.value)}
                        className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#221F1C]"
                      >
                        <option value="">-- Pilih SOP --</option>
                        {bankSop.map(s => (
                          <option key={s.id} value={s.id}>{s.judul_sop}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase mb-1">Nama Penilai / Evaluator</label>
                      <input 
                        type="text" 
                        value={evaluatorName} 
                        onChange={e => setEvaluatorName(e.target.value)}
                        className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#221F1C]"
                      />
                    </div>
                  </div>

                  {/* SOP Steps Grid Checklist */}
                  {sopSteps.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-hara-border">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold">
                        📋 Silakan amati kerja kru secara cermat dan berikan penilaian pada setiap langkah SOP di bawah ini:
                      </div>

                      <div className="space-y-2">
                        {sopSteps.map((step, idx) => (
                          <div key={idx} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-hara-bg dark:bg-[#1C1A18] rounded-lg gap-2 border border-hara-border">
                            <span className="text-xs font-semibold">{idx + 1}. {step}</span>
                            <div className="flex gap-1">
                              {[
                                { val: 1, label: 'Belum' },
                                { val: 2, label: 'Cukup' },
                                { val: 3, label: 'Kompeten' }
                              ].map(scoreObj => (
                                <button
                                  key={scoreObj.val}
                                  type="button"
                                  onClick={() => setAssessmentScores((prev: any) => ({ ...prev, [idx]: scoreObj.val }))}
                                  className={`px-3 py-1 text-xs font-bold rounded ${assessmentScores[idx] === scoreObj.val ? 'bg-hara-red text-white' : 'bg-white dark:bg-[#221F1C] border border-hara-border'}`}
                                >
                                  {scoreObj.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold uppercase">Catatan Tambahan Evaluasi</label>
                        <textarea 
                          value={assessmentNotes} 
                          onChange={e => setAssessmentNotes(e.target.value)}
                          rows={3}
                          placeholder="Misal: Perlu peningkatan dalam kecepatan dusting..."
                          className="w-full p-3 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#221F1C]"
                        />
                      </div>

                      <div className="flex justify-end pt-4 border-t border-hara-border">
                        <button 
                          onClick={submitPraktikAssessment}
                          className="px-6 py-3 bg-[#2E7D32] hover:bg-green-800 text-white font-bold rounded-lg shadow"
                        >
                          💾 Simpan Hasil Penilaian Objektif
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DYNAMIC CRUD TABLE (OUTLETS, KRU, TNA, ETC) */}
              {['tna', 'rencana_training', 'observasi_lapangan', 'coaching_log', 'outlets', 'kru', 'bank_sop'].includes(currentPage) && (
                <div className="bg-white dark:bg-[#221F1C] p-6 rounded-large border border-hara-border dark:border-[#332F2B] shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-hara-border pb-4">
                    <div>
                      <h3 className="text-lg font-extrabold capitalize">Data Tab {currentPage.replace('_', ' ')}</h3>
                      <p className="text-xs text-hara-muted">Perubahan data di bawah ini langsung ter-sinkronisasi ke cloud Supabase secara real-time.</p>
                    </div>
                    <button 
                      onClick={() => { setEditId(null); setFormData({}); setIsModalOpen(true); }}
                      className="flex items-center gap-2 px-4 py-2 bg-hara-red text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-hara-redDark"
                    >
                      <Plus size={16} /> Tambah Baru
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-hara-bg dark:bg-[#2A2521] text-hara-redDark dark:text-hara-yellow uppercase tracking-wider font-bold">
                          <th className="p-3">ID / Deskripsi</th>
                          <th className="p-3">Info Tambahan</th>
                          <th className="p-3">Dibuat</th>
                          <th className="p-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hara-border dark:divide-[#332F2B]">
                        {activeTableData.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-hara-muted">Belum ada baris data.</td>
                          </tr>
                        ) : (
                          activeTableData.map(item => (
                            <tr key={item.id} className="hover:bg-hara-bg/50 dark:hover:bg-white/5">
                              <td className="p-3">
                                <div className="font-extrabold text-hara-ink dark:text-white">
                                  {item.nama_outlet || item.nama_kru || item.judul_sop || item.topik || item.deskripsi_gap || item.id.substring(0, 8)}
                                </div>
                                <div className="text-[10px] text-hara-muted">
                                  {item.kode_outlet || item.divisi || item.kode_sop || 'Kategori Umum'}
                                </div>
                              </td>
                              <td className="p-3 text-hara-muted">
                                {item.alamat || item.catatan || item.status || item.rencana_tindak_lanjut || '-'}
                              </td>
                              <td className="p-3 text-hara-muted">
                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                              </td>
                              <td className="p-3 flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => { setEditId(item.id); setFormData(item); setIsModalOpen(true); }}
                                  className="p-1.5 border border-hara-border rounded hover:bg-hara-bg text-blue-500"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteItem(currentPage, item.id)}
                                  className="p-1.5 border border-hara-border rounded hover:bg-red-50 text-red-500"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </main>

      {/* DYNAMIC MODAL COMPONENT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#221F1C] w-full max-w-lg rounded-xlarge p-6 shadow-2xl border border-hara-border animate-fade-in relative">
            <h3 className="text-base font-bold uppercase tracking-wider mb-2 text-hara-redDark dark:text-hara-yellow">
              {editId ? 'Ubah Record' : 'Input Record Baru'} — {currentPage.replace('_', ' ')}
            </h3>
            <p className="text-[11px] text-hara-muted mb-4">
              Lengkapi isian formulir di bawah ini dengan valid. Data akan langsung terhubung ke database Supabase Cloud.
            </p>

            {/* Render inputs dynamically depending on current page */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {currentPage === 'outlets' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Kode Outlet *</label>
                    <input 
                      type="text" 
                      value={formData.kode_outlet || ''} 
                      onChange={e => setFormData({ ...formData, kode_outlet: e.target.value })}
                      placeholder="Contoh: HC-BTL01"
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Nama Outlet *</label>
                    <input 
                      type="text" 
                      value={formData.nama_outlet || ''} 
                      onChange={e => setFormData({ ...formData, nama_outlet: e.target.value })}
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Alamat Outlet</label>
                    <textarea 
                      value={formData.alamat || ''} 
                      onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                    />
                  </div>
                </>
              )}

              {currentPage === 'kru' && (
                <>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Nama Lengkap Kru *</label>
                    <input 
                      type="text" 
                      value={formData.nama_kru || ''} 
                      onChange={e => setFormData({ ...formData, nama_kru: e.target.value })}
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Divisi Pekerjaan *</label>
                    <select 
                      value={formData.divisi || ''} 
                      onChange={e => setFormData({ ...formData, divisi: e.target.value })}
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                      required
                    >
                      <option value="">-- Pilih Divisi --</option>
                      <option>Kitchen</option>
                      <option>Helper</option>
                      <option>Geprek</option>
                      <option>Kasir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Kode Outlet Penempatan *</label>
                    <select 
                      value={formData.kode_outlet || ''} 
                      onChange={e => setFormData({ ...formData, kode_outlet: e.target.value })}
                      className="w-full p-2.5 border border-hara-border rounded-lg bg-hara-bg dark:bg-[#1C1A18]"
                      required
                    >
                      <option value="">-- Pilih Outlet --</option>
                      {outlets.map(o => (
                        <option key={o.id} value={o.kode_outlet}>{o.nama_outlet}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Inputs generic backup */}
              {!['outlets', 'kru'].includes(currentPage) && (
                <div className="p-4 bg-hara-bg dark:bg-[#1C1A18] text-center rounded-lg text-xs font-semibold text-hara-muted">
                  Skema form dinamis lainnya akan merender input teks secara otomatis.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-6 border-t border-hara-border">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="px-4 py-2 border border-hara-border rounded-lg text-xs font-bold text-hara-muted hover:bg-hara-bg"
              >
                Batal
              </button>
              <button 
                onClick={() => handleSaveForm(currentPage)}
                className="px-4 py-2 bg-hara-red hover:bg-hara-redDark text-white font-bold text-xs uppercase rounded-lg shadow-md"
              >
                💾 Simpan Ke Cloud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
