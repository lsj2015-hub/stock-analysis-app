'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // shadcn/ui의 유틸리티 함수

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // 스크롤 위치를 감지하여 버튼의 표시 여부를 결정하는 함수
  const toggleVisibility = () => {
    // 300px 이상 스크롤되면 버튼을 표시
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // 맨 위로 부드럽게 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // 부드러운 스크롤 효과
    });
  };

  useEffect(() => {
    // 스크롤 이벤트 리스너 추가
    window.addEventListener('scroll', toggleVisibility);

    // 컴포넌트가 언마운트될 때 이벤트 리스너 제거 (메모리 누수 방지)
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div className="fixed bottom-8 right-8 z-50">
      <Button
        size="icon"
        onClick={scrollToTop}
        // isVisible 상태에 따라 투명도와 표시 여부를 조절
        className={cn(
          'rounded-full h-12 w-12 bg-black text-white shadow-lg transition-opacity duration-300 hover:bg-gray-800',
          isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        aria-label="맨 위로 스크롤"
      >
        <ArrowUp className="h-6 w-6" />
      </Button>
    </div>
  );
}
