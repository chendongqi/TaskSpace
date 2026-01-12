"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { CheckCircle, Timer, RotateCcw } from "lucide-react";

const motivationalQuotes = [
  "Focus on what matters.",
  "Every day is a new beginning.",
  "Small steps, big results.",
  "Your time is your most valuable asset.",
  "Achieve your goals, one task at a time.",
  "Make today count.",
  "Progress, not perfection.",
  "Start where you are. Use what you have. Do what you can.",
  "The best way to predict the future is to create it.",
  "Discipline is choosing between what you want now and what you want most.",
  "The journey of a thousand miles begins with a single step.",
  "Believe you can and you're halfway there.",
  "The future belongs to those who believe in the beauty of their dreams.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "The only way to do great work is to love what you do.",
  "Wake UP!",
  "Make it COUNT!",
  "You have no time to waste.",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.8,
      ease: "easeInOut",
    },
  },
};

const logoVariants = {
  hidden: { opacity: 0, scale: 0.8, y: -20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25,
      duration: 0.8,
    },
  },
};

const iconVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 500,
      damping: 30,
      delay: 0.1,
    },
  },
};

const textContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 1.2, // Increased delay to let other animations complete first
    },
  },
};

const wordVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    filter: "blur(4px)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94], // Custom easing
    },
  },
};

const brandVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.8,
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

export function IntroScreen({ onAnimationComplete }) {
  const [currentQuote, setCurrentQuote] = useState("");
  const [words, setWords] = useState([]);

  useEffect(() => {
    // Select a random quote on mount
    const randomIndex = Math.floor(Math.random() * motivationalQuotes.length);
    const selectedQuote = motivationalQuotes[randomIndex];
    setCurrentQuote(selectedQuote);
    setWords(selectedQuote.split(" "));

    // Set timeout for the full screen to fade out
    const timer = setTimeout(() => {
      onAnimationComplete();
    }, 1500); // Total duration: 1.5 seconds

    return () => clearTimeout(timer);
  }, [onAnimationComplete]);

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700 flex flex-col items-center justify-center z-[100] overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center space-y-8 px-8 max-w-4xl mx-auto">
        {/* App Logo/Brand */}
        <motion.div
          variants={logoVariants}
          className="flex flex-col items-center space-y-4 max-w-lg"
        >
          <div className="flex items-center gap-4">
            <motion.div
              variants={iconVariants}
              className="p-4 bg-primary/10 rounded-2xl"
            >
              <Timer className="h-12 w-12 text-primary" />
            </motion.div>
            <motion.div
              variants={iconVariants}
              className="p-4 bg-primary/10 rounded-2xl"
              style={{ animationDelay: "0.1s" }}
            >
              <CheckCircle className="h-12 w-12 text-primary" />
            </motion.div>
            <motion.div
              variants={iconVariants}
              className="p-4 bg-primary/10 rounded-2xl"
              style={{ animationDelay: "0.2s" }}
            >
              <RotateCcw className="h-12 w-12 text-primary" />
            </motion.div>
          </div>

          <motion.h1
            variants={logoVariants}
            className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 text-center tracking-tight"
          >
            Task Space
          </motion.h1>

          <motion.div
            variants={logoVariants}
            className="text-lg font-bold text-primary uppercase tracking-wider"
          >
            Focus • Track • Achieve
          </motion.div>
        </motion.div>

        {/* Motivational Quote */}
        <motion.div
          variants={textContainerVariants}
          className="text-center"
          initial="hidden"
          animate="visible"
        >
          <div className="text-gray-700 text-center dark:text-gray-300 text-xl md:text-2xl font-medium leading-relaxed max-w-lg mx-auto">
            {words.map((word, i) => (
              <motion.span
                key={`${word}-${i}`} // Better key to handle duplicate words
                className="inline-block mr-2"
                variants={wordVariants}
                custom={i} // Pass index as custom prop if needed for more control
              >
                {word}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
