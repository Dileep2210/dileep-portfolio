import type { IconType } from "react-icons";
import type { LucideIcon } from "lucide-react";
import {
  Bot,
  LayoutTemplate,
  MessageSquareText,
  Plug,
  Workflow,
} from "lucide-react";
import calculatorCartImg from "../assets/proj-calculatorcart.webp";
import govastraImg from "../assets/proj-govastra.webp";
import docsQaImg from "../assets/proj-docsqa.webp";
import fieldnoteImg from "../assets/proj-fieldnote.webp";
import leadpilotImg from "../assets/proj-leadpilot.webp";
import sodaImg from "../assets/proj-soda.webp";
import realestateImg from "../assets/proj-realestate.webp";
import saloonImg from "../assets/proj-saloon.webp";
import aldenImg from "../assets/proj-alden.webp";
import bustravelImg from "../assets/proj-bustravel.webp";
import {
  SiReact,
  SiTypescript,
  SiJavascript,
  SiHtml5,
  SiCss,
  SiSass,
  SiVite,
  SiPython,
  SiFastapi,
  SiFlask,
  SiPostgresql,
  SiSqlite,
  SiGit,
  SiGithub,
  SiPostman,
  SiLangchain,
  SiGooglegemini,
  SiAnthropic,
  SiCrewai,
  SiN8N,
  SiDocker,
  SiKubernetes,
  SiRazorpay,
} from "react-icons/si";
import {
  TbBrandVscode,
  TbBrandAws,
  TbApi,
  TbBrain,
  TbDatabaseSearch,
  TbCone,
  TbColorSwatch,
  TbVectorBezier,
  TbNetwork,
  TbLayersLinked,
  TbMessage2Bolt,
  TbSparkles,
  TbTopologyStar3,
  TbPlugConnected,
  TbBooks,
  TbAdjustments,
} from "react-icons/tb";

export type NavLink = {
  label: string;
  href: string;
};

export type SocialLink = {
  label: string;
  href: string;
  icon: "github" | "linkedin" | "mail";
};

export type TechItem = {
  name: string;
  icon: IconType;
  color: string;
};

export type TechCategory = {
  title: string;
  blurb: string;
  items: TechItem[];
};

export type LearningItem = {
  name: string;
  icon: IconType;
  color: string;
  note: string;
};

export type Service = {
  icon: LucideIcon;
  title: string;
  description: string;
  tags: string[];
  featured?: boolean;
};

export type Project = {
  name: string;
  category: "genai" | "webdev";
  tagline: string;
  description: string;
  metric: { label: string; value: string };
  image: string;
  url: string;
  tags: string[];
  highlights: string[];
  isDemo?: boolean;
  caseStudy?: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar?: string;
  isSample?: boolean;
};

export const profile = {
  name: "Dileep Kumar Panchumarthi",
  firstName: "Dileep",
  role: "GenAI Full Stack Developer",
  taglineWords: [
    "GenAI Full Stack Developer",
    "Full-Stack Web Developer",
    "LLM Application Builder",
    "React + FastAPI Engineer",
    "Agentic AI Explorer",
  ],
  bio: "I'm a Full Stack Developer who builds end to end — from custom business websites and e-commerce stores to AI-powered applications using LLMs. Whatever the project, I take it from idea to a real, live product. I care about clean interfaces, fast APIs, and shipping things that actually work.",
  highlights: [
    { label: "Focus", value: "Full-Stack & GenAI Development" },
    { label: "Currently learning", value: "Agentic AI, MCP & AWS" },
    { label: "Building with", value: "React, FastAPI & LLMs" },
    { label: "Available for", value: "Freelance projects" },
  ],
  email: "dileepfreelancer22@gmail.com",
  location: "India",
  // Drop your actual resume PDF into /public/resume.pdf — this path just points there.
  resumeUrl: "/resume.pdf",
};

export const trustPoints: string[] = [
  "Direct communication — you work with me, not an account manager",
  "Clear scope & timeline agreed before any code is written",
  "Post-launch support included, not an extra line item",
  "Based in India (IST) — flexible hours, happy to sync with your timezone",
  "Actively taking on new freelance projects right now",
];

export const socialLinks: SocialLink[] = [
  { label: "GitHub", href: "https://github.com/Dileep2210", icon: "github" },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/panchumarthi-dileep-kumar-a6a82a219/",
    icon: "linkedin",
  },
  { label: "Email", href: `mailto:${profile.email}`, icon: "mail" },
];

export const navLinks: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Skills", href: "#skills" },
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
];

export type SkillProficiency = {
  label: string;
  value: number;
  note: string;
};

