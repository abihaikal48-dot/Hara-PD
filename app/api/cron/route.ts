import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req: NextRequest) {
  // Menjaga keamanan API dari eksekusi liar
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized Access', { status: 401 });
  }

  try {
    // 1. Ambil batasan minimal BCI dari database
    const { data: limitSetting } = await supabase.from('settings').select('value').eq('key', 'THRESHOLD_BCI').single();
    const threshold = Number(limitSetting?.value) || 60;

    // 2. Hitung statistik performa observasi yang rendah
    const { data: rawObs } = await supabase.from('observasi_lapangan').select('*');
    const bciAlertList: string[] = [];

    // Mengelompokkan data observasi untuk mengevaluasi BCI
    if (rawObs) {
      const grouped = rawObs.reduce((acc: any, curr: any) => {
        if (!acc[curr.kode_outlet]) acc[curr.kode_outlet] = { sesuai: 0, total: 0 };
        acc[curr.kode_outlet].total++;
        if (curr.hasil === 'Sesuai Standar') acc[curr.kode_outlet].sesuai++;
        return acc;
      }, {});

      Object.keys(grouped).forEach(k => {
        const percent = Math.round((grouped[k].sesuai / grouped[k].total) * 100);
        if (percent < threshold) {
          bciAlertList.push(`Outlet ${k} memiliki skor BCI rendah: ${percent}% (Batas aman: ${threshold}%)`);
        }
      });
    }

    // 3. Kirim Email Notifikasi jika ada BCI Rendah
    if (bciAlertList.length > 0) {
      const { data: recipientEmail } = await supabase.from('settings').select('value').eq('key', 'EMAIL_SELF').single();
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: '"Hara PD Automatic Alert" <no-reply@harachicken.com>',
        to: recipientEmail?.value || 'abihaikal48@gmail.com',
        subject: '⚠️ Warning Alert: Hasil BCI Outlet Menurun',
        html: `
          <h3>Deteksi Penurunan Kinerja Lapangan</h3>
          <p>Sistem mendeteksi beberapa outlet membutuhkan pendampingan kerja segera:</p>
          <ul>
            ${bciAlertList.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <p>Harap jadwalkan peninjauan ulang SOP sesegera mungkin.</p>
        `
      });
    }

    return NextResponse.json({ ok: true, processed: bciAlertList.length });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
