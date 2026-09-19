// Every value here comes from the résumés in CAREER_OS; unverified and [CONFIRM] lines are
// deliberately left out. Keep it that way when editing.

export const profile = {
  name: "Mohd Shoaib",
  initials: "MS",
  role: "Software Engineer",
  photo: { src: "/pfp/shoaib.webp", width: 720, height: 960 },
  location: "Ghaziabad, India",
  email: "mohdshoaib97569@gmail.com",
  resume: "/resume.pdf",
  /** Hero headline. The emphasis part is set in bold. */
  headline: {
    lead: "Software Engineer —",
    emphasis: "Backend (Python, FastAPI, Node.js, PostgreSQL)",
    tail: "with testing and reliability at the centre.",
  },
  about: {
    lede: "Final-year B.Tech Information Technology student at ABES Engineering College (AKTU), Ghaziabad.",
    notes: [
      "Currently building CarePulse, a multi-tenant hospital management system, as a team of two.",
      "Previously an LLM Post-Training Intern at Ethara AI (Apr 2026 – May 2026).",
      "Relevant coursework: Data Structures & Algorithms, Object-Oriented Programming, DBMS, Operating Systems.",
    ],
  },
  links: [
    { label: "GitHub", href: "https://github.com/Shoaib-Navi", icon: "↗" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/shoaib-navi/", icon: "↗" },
    { label: "LeetCode", href: "https://leetcode.com/u/shoaib_navi/", icon: "↗" },
  ],
};

type Stat = { value: string; label: string; count?: number; dec?: number; group?: boolean };

export const stats: Stat[] = [
  { value: "8.05", label: "CGPA", count: 8.05, dec: 2 },
  { value: "354", label: "LeetCode problems", count: 354 },
  { value: "1,709", label: "Peak contest rating", count: 1709, group: true },
  { value: "1st", label: "SIH 2025 (internal)" },
];

type Tool = { name: string; logo?: string };
export type SkillGroup = { label: string; tools: Tool[] };

const logo = (file: string) => `/logos/${file}`;

export const skills: SkillGroup[] = [
  {
    label: "Languages",
    tools: [
      { name: "Python", logo: logo("python-original.svg") },
      { name: "TypeScript", logo: logo("typescript-original.svg") },
      { name: "JavaScript", logo: logo("javascript-original.svg") },
      { name: "C++", logo: logo("cplusplus-original.svg") },
    ],
  },
  {
    label: "Frameworks",
    tools: [
      { name: "React", logo: logo("react-original.svg") },
      { name: "Next.js", logo: logo("nextjs-original.svg") },
      { name: "Node.js", logo: logo("nodejs-original.svg") },
      { name: "Express.js", logo: logo("express-original.svg") },
      { name: "FastAPI", logo: logo("fastapi-original.svg") },
    ],
  },
  {
    label: "Databases",
    tools: [
      { name: "PostgreSQL", logo: logo("postgresql-original.svg") },
      { name: "MySQL", logo: logo("mysql-original.svg") },
      { name: "MongoDB", logo: logo("mongodb-original.svg") },
      { name: "Redis", logo: logo("redis-original.svg") },
      { name: "Prisma", logo: logo("prisma-original.svg") },
    ],
  },
  {
    label: "Cloud & DevOps",
    tools: [
      { name: "AWS", logo: logo("amazonwebservices-original-wordmark.svg") },
      { name: "Docker", logo: logo("docker-original.svg") },
      { name: "Git", logo: logo("git-original.svg") },
      { name: "GitHub Actions", logo: logo("githubactions-original.svg") },
      { name: "Postman", logo: logo("postman-original.svg") },
    ],
  },
  {
    label: "AI/ML",
    tools: [
      { name: "LLM APIs" },
      { name: "LangGraph" },
      { name: "RAG pipelines" },
      { name: "Vector embeddings" },
      { name: "Semantic search" },
    ],
  },
  {
    label: "Testing",
    tools: [
      { name: "Jest", logo: logo("jest-plain.svg") },
      { name: "Vitest", logo: logo("vitest-original.svg") },
    ],
  },
];

export type Job = {
  slug: string;
  company: string;
  role: string;
  period: string;
  year: string;
  /** Wrap a phrase in **double asterisks** to bold it. */
  highlights: string[];
  stack: string[];
};

export const experience: Job[] = [
  {
    slug: "ethara",
    company: "Ethara AI",
    role: "LLM Post-Training Intern",
    period: "Apr 2026 – May 2026",
    year: "2026",
    highlights: [
      "Evaluated LLM responses against **structured rubrics** for correctness, instruction following and response quality.",
      "Performed structured testing, benchmarking and feedback analysis to evaluate model responses and **identify performance gaps**.",
    ],
    stack: [],
  },
];

type Project = {
  slug: string;
  index: string;
  name: string;
  tagline: string;
  lede: string;
  status?: string;
  stack: string[];
  /** Wrap a phrase in **double asterisks** to bold it. */
  points: { label: string; text: string }[];
  links: { label: string; href: string }[];
  note?: string;
  /** Screenshot paths under /public. Empty shows the "no screenshot yet" placeholder. */
  shots: string[];
};

export const projects: Project[] = [
  {
    slug: "carepulse",
    index: "01",
    name: "CarePulse",
    tagline: "Multi-tenant hospital management system",
    status: "Ongoing · Team of 2",
    lede: "Outpatient system for Indian clinics covering registration, live queue, vitals, consultation, lab orders and results, prescriptions and pharmacy dispensing for 6 staff roles.",
    stack: ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "React.js", "TypeScript", "Docker", "GitHub Actions"],
    points: [
      {
        label: "Backend",
        text: "**60 REST API operations** in Python / FastAPI across 16 feature modules, each built as router, service and repository layers with SQLAlchemy 2.0 and Alembic migrations.",
      },
      {
        label: "Data & multi-tenancy",
        text: "**PostgreSQL row-level security** per tenant plus a role-permission matrix; clinical writes go to an **append-only ledger** (trigger-enforced) enabling “as-of” replay.",
      },
      {
        label: "Concurrency & jobs",
        text: "Queue tokens stay unique under simultaneous sign-ups using a lock plus **bounded retry**; a background job is **safe to rerun** and to run on several workers via PostgreSQL advisory locks.",
      },
      {
        label: "Correctness",
        text: "A Playwright test exposed commits running **after the response was sent** (stale reads); fixed so every 2xx means the write is committed, with a test checking every route.",
      },
      {
        label: "Testing",
        text: "**155 pytest tests** (25 unit, 86 integration on real PostgreSQL, 44 security) plus Hypothesis and Playwright; a latency test asserts **p95 search < 300 ms over 50,000 patients**.",
      },
      {
        label: "Security",
        text: "JWT with refresh tokens, **argon2** password hashing, sign-in rate limiting with Retry-After, and an **audit trail of every patient-data read**.",
      },
      {
        label: "CI/CD",
        text: "**GitHub Actions** starts a throwaway PostgreSQL per job and runs pytest, ruff, strict mypy, ESLint, dependency audits and Docker builds.",
      },
    ],
    links: [],
    note: "The repository is private.",
    shots: ["/shots/carepulse.webp"],
  },
  {
    slug: "hirestream",
    index: "02",
    name: "HireStream",
    tagline: "Job portal for recruiters and candidates",
    status: "Live",
    lede: "A full-stack job portal with REST APIs for users, companies, jobs and applications, covering recruiter and candidate workflows.",
    stack: ["MongoDB", "Express.js", "React.js", "Node.js"],
    points: [
      {
        label: "Backend & APIs",
        text: "Built **15+ REST endpoints** (Node.js, Express) for users, companies, jobs and applications, with **JWT auth middleware** guarding protected routes.",
      },
      {
        label: "Data modeling",
        text: "Designed **MongoDB schemas** (Mongoose) for 4 collections linked by ObjectId references; used **nested population** to return applicants with profiles and applications with company details in one request.",
      },
      {
        label: "Hiring workflow",
        text: "Duplicate-application checks, a **pending / accepted / rejected** status pipeline for recruiters, and case-insensitive **$regex keyword search** over job titles and descriptions.",
      },
      {
        label: "Security & uploads",
        text: "**JWT in httpOnly cookies**, bcrypt hashing and recruiter-only routes; photos, résumés and company logos uploaded via **Multer + Cloudinary**.",
      },
    ],
    links: [
      { label: "Live", href: "https://hire-stream-delta.vercel.app" },
      { label: "Repo", href: "https://github.com/Shoaib-Navi/HireStream" },
    ],
    shots: ["/shots/hirestream.webp"],
  },
  {
    slug: "terraloom",
    index: "03",
    name: "TerraLoom",
    tagline: "Property listing platform",
    status: "Live",
    lede: "A property listing platform with listing CRUD, reviews and owner-only edit and delete permissions.",
    stack: ["MongoDB", "Express.js", "Node.js", "EJS", "Passport.js"],
    points: [
      {
        label: "Authorization",
        text: "Owner-only listing edits and author-only review deletion via Express middleware; **cascade-deletes reviews** with a Mongoose post-delete hook.",
      },
      {
        label: "Auth & security",
        text: "Passport.js sessions **stored in MongoDB** (connect-mongo), **Joi** schema validation and **Helmet** CSP headers.",
      },
      {
        label: "Maps & media",
        text: "**Mapbox** geocoding saved as **GeoJSON**; listing images uploaded to Cloudinary via Multer.",
      },
    ],
    links: [
      { label: "Live", href: "https://terraloom.vercel.app/listings" },
      { label: "Repo", href: "https://github.com/Shoaib-Navi/TerraLoom" },
    ],
    shots: ["/shots/terraloom.webp"],
  },
];

export const education = [
  {
    title: "B.Tech, Information Technology",
    org: "ABES Engineering College (AKTU), Ghaziabad",
    detail: "CGPA 8.05/10 · 2023 – 2027",
  },
  {
    title: "Class XII (PCM)",
    org: "St. Joseph's Senior Secondary School, Puranpur",
    detail: "81.4% · 2021",
  },
];

export const awards = [
  {
    title: "Winner",
    detail: "Smart India Hackathon 2025 (internal round) — TrueGrad, an OCR-based academic certificate validator.",
  },
  {
    title: "354 problems solved",
    detail: "LeetCode: 169 Medium, 42 Hard; contest peak 1,709 (top 18%), up from 1,418 in Feb 2026.",
    href: "https://leetcode.com/u/shoaib_navi/",
  },
  {
    title: "McKinsey & Company Forward Program",
    detail: "Structured problem solving and communication.",
    href: "https://www.credly.com/badges/cbf61d71-d044-4399-88fd-c5e338dd7937/linked_in?t=thz4hg",
  },
];
