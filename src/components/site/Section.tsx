import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  id?: string;
  alt?: boolean;
}

export function Section({ children, className = "", id, alt = false }: Props) {
  return (
    <section id={id} className={`py-16 md:py-24 ${alt ? "bg-surface-alt" : "bg-background"} ${className}`}>
      <div className="container mx-auto px-4 max-w-7xl">{children}</div>
    </section>
  );
}

export function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
