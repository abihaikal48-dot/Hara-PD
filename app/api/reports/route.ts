import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function POST(req: NextRequest) {
  try {
    const { kode_outlet, bulan, tahun } = await req.json();

    // 1. Get Outlet Data & Kru Data
    const { data: outlet } = await supabase.from('outlets').select('*').eq('kode_outlet', kode_outlet).single();
    const { data: assessment } = await supabase.from('penilaian_praktik').select('*').eq('kode_outlet', kode_outlet);

    // 2. Compile PDF in Server-side using jsPDF
    const doc = new jsPDF();
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(192, 57, 43); // Hara Chicken Red Color
    doc.text('LAPORAN EVALUASI BULANAN', 14, 20);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Divisi: People Development | Outlet: ${outlet?.nama_outlet || kode_outlet}`, 14, 28);
    doc.text(`Periode Cetak: Bulan ${bulan} / Tahun ${tahun}`, 14, 34);

    doc.line(14, 40, 196, 40);

    // Render list of assessments
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text('Riwayat Penilaian Kerja Lapangan:', 14, 52);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(11);
    let y = 62;
    assessment?.forEach((item: any, i: number) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(`${i + 1}. Kru: ${item.nama_kru} — Skor Rata-rata: ${item.skor_total}/3 (Penilai: ${item.penilai})`, 14, y);
      y += 10;
    });

    const pdfBuffer = doc.output('arraybuffer');

    // 3. Upload File to Supabase Storage Bucket ("reports")
    const fileName = `Laporan_${kode_outlet}_${bulan}_${tahun}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('reports')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 4. Get Public Signed URL
    const { data: urlData } = supabase.storage.from('reports').getPublicUrl(fileName);

    return NextResponse.json({ ok: true, url: urlData.publicUrl });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
