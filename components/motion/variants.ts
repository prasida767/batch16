export const easeOutSoft = [0.22, 1, 0.36, 1] as const;
export const easeInOutSoft = [0.45, 0, 0.55, 1] as const;
export const springSnappy = { type: "spring" as const, stiffness: 420, damping: 28 };
export const springSoft = { type: "spring" as const, stiffness: 280, damping: 26 };

export const pageEnter = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOutSoft },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: easeOutSoft },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.38, ease: easeOutSoft },
  },
};

export const slideInUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: easeOutSoft },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.42, ease: easeOutSoft },
  },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 16 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.42, ease: easeOutSoft },
  },
};

export const hoverLift = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -2,
    scale: 1.01,
    transition: { duration: 0.22, ease: easeOutSoft },
  },
};

export const pressScale = {
  rest: { scale: 1 },
  press: { scale: 0.98 },
};
