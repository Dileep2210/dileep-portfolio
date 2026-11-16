import { motion, MotionConfig } from "framer-motion";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import BackgroundFX from "./components/BackgroundFX";
import CursorGlow from "./components/CursorGlow";
import Navbar from "./components/Navbar";
import ScrollProgress from "./components/ScrollProgress";
import Hero from "./components/Hero";
import About from "./components/About";
import Projects from "./components/Projects";
import Testimonials from "./components/Testimonials";
import Services from "./components/Services";
import TechStack from "./components/TechStack";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

function App() {
  useSmoothScroll();

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-full focus:bg-white focus:px-5 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink"
      >
        Skip to main content
      </a>
      <BackgroundFX />
      <CursorGlow />
      <ScrollProgress />
      <Navbar />
      <motion.main
        id="main"
        tabIndex={-1}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="outline-none"
      >
        <Hero />
        <About />
        <Projects />
        <Testimonials />
        <Services />
        <TechStack />
        <Contact />
      </motion.main>
      <Footer />
    </MotionConfig>
  );
}

export default App;