// Relative depth across my core disciplines — not a certification score,
// just an honest signal of where I spend the most reps.
export const skillProficiency: SkillProficiency[] = [
  {
    label: "Frontend Engineering",
    value: 92,
    note: "React, TypeScript, motion-first interfaces",
  },
  {
    label: "GenAI / LLM Engineering",
    value: 90,
    note: "RAG pipelines, LangChain/LangGraph agents",
  },
  {
    label: "Backend & APIs",
    value: 85,
    note: "FastAPI, Flask, REST design that stays fast",
  },
  {
    label: "Databases & DevOps",
    value: 78,
    note: "PostgreSQL, Docker, real deployments",
  },
];

export const techStack: TechCategory[] = [
  {
    title: "Frontend",
    blurb: "Crafting fast, polished interfaces",
    items: [
      { name: "React", icon: SiReact, color: "#61DAFB" },
      { name: "TypeScript", icon: SiTypescript, color: "#3178C6" },
      { name: "JavaScript", icon: SiJavascript, color: "#F7DF1E" },
      { name: "HTML5", icon: SiHtml5, color: "#E34F26" },
      { name: "CSS3", icon: SiCss, color: "#1572B6" },
      { name: "SCSS", icon: SiSass, color: "#CC6699" },
      { name: "Vite", icon: SiVite, color: "#B473FA" },
    ],
  },
  {
    title: "Backend",
    blurb: "APIs that stay fast under load",
    items: [
      { name: "Python", icon: SiPython, color: "#3776AB" },
      { name: "FastAPI", icon: SiFastapi, color: "#009688" },
      { name: "Flask", icon: SiFlask, color: "#B8B8B8" },
      { name: "REST APIs", icon: TbApi, color: "#38BDF8" },
      { name: "Razorpay", icon: SiRazorpay, color: "#3395FF" },
    ],
  },
  {
    title: "AI / GenAI",
    blurb: "Where the interesting problems live",
    items: [
      { name: "LLMs", icon: TbBrain, color: "#A78BFA" },
      { name: "RAG", icon: TbDatabaseSearch, color: "#34D399" },
      { name: "LangChain", icon: SiLangchain, color: "#1C3C3C" },
      { name: "LlamaIndex", icon: TbBooks, color: "#8B5CF6" },
      { name: "LangGraph", icon: TbTopologyStar3, color: "#22D3EE" },
      { name: "CrewAI", icon: SiCrewai, color: "#F97316" },
      { name: "MCP", icon: TbPlugConnected, color: "#22D3EE" },
      { name: "Pinecone", icon: TbCone, color: "#14B8A6" },
      { name: "ChromaDB", icon: TbColorSwatch, color: "#F97316" },
      { name: "FAISS", icon: TbVectorBezier, color: "#4F8AF4" },
      { name: "Weaviate", icon: TbNetwork, color: "#22C55E" },
      { name: "Embeddings", icon: TbLayersLinked, color: "#FB923C" },
      { name: "Prompt Engineering", icon: TbMessage2Bolt, color: "#FACC15" },
      { name: "OpenAI", icon: TbSparkles, color: "#10A37F" },
      { name: "Claude", icon: SiAnthropic, color: "#D97757" },
      { name: "Gemini", icon: SiGooglegemini, color: "#8E75B2" },
    ],
  },
  {
    title: "Database",
    blurb: "Reliable storage, simple ops",
    items: [
      { name: "PostgreSQL", icon: SiPostgresql, color: "#4169E1" },
      { name: "SQLite", icon: SiSqlite, color: "#003B57" },
    ],
  },
  {
    title: "Tools",
    blurb: "The daily driver toolkit",
    items: [
      { name: "Git", icon: SiGit, color: "#F05032" },
      { name: "GitHub", icon: SiGithub, color: "#E6EDF3" },
      { name: "VS Code", icon: TbBrandVscode, color: "#3B82F6" },
      { name: "Postman", icon: SiPostman, color: "#FF6C37" },
      { name: "n8n", icon: SiN8N, color: "#EA4B71" },
      { name: "AWS", icon: TbBrandAws, color: "#F59E0B" },
      { name: "Docker", icon: SiDocker, color: "#2496ED" },
    ],
  },
];

export const learningItems: LearningItem[] = [
  {
    name: "Kubernetes",
    icon: SiKubernetes,
    color: "#326CE5",
    note: "Orchestrating containers at scale",
  },
  {
    name: "LLM Fine-tuning",
    icon: TbAdjustments,
    color: "#F472B6",
    note: "Adapting open-source models with LoRA/PEFT instead of just calling APIs",
  },
];

