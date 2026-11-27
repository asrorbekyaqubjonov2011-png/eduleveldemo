import type { Metadata } from 'next';
import { EduPage } from '@/src/components/seo/EduPage';

const title = 'IELTS ga tayyorgarlik — Listening, Reading, Writing, Speaking | EduLevel';
const description = 'IELTS imtihoniga tayyorlaning: to‘rt ko‘nikma bo‘yicha video darslar, mock testlar, Speaking va Writing mashqlari hamda AI yordamchi. EduLevel bilan IELTS tayyorgarlik.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/ielts-tayyorgarlik' },
  openGraph: { title, description, url: '/ielts-tayyorgarlik', type: 'website', locale: 'uz_UZ', siteName: 'EduLevel' },
  twitter: { card: 'summary_large_image', title, description }
};

export default function Page() {
  return (
    <EduPage
      path="/ielts-tayyorgarlik"
      name="IELTS tayyorgarlik"
      h1="IELTS ga tayyorgarlik"
      lead="IELTS imtihoni to‘rt qismdan iborat: Listening, Reading, Writing va Speaking. EduLevel har bir ko‘nikma bo‘yicha alohida mashq beradi."
      sections={[
        {
          heading: 'IELTS imtihoni qanday tuzilgan?',
          paragraphs: [
            'IELTS natijalari 0 dan 9 gacha band (band score) bilan ko‘rsatiladi. Imtihon Academic va General Training variantlarida bo‘ladi.'
          ],
          items: [
            'Listening: 4 ta audio, 40 ta savol, taxminan 30 daqiqa va javoblarni ko‘chirish uchun qo‘shimcha 10 daqiqa.',
            'Reading: 60 daqiqa, 40 ta savol, matnlarning yozma tahlili.',
            'Writing: 60 daqiqa, ikki vazifa (Task 1 kamida 150 so‘z, Task 2 kamida 250 so‘z).',
            'Speaking: 11–14 daqiqa, uch qism: tanishuv, mavzuli gap va muhokama.'
          ]
        },
        {
          heading: 'EduLevel’da IELTS uchun nima bor?',
          paragraphs: ['Saytdagi mashqlar va vositalar IELTS tayyorgarlik uchun tuzilgan:'],
          items: [
            'Video darslar: har bir darsda konspekt, vazifa va test.',
            'Mock testlar: imtihon formatiga yaqin sinovlar va natijalar tahlili.',
            'Speaking mashqlari: ovozingizni yozib, o‘zingizni tinglash va baholash.',
            'Writing mashqlari: insho qoralamasini saqlash va qayta ishlash.',
            'EduBek AI yordamchisi: savollarga javob va mashq rejimlari.',
            'Telegram bot: dars kodi bilan darsni ochish va kunlik eslatmalar.'
          ]
        },
        {
          heading: 'Tayyorgarlikni qayerdan boshlash kerak?',
          paragraphs: [
            'Avval o‘zingizning hozirgi darajangizni va maqsad balingizni aniqlang. Keyin har hafta to‘rt ko‘nikmaga vaqt ajrating. Imtihon sanasidan oldin kamida bir marta to‘liq mock test ishlab, natijani tahlil qiling.'
          ]
        }
      ]}
    />
  );
}
