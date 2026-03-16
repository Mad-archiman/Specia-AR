'use client';

export type GuideVariant = 'main' | 'ar';

const MAIN_STEPS = [
  'AR 3D 뷰어 버튼을 누릅니다.',
  '부여받은 코드를 입력합니다.',
  '핸드폰을 잠시 바닥에 가깝게 둡니다.',
  '우측 상단 톱니바퀴를 열어 START AR을 누릅니다.',
  '자유롭게 모델을 현실에서 즐기세요.',
];

const AR_STEPS = [
  '핸드폰을 잠시 바닥에 가깝게 둡니다.',
  '우측 상단 톱니바퀴를 열어 START AR을 누릅니다.',
  '자유롭게 모델을 현실에서 즐기세요.',
];

interface GuideContentProps {
  variant: GuideVariant;
}

export function GuideContent({ variant }: GuideContentProps) {
  const steps = variant === 'main' ? MAIN_STEPS : AR_STEPS;
  return (
    <div className="rounded border border-white/20 bg-black/80 p-4 text-white">
      <p className="mb-3 font-medium text-white/90">-사용법-</p>
      <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-white/90">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </div>
  );
}
