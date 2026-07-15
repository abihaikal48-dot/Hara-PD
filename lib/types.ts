export interface Outlet {
  id?: string;
  kode_outlet: string;
  nama_outlet: string;
  alamat?: string;
  kepala_outlet?: string;
  area_supervisor?: string;
  status_aktif: string;
}

export interface Kru {
  id?: string;
  nama_kru: string;
  divisi: 'Kitchen' | 'Helper' | 'Geprek' | 'Kasir';
  kode_outlet: string;
  tanggal_masuk?: string;
  status_aktif: string;
  catatan?: string;
}

export interface Sop {
  id?: string;
  kode_sop: string;
  divisi: string;
  judul_sop: string;
  langkah_langkah: string;
  referensi_modul?: string;
  status_aktif: string;
}
