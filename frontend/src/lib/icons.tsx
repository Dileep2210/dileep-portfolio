/**
 * Whitelisted icon registry. The CMS stores an icon *key*; it can never inject markup or load
 * arbitrary SVG. Unknown keys fall back to a neutral icon.
 */
import type { ComponentType } from "react";
import {
  Bot,
  Building2,
  Cable,
  Code2,
  FileSearch,
  Gauge,
  Globe,
  Layers,
  LayoutDashboard,
  LayoutTemplate,
  Mail,
  MessageSquareText,
  Paintbrush,
  Plug,
  Rocket,
  Server,
  ShoppingCart,
  Sparkles,
  Workflow,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";
import {
  SiAnthropic,
  SiCloudinary,
  SiCrewai,
  SiCss,
  SiDocker,
  SiFastapi,
  SiFlask,
  SiGit,
  SiGithub,
  SiGooglegemini,
  SiHtml5,
  SiInstagram,
  SiJavascript,
  SiKubernetes,
  SiLangchain,
  SiN8N,
  SiNextdotjs,
  SiPostgresql,
  SiPostman,
  SiPython,
  SiRailway,
  SiRazorpay,
  SiReact,
  SiRedis,
  SiSass,
  SiSqlite,
  SiStripe,
  SiTailwindcss,
  SiTypescript,
  SiVercel,
  SiVite,
  SiX,
  SiYoutube,
} from "react-icons/si";
import {
  TbAdjustments,
  TbApi,
  TbBooks,
  TbBrain,
  TbBrandAws,
  TbBrandVscode,
  TbColorSwatch,
  TbCone,
  TbDatabaseCog,
  TbDatabaseSearch,
  TbLayersLinked,
  TbMessage2Bolt,
  TbNetwork,
  TbPlugConnected,
  TbShieldLock,
  TbSparkles,
  TbTopologyStar3,
  TbVectorBezier,
} from "react-icons/tb";

export type IconComponent = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;

export const ICONS: Record<string, IconComponent> = {
  // tech
  SiReact, SiTypescript, SiJavascript, SiHtml5, SiCss, SiTailwindcss, SiSass, SiVite, SiPython, SiFastapi, SiFlask,
  SiRazorpay, SiPostgresql, SiSqlite, SiLangchain, SiCrewai, SiAnthropic, SiGooglegemini, SiDocker, SiVercel,
  SiRailway, SiKubernetes, SiGit, SiGithub, SiPostman, SiN8N, SiNextdotjs, SiStripe, SiCloudinary, SiRedis,
  TbApi, TbDatabaseCog, TbShieldLock, TbBrain, TbDatabaseSearch, TbBooks, TbTopologyStar3, TbPlugConnected, TbCone,
  TbColorSwatch, TbVectorBezier, TbNetwork, TbLayersLinked, TbMessage2Bolt, TbSparkles, TbAdjustments, TbBrandAws,
  TbBrandVscode,
  // services / UI
  LayoutTemplate, Building2, ShoppingCart, Layers, LayoutDashboard, Server, Bot, MessageSquareText, FileSearch,
  Plug, Workflow, Cable, Paintbrush, Gauge, Rocket, Code2, Sparkles, Globe, Mail,
  // short aliases used by homepage data and social links
  code: Code2, bot: Bot, rocket: Rocket, sparkles: Sparkles, github: FaGithub, linkedin: FaLinkedin, mail: Mail,
  instagram: SiInstagram, x: SiX, twitter: SiX, youtube: SiYoutube, globe: Globe,
};

export const ICON_KEYS = Object.keys(ICONS).sort((a, b) => a.localeCompare(b));

export function iconFor(key: string | undefined | null, fallback: IconComponent = Sparkles): IconComponent {
  return (key && ICONS[key]) || fallback;
}
