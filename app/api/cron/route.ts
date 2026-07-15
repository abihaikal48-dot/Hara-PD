import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized Access', { status: 401 });
  }

  try {
    // 1. Ambil batasan minimal BCI dari database
    const { data: limitSetting } = await supabase.from('settings').select('value').eq('key', 'THRESHOLD_BCI').single();
    const threshold = Number(limitSetting?.value) || 60;

    // 2. Evaluasi skor BCI
    const { data: rawObs } = await supabase.from('observasi_lapangan').select('*');
    const bciAlertList: string[] = [];

    if (rawObs && rawObs.length > 0) {
      const grouped = rawObs.reduce((acc: any, curr: any) => {
        if (!acc[curr.kode_outlet]) acc[curr.kode_outlet] = { sesuai: 0, total: 0 };
        acc[curr.kode_outlet].total++;
        if (curr.hasil === 'Sesuai Standar') acc[curr.kode_outlet].sesuai++;
        return acc;
      }, {});

      Object.keys(grouped).forEach(k => {
        const percent = Math.round((grouped[k].sesuai / grouped[k].total) * 100);
        if (percent < threshold) {
          bciAlertList.push(`<li><strong>Outlet ${k}</strong> memiliki skor BCI rendah: <span style="color:#C0392B;">${percent}%</span> (Target minimum: ${threshold}%)</li>`);
        }
      });
    }

    // 3. Kirim Email Notifikasi jika ada BCI Rendah
    if (bciAlertList.length > 0) {
      const { data: recipientEmail } = await supabase.from('settings').select('value').eq('key', 'EMAIL_SELF').single();
      const targetEmail = recipientEmail?.value || 'abihaikal48@gmail.com';

      const emailSubject = '⚠️ Warning Alert: Penurunan Indeks Perilaku (BCI) Kru';
      const emailHtml = `
        <div style="font-family: sans-serif; color: #1E1E1E; max-width: 600px; margin: 0 auto; border: 1px solid #E7E3DE; border-radius: 14px; overflow: hidden;">
          <div style="background-color: #8E2A1F; color: #ffffff; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 18px;">Peringatan Kepatuhan Operasional</h2>
          </div>
          <div style="padding: 24px;">
            <p>Halo, tim People Development,</p>
            <p>Sistem otomatis kami mendeteksi penurunan nilai Behavior Change Index (BCI) di bawah batas toleransi minimum pada beberapa lokasi:</p>
            <ul style="line-height: 1.6; padding-left: 20px;">
              ${bciAlertList.join('')}
            </ul>
            <p style="margin-top: 24px; font-size: 12px; color: #8A8580;">Saran tindak lanjut: Lakukan kunjungan mendadak untuk memantau penerapan SOP di lapangan.</p>
          </div>
        </div>
      `;

      // JIKA MENGGUNAKAN OPSI 2 (Google Apps Script Relay Bridge)
      if (process.env.GAS_MAIL_RELAY_URL) {
        const response = await fetch(process.env.GAS_MAIL_RELAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key: process.env.GAS_MAIL_RELAY_KEY,
            to: targetEmail,
            subject: emailSubject,
            htmlBody: emailHtml
          })
        });
        const gasResult = await response.json();
        if (!gasResult.ok) throw new Error("Gagal melalui GAS Relay: " + gasResult.error);
      } 
      // JIKA MENGGUNAKAN OPSI 1 (Gmail SMTP)
      else if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 465,
          secure: true,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Hara PD System" <${process.env.SMTP_USER}>`,
          to: targetEmail,
          subject: emailSubject,
          html: emailHtml
        });
      }
    }

    return NextResponse.json({ ok: true, processed: bciAlertList.length });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
