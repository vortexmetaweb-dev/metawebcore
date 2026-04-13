import Banner from "./componentes/banner"
import Hero from "./componentes/hero"
import Navbar from "./componentes/navbar"
import Feature from "./componentes/feature"

import CTA from "./componentes/cta"
import Pricing from "./componentes/pricing"
import Procesos from "./componentes/procesos"
import FAQ from "./componentes/faq"
import Footer from "./componentes/footer"

export default function Home() {
  return (
    <main className="min-h-[100svh] bg-background text-foreground">
      <div className="sticky top-0 z-50">
        <Banner />
        <Navbar />
      </div>
      <Hero />
      <Feature />
      <Procesos />
      <Pricing />
      <CTA />
      <FAQ />
      <Footer />
    </main>
  )
}
