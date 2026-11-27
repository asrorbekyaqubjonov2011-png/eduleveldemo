import type { Metadata } from 'next';
import { EduPage } from '@/src/components/seo/EduPage';

const title = 'CEFR imtihoniga tayyorlanish — A1 dan C2 gacha | EduLevel';
const description = 'CEFR darajalari (A1–C2) bo‘yicha tayyorgarlik: ingliz tili darslari, testlar va mashqlar. EduLevel bilan CEFR imtihoniga tayyorlaning.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/cefr-tayyorgarlik' },
  openGraph: { title, description, url: '/cefr-tayyorgarlik', type: 'website', locale: 'uz_UZ', siteName: 'EduLevel' },
  twitter: { card: 'summary_large_image', title, description }
};

export default function Page() {
  return (
    <EduPage
      path="/cefr-tayyorgarlik"
      name="CEFR tayyorgarlik"
      h1="CEFR imtihoniga tayyorlanish"
      lead="CEFR (Common European Framework of Reference for Languages) tilni bilish darajasini olti bosqichda belgilaydi: A1, A2, B1, B2, C1 va C2."
      sections={[
        {
          heading: 'CEFR darajalari',
          paragraphs: ['Har bir daraja o‘quvchi qila oladigan ishlarni tasvirlaydi. Qisqacha:'],
          items: [
            'A1–A2: oddiy kundalik iboralar va tanishish.',
            'B1: tanish mavzularda asosiy fikrni tushunish va gapirish.',
            'B2: murakkabroq matnlar va mavzular bo‘yicha erkin muloqot.',
            'C1–C2: keng va murakkab matnlarni tushunish, aniq va tabiiy ifodalash.'
          ]
        },
        {
          heading: 'C1 gacha yo‘l',
          paragraphs: ['B1 dan C1 gacha bosqichma-bosqich reja, haftalik mashg‘ulot tartibi va o‘z-o‘zini tekshirish mezonlari: /cefr/c1-yol-xaritasi'],
        },
        {
          heading: 'EduLevel’da CEFR uchun',
          paragraphs: [
            'EduLevel’da CEFR Multilevel yo‘nalishi bor: darslar, test paketlari va mashqlar CEFR darajalari bo‘yicha tashkil etilgan. Har bir darsdan so‘ng vazifa va test bajariladi, keyingi dars esa oldingi dars tugagach ochiladi.'
          ]
        },
        {
          heading: 'Imtihonga qanday tayyorlanish mumkin?',
          paragraphs: [
            'Maqsad darajangizni (masalan, B1 yoki B2) aniq belgilang. Har kuni qisqa mashq va haftada bir marta to‘liq test ishlang. Xatolaringizni yozib boring va ularni haftalik takrorlashga qo‘shing.'
          ]
        }
      ]}
    />
  );
}
