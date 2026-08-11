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
  tagline: string;
  description: string;
  image: string;
  url: string;
  tags: string[];
  highlights: string[];
  isDemo?: boolean;
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
  resumeUrl: "#",
};

export const trustPoints: string[] = [
  "Solo freelancer — direct communication, no middlemen",
  "Clear scope & timeline agreed before any code is written",
  "Post-launch support included, not an extra line item",
  "Remote-friendly — happy to work across timezones",
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
  { label: "Work", href: "#work" },
  { label: "Services", href: "#services" },
  { label: "Stack", href: "#stack" },
  { label: "Learning", href: "#learning" },
  { label: "Contact", href: "#contact" },
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

export const projects: Project[] = [
  {
    name: "Calculator Cart",
    tagline: "30+ free online calculators",
    description:
      "29 free calculators across 7 categories — EMI, SIP, GST, BMI and more. No sign-up, ad-supported.",
    image: calculatorCartImg,
    url: "https://calculatorcart.com/",
    tags: ["React", "Vite", "SEO", "Google AdSense"],
    highlights: [
      "29 calculators across 7 categories",
      "Monetized with Google AdSense",
    ],
  },
  {
    name: "GoVastra",
    tagline: "Premium Indian saree e-commerce",
    description:
      "Editorial-style storefront for handwoven sarees — full shopping experience with auth, cart, wishlist and Razorpay payments.",
    image: govastraImg,
    url: "https://govastra.com/",
    tags: ["React", "Vite", "Auth & Cart", "Razorpay", "Live Chat"],
    highlights: [
      "Full storefront: auth, cart, wishlist, checkout",
      "Real payments via Razorpay integration",
    ],
  },
  {
    name: "DocsQA",
    tagline: "RAG chatbot for your documents",
    description:
      "Upload a PDF or text file, ask questions, get answers grounded in the content — every claim cites the exact chunk and page it came from.",
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
    name: "Fieldnote",
    tagline: "AI research agent",
    description:
      "Give it a topic — it plans sub-questions, searches the live web, verifies its own evidence, and writes a cited report end to end, no human steering the middle steps.",
    image: fieldnoteImg,
    url: "https://fieldnote-ai-research-agent.vercel.app/",
    tags: ["LangGraph", "Gemini", "FastAPI", "React"],
    highlights: [
      "Multi-step agent: plan → search → verify → write",
      "Self-corrects and retries when evidence is thin",
    ],
    isDemo: true,
  },
];

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