// GenAI projects lead — freelance clients hiring for AI want to see AI
// first, not e-commerce. Order here drives display order.
export const projects: Project[] = [
  {
    name: "Fieldnote",
    category: "genai",
    tagline: "AI research agent",
    description:
      "Researching a topic usually means a dozen tabs and manually cross-checking sources → built an agent that plans sub-questions, searches the live web, and verifies its own evidence → delivers a cited report end to end, no human steering the middle steps.",
    metric: { label: "Full agent run", value: "~75s" },
    image: fieldnoteImg,
    url: "https://fieldnote-ai-research-agent.vercel.app/",
    tags: ["LangGraph", "Gemini", "FastAPI", "React"],
    highlights: [
      "Multi-step agent: plan → search → verify → write",
      "Self-corrects and retries when evidence is thin",
    ],
    isDemo: true,
  },
  {
    name: "DocsQA",
    category: "genai",
    tagline: "RAG chatbot for your documents",
    description:
      "Finding one answer buried in a PDF means manually scanning pages → built a RAG chatbot with token-based chunking and a structured-output pipeline → every answer cites the exact chunk and page, in about 4 seconds.",
    metric: { label: "Answer latency", value: "~4s" },
    image: docsQaImg,
    url: "https://docsqa-five.vercel.app/",
    tags: ["React", "FastAPI", "LangChain", "Gemini", "ChromaDB"],
    highlights: [
      "Inline citations linked to source chunk & page",
      "Schema-enforced answers, not freeform parsing",
    ],
    isDemo: true,
  },
  {
    name: "LeadPilot",
    category: "genai",
    tagline: "AI lead intake agent",
    description:
      "Raw inquiries pile up unlogged, unanswered, and easy to lose → built an agent that extracts structured details, logs to a Sheet, drafts a reply, and notifies Slack in one pass → a lead fully processed in about 35 seconds, connected to a real Sheet and Slack channel, not a simulation.",
    metric: { label: "Lead → logged & notified", value: "~35s" },
    image: leadpilotImg,
    url: "https://leadpilot-flame.vercel.app/",
    tags: ["LangGraph", "Gemini", "Google Sheets API", "Slack API"],
    highlights: [
      "One pass: extract → log to Sheet → draft reply → notify Slack",
      "Connected to a real Sheet and Slack channel, not a simulation",
    ],
    isDemo: true,
  },
  {
    name: "GoVastra",
    category: "webdev",
    tagline: "Premium Indian saree e-commerce",
    description:
      "Generic e-commerce templates don't read as premium → built a custom editorial-style storefront with auth, cart, wishlist and real Razorpay payments, verified server-side → a live, operating store today, not a demo.",
    metric: { label: "Page load", value: "~1.6s" },
    image: govastraImg,
    url: "https://govastra.com/",
    tags: ["React", "Vite", "Auth & Cart", "Razorpay", "Live Chat"],
    highlights: [
      "Full storefront: auth, cart, wishlist, checkout",
      "Real payments via Razorpay integration",
    ],
    caseStudy:
      "GoVastra needed to feel like a boutique, not a generic e-commerce template, while still handling real inventory and payments reliably. The main decision was building a custom, editorial-style storefront — typography-led, image-forward — instead of reaching for an off-the-shelf theme, so the brand actually reads as premium. Wiring Razorpay into checkout correctly, with payment verification handled server-side rather than trusted from the client, was the trickiest technical piece — a naive version of that is a common e-commerce security mistake. It's a real, operating store today, not a demo.",
  },
  {
    name: "Calculator Cart",
    category: "webdev",
    tagline: "30+ free online calculators",
    description:
      "Most free calculator sites bury the tool under pop-ups and slow ad networks → built 29 calculators across 7 categories, entirely client-side → loads in about 2.5 seconds and has run ad-monetized since launch with zero maintenance.",
    metric: { label: "Calculators", value: "29 across 7 categories" },
    image: calculatorCartImg,
    url: "https://calculatorcart.com/",
    tags: ["React", "Vite", "SEO", "Google AdSense"],
    highlights: [
      "29 calculators across 7 categories",
      "Monetized with Google AdSense",
    ],
    caseStudy:
      "Built this after noticing how many \"free calculator\" sites bury the actual tool under pop-ups and slow ad networks. The key decision was keeping every calculation client-side — no backend round-trip for a BMI or EMI result — so it feels instant even on a slow connection. Organizing 29 tools into 7 clear categories (instead of one long list) was the main UX challenge, solved with a searchable, filterable grid. It's been live and earning passive ad revenue since launch, with effectively zero ongoing maintenance.",
  },
  {
    name: "Soda",
    category: "webdev",
    tagline: "Beverage brand landing page",
    description:
      "Product pages for beverage brands usually default to a generic template → built a motion-led hero with a rotating product carousel and a full animated scroll story → a launch-ready storefront front page, live in the browser.",
    metric: { label: "Hero", value: "Full motion, no backend" },
    image: sodaImg,
    url: "https://soda-website.vercel.app/",
    tags: ["React", "Framer Motion", "Tailwind"],
    highlights: [
      "Rotating product carousel with live pricing cards",
      "Scroll-driven animated hero, zero backend needed",
    ],
    isDemo: true,
  },
  {
    name: "Crestline",
    category: "webdev",
    tagline: "Construction & real estate site",
    description:
      "Design-build firms need one site that sells both construction services and live listings → built a dual-purpose homepage with a property search bar over a full-bleed hero → a filterable listings flow in a single scroll, no separate portal.",
    metric: { label: "Search", value: "4 live filter fields" },
    image: realestateImg,
    url: "https://real-estate-delta-cyan.vercel.app/",
    tags: ["React", "Tailwind", "Property Search"],
    highlights: [
      "Property search bar with type, location, price & beds",
      "Ground-up to done-right narrative in one hero",
    ],
    isDemo: true,
  },
  {
    name: "Élané",
    category: "webdev",
    tagline: "Luxury salon booking site",
    description:
      "Salon sites often look like a booking widget bolted onto a template → built an editorial, cinematic homepage with a parallax hero and layered imagery → a booking-ready experience that reads boutique, not generic.",
    metric: { label: "Feel", value: "Editorial, parallax hero" },
    image: saloonImg,
    url: "https://saloon-six-jade.vercel.app/",
    tags: ["React", "Framer Motion", "Parallax"],
    highlights: [
      "Parallax, layered hero with serif editorial type",
      "Direct booking & services CTAs above the fold",
    ],
    isDemo: true,
  },
  {
    name: "Alden",
    category: "webdev",
    tagline: "University admissions site",
    description:
      "Prospective students bounce off cluttered .edu templates → built a clean admissions site with live stat cards (founded, rank, faculty ratio) and a program explorer → an application funnel that actually reads as trustworthy.",
    metric: { label: "Stats bar", value: "4 live metrics" },
    image: aldenImg,
    url: "https://alden-university.vercel.app/",
    tags: ["React", "Tailwind", "Illustration"],
    highlights: [
      "Animated stat bar: founded, programs, rank, ratio",
      "Illustrated campus hero instead of stock photography",
    ],
    isDemo: true,
  },
  {
    name: "Roadly",
    category: "webdev",
    tagline: "Bus travel booking site",
    description:
      "Bus ticket sites bury the actual search under ads and clutter → built a from/to/date/passengers search widget over a sunset-gradient hero → a book-ready flow, search to seat, with nothing standing in the way.",
    metric: { label: "Search", value: "4-field live booking form" },
    image: bustravelImg,
    url: "https://bustravel-alpha.vercel.app/",
    tags: ["React", "Tailwind", "Booking UI"],
    highlights: [
      "From/to/date/passenger search with swap control",
      "Route-first layout: search before scroll, not after",
    ],
    isDemo: true,
  },
];

