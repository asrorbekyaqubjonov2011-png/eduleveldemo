import type { Metadata } from 'next';
import { EduPage } from '@/src/components/seo/EduPage';

const title = 'Ingliz tili darslari online — IELTS, CEFR va General English | EduLevel';
const description = 'Ingliz tilini online o‘rganing: IELTS, CEFR va General English yo‘nalishlari bo‘yicha video darslar, mashqlar va AI yordamchi. EduLevel.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/ingliz-tili-darslari' },
  openGraph: { title, description, url: '/ingliz-tili-darslari', type: 'website', locale: 'uz_UZ', siteName: 'EduLevel' },
  twitter: { card: 'summary_large_image', title, description }
};

export default function Page() {
  return (
    <EduPage
      path="/ingliz-tili-darslari"
      name="Ingliz tili darslari"
      h1="Ingliz tilini online o‘rganish"
      lead="EduLevel uch yo‘nalishda ingliz tili darslarini beradi: IELTS, CEFR va General English & Fluency."
      sections={[
        {
          heading: 'Yo‘nalishlar',
          paragraphs: ['Har bir yo‘nalish o‘z maqsadingizga mos keladi:'],
          items: [
            'IELTS Academic va General Training: imtihonga tayyorgarlik.',
            'CEFR Multilevel: A1 dan C2 gacha bo‘lgan darajalar bo‘yicha.',
            'General English & Fluency: kundalik muloqot va erkin gapirish.'
          ]
        },
        {
          heading: 'Dars qanday o‘tadi?',
          paragraphs: [
            'Har bir dars video, konspekt, vazifa va testdan iborat. Darslar ketma-ket ochiladi: keyingi dars oldingi darsni tugatgandan keyin ochiladi. Kursni saytda yoki Telegram bot orqali davom ettirish mumkin: dars kodini botga yozsangiz, dars havolasini olasiz.'
          ]
        },
        {
          heading: 'Yordamchi vositalar',
          paragraphs: [
            'EduBek AI yordamchisi savollarga javob beradi va mashqlarda yordam beradi. Raqamli kutubxonada qo‘shimcha materiallar bor.'
          ]
        }
      ]}
    />
  );
}
