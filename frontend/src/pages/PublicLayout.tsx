import { useEffect, useRef } from "react";
import { MotionConfig, motion } from "framer-motion";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import BackgroundFX from "../components/BackgroundFX";
import CursorGlow from "../components/CursorGlow";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollProgress from "../components/ScrollProgress";
import { useSmoothScroll } from "../hooks/useSmoothScroll";
import { useSite } from "../lib/queries";

function initialsOf(name: string) {
  const parts = name.split(" ").filter(Boolean);
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [parts[0]?.[0] ?? "?"];
  return letters.join("").toUpperCase();
}

export default function PublicLayout() {
  useSmoothScroll();
  const { data: site } = useSite();
  const location = useLocation();
  const name = site?.settings.developer_name ?? "Dileep Kumar Panchumarthi";

  // Move focus to the main region on route *changes* so screen readers announce the new page.
  // Not on the first load: that would skip the "Skip to main content" link for keyboard users.
  const firstPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === firstPath.current) return;
    firstPath.current = "";
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [location.pathname]);

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
      <Navbar
        items={site?.navigation}
        resumeUrl={site?.resume_url}
        initials={initialsOf(name)}
        brand={site?.settings.first_name || name.split(" ")[0]}
      />
      <motion.main
        id="main"
        tabIndex={-1}
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="min-h-[70vh] outline-none"
      >
        <Outlet />
      </motion.main>
      <Footer
        name={name}
        text={site?.settings.footer_text}
        items={site?.navigation ?? []}
        socials={site?.social_links ?? []}
        initials={initialsOf(name)}
      />
      <ScrollRestoration />
    </MotionConfig>
  );
}