// Empty for now — the Testimonials section hides itself automatically when
// this array is empty. Add your first real review here once you have one,
// e.g.:
// { quote: "...", name: "Client Name", role: "Role, Company" }
export const testimonials: Testimonial[] = [];

export const services: Service[] = [
  {
    icon: LayoutTemplate,
    title: "End-to-End Websites & Web Apps",
    description:
      "Any type of website — business sites, landing pages, e-commerce stores, dashboards, internal tools. Design to deployment, handled solo, start to finish. See Calculator Cart and GoVastra above.",
    tags: ["React", "TypeScript", "FastAPI", "Vite", "Razorpay", "SEO"],
    featured: true,
  },
  {
    icon: MessageSquareText,
    title: "RAG Chatbots & Document Q&A",
    description:
      "Turn your docs, PDFs, or knowledge base into a chatbot that answers accurately — grounded in your content, with sources, not hallucinations.",
    tags: ["LangChain", "LlamaIndex", "Pinecone / ChromaDB"],
  },
  {
    icon: Workflow,
    title: "AI Agent Automation",
    description:
      "Agents that connect to your actual tools — CRM, email, Slack, sheets — and get the task done, not just chat about it.",
    tags: ["CrewAI", "LangGraph", "n8n"],
  },
  {
    icon: Plug,
    title: "LLM API Integration",
    description:
      "Wire GPT, Claude, or Gemini into your existing product — a FastAPI backend, a React frontend, or an internal workflow.",
    tags: ["OpenAI", "Claude", "FastAPI"],
  },
  {
    icon: Bot,
    title: "Custom AI Tooling",
    description:
      "Prompt pipelines, evaluation setups, and internal tools shaped around how your team actually works — not a generic template.",
    tags: ["Prompt Engineering", "Python", "Docker"],
  },
];
