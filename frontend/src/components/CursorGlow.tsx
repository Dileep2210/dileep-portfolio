import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * A soft light that trails the cursor across the whole page — cheap (one
 * fixed div, GPU-transformed) but makes every section feel alive, not just
 * the components with their own hover states. Hidden on touch devices,
 * where there's no cursor to follow.
 */
export default function CursorGlow() {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const springX = useSpring(x, { stiffness: 120, damping: 24, mass: 0.4 });
  const springY = useSpring(y, { stiffness: 120, damping: 24, mass: 0.4 });

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.6 }}
      className="pointer-events-none fixed left-0 top-0 -z-10 hidden h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full mix-blend-screen md:block"
      style={{
        x: springX,
        y: springY,
        background:
          "radial-gradient(circle, color-mix(in srgb, var(--color-violet) 16%, transparent), transparent 70%)",
      }}
    />
  );
}
