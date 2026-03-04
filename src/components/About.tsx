import { motion } from "framer-motion";

const sentences = [
  "풀스택 개발과 DevOps 자동화에 열정을 가진 개발자입니다.",
  "백엔드부터 인프라, 프론트엔드까지 서비스의 전체 라이프사이클을 다룹니다.",
  "반복적인 작업을 자동화하고 개발 생산성을 높이는 데 집중합니다.",
];

export default function About() {
  return (
    <section className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <motion.h2
          className="text-3xl sm:text-4xl font-bold mb-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          About
        </motion.h2>

        <div className="space-y-4">
          {sentences.map((sentence, i) => (
            <motion.p
              key={i}
              className="text-lg sm:text-xl leading-relaxed text-neutral-300"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.7,
                delay: i * 0.15,
                ease: [0.25, 0.1, 0.25, 1],
              }}
            >
              {sentence}
            </motion.p>
          ))}
        </div>
      </div>
    </section>
  );
}
