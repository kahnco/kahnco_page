import { motion } from "framer-motion";

const skillCategories = [
  {
    name: "Backend",
    skills: ["NestJS", "Spring Boot", "Node.js", "Express"],
  },
  {
    name: "Infra / DevOps",
    skills: ["AWS", "Kubernetes", "Docker", "ArgoCD", "GitHub Actions", "AWS CDK"],
  },
  {
    name: "Frontend / Mobile",
    skills: ["React", "Next.js", "Flutter"],
  },
  {
    name: "Database",
    skills: ["PostgreSQL", "MongoDB", "MariaDB", "MySQL", "DynamoDB", "ElasticSearch"],
  },
  {
    name: "Language",
    skills: ["TypeScript", "Java", "Kotlin", "Python", "Dart"],
  },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function Skills() {
  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 py-20">
      <motion.h2
        className="text-3xl sm:text-4xl font-bold mb-16"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        Skills
      </motion.h2>

      <div className="max-w-3xl w-full space-y-10">
        {skillCategories.map((category) => (
          <motion.div
            key={category.name}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            variants={container}
          >
            <h3 className="text-sm uppercase tracking-widest text-neutral-500 mb-3">
              {category.name}
            </h3>
            <div className="flex flex-wrap gap-2">
              {category.skills.map((skill) => (
                <motion.span
                  key={skill}
                  variants={item}
                  whileHover={{ scale: 1.1 }}
                  className="skill-tag px-4 py-2 rounded-full text-sm font-medium bg-white/5 border border-white/10 cursor-default transition-shadow hover:shadow-[0_0_12px_rgba(59,130,246,0.4)] hover:border-blue-500/50"
                >
                  {skill}
                </motion.span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
