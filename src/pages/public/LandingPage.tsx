import { PublicHeader } from '@/components/public/PublicHeader';
import { HeroSection } from '@/components/public/HeroSection';
import { ProductOverviewSection } from '@/components/public/ProductOverviewSection';
import { RealWorkflowSection } from '@/components/public/RealWorkflowSection';
import { OperationalBenefitsSection } from '@/components/public/OperationalBenefitsSection';
import { WorkspaceShowcaseSection } from '@/components/public/WorkspaceShowcaseSection';
import { FaqSection } from '@/components/public/FaqSection';
import { FinalCtaSection } from '@/components/public/FinalCtaSection';
import { PublicFooter } from '@/components/public/PublicFooter';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#081B2C] text-gray-100 flex flex-col font-sans selection:bg-[#27B4A0] selection:text-white">
      {/* 1. Sticky Navigation */}
      <PublicHeader currentPath="/" onNavigate={onNavigate} />

      <main className="flex-1">
        {/* 2. Editorial SaaS Dark Hero */}
        <HeroSection onNavigate={onNavigate} />

        {/* 3. Light Product Overview (Pearl White Rhythm) */}
        <ProductOverviewSection onNavigate={onNavigate} />

        {/* 4. Dark Interactive Real Workflow Pipeline (7 Steps) */}
        <RealWorkflowSection onNavigate={onNavigate} />

        {/* 5. Light Operational Benefits & Volume Estimator */}
        <OperationalBenefitsSection onNavigate={onNavigate} />

        {/* 6. Dark Realistic Workspace Showcase (Tabs: Orders, Stock, Fulfillment, Finance) */}
        <WorkspaceShowcaseSection onNavigate={onNavigate} />

        {/* 7. Light Clean FAQ Accordion */}
        <FaqSection onNavigate={onNavigate} />

        {/* 8. Dark High-Contrast Final CTA */}
        <FinalCtaSection onNavigate={onNavigate} />
      </main>

      {/* 9. Balanced Public Footer */}
      <PublicFooter onNavigate={onNavigate} />
    </div>
  );
}
