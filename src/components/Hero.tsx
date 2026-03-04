import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const titles = ["Fullstack Developer", "DevOps Engineer", "Automation Lover"];

export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % titles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center relative">
      <motion.h1
        className="text-6xl sm:text-8xl font-bold tracking-tight"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        이현준
      </motion.h1>

      <div className="h-12 mt-6 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.p
            key={titles[index]}
            className="text-xl sm:text-2xl text-blue-400 font-medium text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            {titles[index]}
          </motion.p>
        </AnimatePresence>
      </div>

      <motion.div
        className="absolute bottom-10"
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="opacity-50"
        >
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </motion.div>
    </section>
  );
}
