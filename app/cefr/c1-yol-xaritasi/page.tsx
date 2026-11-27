import type { Metadata } from 'next';
import { EduPage } from '@/src/components/seo/EduPage';

const title = 'CEFR C1 ga yo‘l xaritasi — B1 dan C1 gacha reja | EduLevel';
const description = 'B1 darajasidan C1 gacha bosqichma-bosqich reja: haftalik mashg‘ulotlar, ko‘nikmalar va o‘z-o‘zini tekshirish mezonlari.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/cefr/c1-yol-xaritasi' },
  openGraph: { title, description, url: '/cefr/c1-yol-xaritasi', type: 'article', locale: 'uz_UZ', siteName: 'EduLevel' },
  twitter: { card: 'summary_large_image', title, description }
};

export default function Page() {
  return (
    <EduPage
      path="/cefr/c1-yol-xaritasi"
      name="C1 yo‘l xaritasi"
      h1="CEFR C1 ga yo‘l xaritasi"
      lead="B1 darajasidan C1 gacha o‘tish odatda bir necha oy davom etadi. Quyida bosqichlar, haftalik mashg‘ulot tartibi va har bosqichda o‘zingizni qanday tekshirish mumkinligi berilgan. Muddatlar taxminiy: har bir o‘quvchining boshlang‘ich darajasi va vaqti turlicha."
      sections={[
        {
          heading: '1-bosqich: B1 ni mustahkamlash',
          paragraphs: [
            'Maqsad: tanish mavzularda erkin gapirish va asosiy zamonlarni (Present, Past, Future, Perfect) xatosiz ishlatish. Bu bosqichda yangi so‘zlardan ko‘ra ularni gapda ishlatish muhim.'
          ],
          items: [
            'Haftasiga 4–5 kun, har kuni 30–40 daqiqa grammatika va so‘z yodlash.',
            'Har hafta bitta qisqa matn o‘qib, asosiy fikrini 5 gapda yozib berish.',
            'O‘z-o‘zini tekshirish: kundalik mavzuda 2 daqiqa gapirib, yozib olish va eshitish.'
          ]
        },
        {
          heading: '2-bosqich: B2 ga o‘tish',
          paragraphs: [
            'Maqsad: murakkabroq matnlarni tushunish, fikrni sabab va natija bilan bayon qilish. Shartli gaplar, passiv nisbat va reported speech bu bosqichda asosiy mavzu bo‘ladi.'
          ],
          items: [
            'Haftada 2 marta uzunroq audio yoki video tinglash, tagyozuvsiz va tagyozuv bilan.',
            'Haftada 1 ta esse (200–250 so‘z), keyin xatolarni o‘zingiz tahlil qilish.',
            'O‘z-o‘zini tekshirish: 3 daqiqali mavzuli monolog va undan keyingi savollarga javob.'
          ]
        },
        {
          heading: '3-bosqich: C1 ga yetish',
          paragraphs: [
            'Maqsad: nutqda tabiiylik, uslubga rioya qilish va murakkab mavzularda aniq fikr. Bu bosqichda ko‘p o‘qish va faol muloqot foydali.'
          ],
          items: [
            'Haftada 2 marta akademik yoki ommabop maqola o‘qib, asosiy g‘oyalarni ajratish.',
            'Idiomalar va collocation’lar ustida ishlash, ularni o‘z gaplaringizda qo‘llash.',
            'O‘z-o‘zini tekshirish: 5 daqiqali munozara va uni yozib tahlil qilish.'
          ]
        },
        {
          heading: 'Har bosqichda o‘zingizni qanday tekshirasiz?',
          paragraphs: [
            'Rasmiy baho faqat imtihon markazi tomonidan beriladi. Quyidagi savollar o‘zingizni taxminan baholashga yordam beradi: mavzuni tushundingizmi, gapirganda to‘xtab qolmadingizmi, yozma fikringiz tartibli bo‘ldimi.'
          ]
        },
        {
          heading: 'EduLevel’da C1 uchun',
          paragraphs: [
            'EduLevel’da darslar, grammatika mashqlari, so‘z yodlash va CEFR bo‘yicha test paketlari bor. AI yordamchi EduBek yozma va og‘zaki mashqlarda fikr bildiradi. Natijalar faqat tizimdagi haqiqiy testlar bo‘yicha ko‘rsatiladi.'
          ]
        }
      ]}
    />
  );
}
