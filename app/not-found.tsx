import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-950 text-white p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-6xl font-black text-[#F95738]">404</h1>
        <h2 className="text-2xl font-bold">Sahifa topilmadi</h2>
        <p className="text-stone-400 text-sm">
          Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki boshqa manzilga ko‘chirilgan.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-[#F95738] hover:bg-[#E04828] text-white font-medium text-sm transition-colors"
          >
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    </div>
  );
}
