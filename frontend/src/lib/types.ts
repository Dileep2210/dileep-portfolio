export type Page<T> = { items: T[]; total: number; page: number; page_size: number };

export type Category = { id: string; name: string; slug: string; description?: string; position?: number };

export type GalleryItem = { media_id: string; url: string; alt_text: string; caption: string };

export type Project = {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  summary: string;
  overview: string;
  challenges: string;
  solutions: string;
  outcomes: string;
  contribution: string;
  architecture: string;
  features: string[];
  timeline: string;
  client_name: string;
  is_client_project: boolean;
  is_demo: boolean;
  live_url: string;
  github_url: string;
  video_url: string;
  highlight_label: string;
  highlight_value: string;
  cover_url: string;
  featured: boolean;
  status: "draft" | "published";
  position: number;
  seo_title: string;
  seo_description: string;
  published_at: string | null;
  category_id: string | null;
  category: Category | null;
  technologies: string[];
  gallery: GalleryItem[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  features: string[];
  tech_stack: string[];
  icon: string;
  cover_url: string;
  starting_price: string | null;
  price_currency: string;
  price_note: string;
  delivery_estimate: string;
  featured: boolean;
  status: "draft" | "published";
  position: number;
  seo_title: string;
  seo_description: string;
};

export type PublicTestimonial = {
  id: string;
  client_name: string;
  company: string;
  designation: string;
  content: string;
  rating: number | null;
  testimonial_date: string | null;
  avatar_url: string;
  featured: boolean;
  project_slug: string | null;
  project_title: string | null;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string;
  status: "draft" | "published";
  published_at: string | null;
  reading_minutes: number;
  seo_title: string;
  seo_description: string;
  canonical_url: string;
  category_id: string | null;
  category: Category | null;
  tags: string[];
  updated_at: string;
};

export type Skill = { name: string; icon: string; color: string; note: string; featured: boolean; is_learning: boolean };
export type SkillGroup = { category: { id: string; name: string; slug: string; blurb: string }; skills: Skill[] };

export type Experience = {
  id: string;
  kind: "work" | "education" | "achievement";
  title: string;
  organization: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  description: string;
  highlights: string[];
};

export type NavItem = { id: string; label: string; href: string; location: "header" | "footer"; open_in_new_tab: boolean };
export type SocialLink = { id: string; platform: string; label: string; url: string; icon: string };
export type HomepageSection = {
  id: string;
  key: string;
  title: string;
  subtitle: string;
  body: string;
  data: Record<string, unknown>;
  position: number;
  is_visible: boolean;
};

export type SiteSettings = {
  developer_name: string;
  first_name: string;
  headline: string;
  rotating_roles: string[];
  introduction: string;
  bio: string;
  philosophy: string;
  journey: string;
  highlights: { label: string; value: string }[];
  trust_points: string[];
  email: string | null;
  phone: string;
  location: string;
  availability: string;
  profile_image_url: string;
  resume_url: string;
  contact_cta_title: string;
  contact_cta_text: string;
  footer_text: string;
  theme_default: "dark" | "light" | "system";
  site_url: string;
  seo_default_title: string;
  seo_default_description: string;
  og_image_url: string;
  budget_options: string[];
  show_testimonial_form: boolean;
};

export type Site = {
  settings: SiteSettings;
  navigation: NavItem[];
  social_links: SocialLink[];
  homepage: HomepageSection[];
  resume_url: string | null;
};

export type SeoMeta = { page_key: string; title: string; description: string; og_image_url: string; canonical_path: string; noindex: boolean };

export type Me = {
  id: string;
  email: string;
  full_name: string;
  roles: string[];
  permissions: string[];
  mfa_enabled: boolean;
  last_login_at: string | null;
};
