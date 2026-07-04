import { ChatbotWidget } from '../components/ChatbotWidget';
import { RepairTracker } from '../components/RepairTracker';
import { BrandsSection } from '../components/landing/BrandsSection';
import { FaqSection } from '../components/landing/FaqSection';
import { FinalCtaSection } from '../components/landing/FinalCtaSection';
import { Footer } from '../components/landing/Footer';
import { HeroSection } from '../components/landing/HeroSection';
import { NavBar } from '../components/landing/NavBar';
import { ProcessSection } from '../components/landing/ProcessSection';
import { ProductsSection } from '../components/landing/ProductsSection';
import { ServicesSection } from '../components/landing/ServicesSection';
import { TrackingPreviewSection } from '../components/landing/TrackingPreviewSection';
import { TrustSection } from '../components/landing/TrustSection';
import { useReveal } from '../hooks/useReveal';
import '../styles/landing-redesign.css';
import '../styles/hero-motion.css';

export function LandingPage() {
  useReveal();

  return (
    <div className="lp">
      <NavBar />
      <main>
        <HeroSection />
        <TrustSection />
        <ServicesSection />
        <ProcessSection />
        <ProductsSection />
        <RepairTracker />
        <BrandsSection />
        <FaqSection />
        <FinalCtaSection />
      </main>
      <Footer />
      <ChatbotWidget />
    </div>
  );
}