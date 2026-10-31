import { motion, Transition } from "motion/react";
import { FC, memo } from "react";

const ContainerVariants = {
  initial: {
    transition: {
      staggerChildren: 0.2,
    },
  },
  animate: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const DotVariants = {
  initial: {
    y: "0%",
  },
  animate: {
    y: "100%",
  },
};

const DotTransition: Transition = {
  duration: 0.3,
  repeat: Infinity,
  repeatType: "reverse",
  ease: "easeInOut",
};

export const LoadingThreeDotsWave: FC = memo(() => {
  return (
    <div className="inline-block">
      <div className="flex h-2 w-5 items-center justify-center">
        <motion.div
          className="flex w-full justify-around"
          variants={ContainerVariants}
          initial="initial"
          animate="animate"
        >
          <motion.span
            className="block h-0.5 w-0.5 rounded-full bg-current"
            variants={DotVariants}
            transition={DotTransition}
          />
          <motion.span
            className="block h-0.5 w-0.5 rounded-full bg-current"
            variants={DotVariants}
            transition={DotTransition}
          />
          <motion.span
            className="block h-0.5 w-0.5 rounded-full bg-current"
            variants={DotVariants}
            transition={DotTransition}
          />
        </motion.div>
      </div>
    </div>
  );
});
