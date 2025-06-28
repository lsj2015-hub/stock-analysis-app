import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ScrollToTopButton from '@/components/shared/ScrollToTopButton';
import { SectorAnalysisSection } from '@/features/SectorAnalysisSection';
import { PerformanceAnalysisSection } from '@/features/PerformanceAnalysisSection';

const page = () => {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="w-full bg-gradient-to-r from-[#fbbc04] to-[#34a853] h-1" />
      {/* 헤더 섹션 */}
      <header className="py-6 border-b">
        <div className="max-w-5xl mx-auto px-8 relative flex justify-center items-center">
          {/* 중앙 정렬된 제목 */}
          <h1 className="text-2xl font-bold tracking-tight">
            BENCH MARK ANALYSIS
          </h1>
          <div className="absolute right-0">
            <Link href="/">
              <Button className="font-bold bg-gradient-to-r from-[#fbbc04] to-[#34a853] hover:bg-gradient-to-r hover:from-[#34a853] hover:to-[#fbbc04]">
                기업 정보 분석
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <div className="max-w-5xl mx-auto py-8 flex flex-col gap-6">
        <SectorAnalysisSection />
        <PerformanceAnalysisSection />
      </div>

      {/* ✅ 플로팅 버튼 컴포넌트 추가 */}
      <ScrollToTopButton />
    </main>
  );
};

export default page