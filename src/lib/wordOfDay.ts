/** One word a day, the same for everyone that day. Each has its meaning and an example. */
export interface DayWord {
  en: string;
  ipa: string;
  uz: string;
  example: string;
  exampleUz: string;
  level: 'B1' | 'B2' | 'C1';
}

export const WORDS: DayWord[] = [
  { en: 'reliable', ipa: '/rɪˈlaɪəbl/', uz: 'ishonchli', example: 'She is a reliable friend.', exampleUz: 'U ishonchli do‘st.', level: 'B1' },
  { en: 'achieve', ipa: '/əˈtʃiːv/', uz: 'erishmoq', example: 'You can achieve your goals.', exampleUz: 'Siz maqsadlaringizga erisha olasiz.', level: 'B1' },
  { en: 'improve', ipa: '/ɪmˈpruːv/', uz: 'yaxshilamoq', example: 'I want to improve my speaking.', exampleUz: 'Men gapirishimni yaxshilamoqchiman.', level: 'B1' },
  { en: 'challenge', ipa: '/ˈtʃælɪndʒ/', uz: 'qiyin vazifa, sinov', example: 'Learning English is a challenge.', exampleUz: 'Ingliz tilini o‘rganish — sinov.', level: 'B1' },
  { en: 'efficient', ipa: '/ɪˈfɪʃnt/', uz: 'samarali', example: 'This is an efficient way to study.', exampleUz: 'Bu o‘qishning samarali usuli.', level: 'B2' },
  { en: 'consequence', ipa: '/ˈkɒnsɪkwəns/', uz: 'oqibat', example: 'Every action has a consequence.', exampleUz: 'Har bir harakatning oqibati bor.', level: 'B2' },
  { en: 'mitigate', ipa: '/ˈmɪtɪɡeɪt/', uz: 'yumshatmoq', example: 'We must mitigate the risks.', exampleUz: 'Xavflarni kamaytirishimiz kerak.', level: 'C1' },
  { en: 'substantial', ipa: '/səbˈstænʃl/', uz: 'sezilarli, katta', example: 'There was a substantial change.', exampleUz: 'Sezilarli o‘zgarish bo‘ldi.', level: 'B2' },
  { en: 'perspective', ipa: '/pəˈspektɪv/', uz: 'nuqtai nazar', example: 'Try to see it from another perspective.', exampleUz: 'Uni boshqa nuqtai nazardan ko‘ring.', level: 'B2' },
  { en: 'convenient', ipa: '/kənˈviːniənt/', uz: 'qulay', example: 'Is this time convenient for you?', exampleUz: 'Bu vaqt sizga qulaymi?', level: 'B1' },
  { en: 'ambiguous', ipa: '/æmˈbɪɡjuəs/', uz: 'noaniq, ikki ma’noli', example: 'The question was ambiguous.', exampleUz: 'Savol noaniq edi.', level: 'C1' },
  { en: 'demonstrate', ipa: '/ˈdemənstreɪt/', uz: 'ko‘rsatmoq, isbotlamoq', example: 'The results demonstrate his skill.', exampleUz: 'Natijalar uning mahoratini ko‘rsatadi.', level: 'B2' },
  { en: 'sustainable', ipa: '/səˈsteɪnəbl/', uz: 'barqaror, uzoq muddatli', example: 'We need sustainable energy.', exampleUz: 'Bizga barqaror energiya kerak.', level: 'B2' },
  { en: 'reluctant', ipa: '/rɪˈlʌktənt/', uz: 'istamay turgan', example: 'He was reluctant to speak.', exampleUz: 'U gapirishni istamasdi.', level: 'C1' },
  { en: 'determine', ipa: '/dɪˈtɜːmɪn/', uz: 'aniqlamoq, belgilamoq', example: 'Hard work will determine your success.', exampleUz: 'Mehnat muvaffaqiyatingizni belgilaydi.', level: 'B2' },
  { en: 'thorough', ipa: '/ˈθʌrə/', uz: 'puxta, to‘liq', example: 'She did a thorough check.', exampleUz: 'U puxta tekshirdi.', level: 'B2' },
  { en: 'overcome', ipa: '/ˌəʊvəˈkʌm/', uz: 'yengib o‘tmoq', example: 'He overcame his fear.', exampleUz: 'U qo‘rquvini yengdi.', level: 'B1' },
  { en: 'implement', ipa: '/ˈɪmplɪment/', uz: 'amalga oshirmoq', example: 'They will implement the plan.', exampleUz: 'Ular rejani amalga oshiradi.', level: 'B2' },
  { en: 'resilient', ipa: '/rɪˈzɪliənt/', uz: 'chidamli', example: 'Children are often very resilient.', exampleUz: 'Bolalar ko‘pincha juda chidamli.', level: 'C1' },
  { en: 'opportunity', ipa: '/ˌɒpəˈtjuːnəti/', uz: 'imkoniyat', example: 'This is a great opportunity.', exampleUz: 'Bu ajoyib imkoniyat.', level: 'B1' },
  { en: 'comprehensive', ipa: '/ˌkɒmprɪˈhensɪv/', uz: 'har tomonlama, to‘liq', example: 'We need a comprehensive plan.', exampleUz: 'Bizga har tomonlama reja kerak.', level: 'C1' },
  { en: 'anticipate', ipa: '/ænˈtɪsɪpeɪt/', uz: 'oldindan kutmoq', example: 'We anticipate some delays.', exampleUz: 'Biroz kechikishni kutyapmiz.', level: 'B2' },
  { en: 'fluent', ipa: '/ˈfluːənt/', uz: 'ravon', example: 'She speaks fluent English.', exampleUz: 'U ravon ingliz tilida gapiradi.', level: 'B1' }
];

export const wordOfToday = (): DayWord => WORDS[Math.floor(Date.now() / 86_400_000) % WORDS.length];

/** Practice sentences for the pronunciation coach, easier first. */
export const PHRASES: Array<{ text: string; level: 'A2' | 'B1' | 'B2' | 'C1' }> = [
  { text: 'Nice to meet you.', level: 'A2' },
  { text: 'Could you speak a little slower, please?', level: 'A2' },
  { text: 'I would like a cup of coffee.', level: 'A2' },
  { text: 'Where is the nearest train station?', level: 'A2' },
  { text: 'I have been learning English for two years.', level: 'B1' },
  { text: 'The weather is getting better every day.', level: 'B1' },
  { text: 'She usually walks to work in the morning.', level: 'B1' },
  { text: 'Could you tell me how to get to the airport?', level: 'B1' },
  { text: 'Technology has changed the way we communicate.', level: 'B2' },
  { text: 'I strongly believe that education is the key to success.', level: 'B2' },
  { text: 'Despite the difficulties, they managed to finish on time.', level: 'B2' },
  { text: 'Thoroughly prepared students rarely feel anxious.', level: 'C1' },
  { text: 'The comprehensive report highlights several sustainable solutions.', level: 'C1' },
  { text: 'It is widely acknowledged that perseverance leads to remarkable achievements.', level: 'C1' }
];
