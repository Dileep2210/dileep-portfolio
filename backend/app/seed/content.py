"""Initial content, migrated from frontend/src/data/portfolio.ts plus verified new projects/services.

Rules followed here:
- Nothing invented: no testimonials, no prices, no employment history, no client metrics.
- Claims about MRS Fashion Jewel and CartInMinutes come only from their source repositories and the live site
  (see docs/INITIAL_AUDIT.md section 6).
- Existing project copy is carried over unchanged so the owner can review it in the admin.
"""

PROFILE = {
    "developer_name": "Dileep Kumar Panchumarthi",
    "first_name": "Dileep",
    "headline": "Full Stack Developer & GenAI Developer",
    "rotating_roles": [
        "Full Stack Developer",
        "GenAI Application Developer",
        "Python & FastAPI Developer",
        "React + TypeScript Engineer",
        "LLM Application Builder",
    ],
    "introduction": (
        "I build end to end — from custom business websites and e-commerce stores to AI-powered applications "
        "using LLMs — and take each project from idea to a real, live product."
    ),
    "bio": (
        "I'm a Full Stack Developer who builds end to end — from custom business websites and e-commerce stores to "
        "AI-powered applications using LLMs. Whatever the project, I take it from idea to a real, live product. I care "
        "about clean interfaces, fast APIs, and shipping things that actually work."
    ),
    "philosophy": (
        "Dependable engineering fundamentals paired with a genuine curiosity for what generative AI can unlock. "
        "Clear scope before code, security and testing as part of the build rather than an afterthought, and "
        "pragmatic architecture so ideas turn into working products quickly."
    ),
    "journey": "",
    "highlights": [
        {"label": "Focus", "value": "Full-Stack & GenAI Development"},
        {"label": "Currently learning", "value": "Agentic AI, MCP & AWS"},
        {"label": "Building with", "value": "React, FastAPI & LLMs"},
        {"label": "Available for", "value": "Freelance projects"},
    ],
    "trust_points": [
        "Direct communication — you work with me, not an account manager",
        "Clear scope & timeline agreed before any code is written",
        "Post-launch support included, not an extra line item",
        "Based in India (IST) — flexible hours, happy to sync with your timezone",
        "Actively taking on new freelance projects right now",
    ],
    "email": "dileepfreelancer22@gmail.com",
    "phone": "",
    "location": "India",
    "availability": "Available for freelance — websites, apps & AI features",
    "profile_image_url": "/images/profile.webp",
    "resume_url": "/resume.pdf",
    "contact_cta_title": "Let's build your next project",
    "contact_cta_text": (
        "Open for freelance work — websites, web apps and AI features. The fastest way to reach me is the form "
        "below, email, or LinkedIn."
    ),
    "footer_text": "Designed & built by Dileep Kumar Panchumarthi.",
    "theme_default": "dark",
    "site_url": "https://dileepkumar-dev.vercel.app",
    "seo_default_title": "Dileep Kumar Panchumarthi | Full Stack & GenAI Developer",
    "seo_default_description": (
        "Full Stack Developer and GenAI developer building websites, e-commerce stores, FastAPI backends and "
        "LLM-powered applications from idea to launch."
    ),
    "og_image_url": "/og.png",
    "budget_options": ["Under ₹25,000", "₹25,000 – ₹75,000", "₹75,000 – ₹2,00,000", "Above ₹2,00,000", "Not sure yet"],
    "show_testimonial_form": True,
}

NAVIGATION = [
    ("Home", "/", "header"), ("About", "/about", "header"), ("Services", "/services", "header"),
    ("Projects", "/projects", "header"), ("Blog", "/blog", "header"), ("Contact", "/contact", "header"),
    ("About", "/about", "footer"), ("Services", "/services", "footer"), ("Projects", "/projects", "footer"),
    ("Blog", "/blog", "footer"), ("Contact", "/contact", "footer"),
]

SOCIAL = [
    ("github", "GitHub", "https://github.com/Dileep2210", "github"),
    ("linkedin", "LinkedIn", "https://www.linkedin.com/in/panchumarthi-dileep-kumar-a6a82a219/", "linkedin"),
    ("email", "Email", "mailto:dileepfreelancer22@gmail.com", "mail"),
]

HOMEPAGE = [
    {
        "key": "hero", "title": "Full Stack Developer & GenAI Developer",
        "subtitle": "Websites, e-commerce, FastAPI backends and LLM-powered apps — taken from idea to a live product.",
        "data": {
            "primary_cta": {"label": "View My Projects", "href": "/projects"},
            "secondary_cta": {"label": "Hire Me", "href": "/contact"},
            "resume_label": "Download Resume",
        },
    },
    {
        "key": "intro", "title": "Who I am",
        "subtitle": "",
        "body": "",
    },
    {
        "key": "about", "title": "Turning LLMs into real products",
        "subtitle": (
            "A snapshot of how I like to work: dependable engineering fundamentals paired with a genuine curiosity "
            "for what generative AI can unlock."
        ),
        "data": {
            "pillars": [
                {"icon": "code", "title": "Full Stack Craft", "text": "React, TypeScript and modern tooling on the front end, Python APIs with FastAPI and Flask on the back end."},
                {"icon": "bot", "title": "GenAI Native", "text": "I build with LLMs day to day — RAG pipelines, LangChain/LangGraph agents, embeddings and vector search."},
                {"icon": "rocket", "title": "Ship Fast", "text": "Vite-powered workflows and pragmatic architecture so ideas turn into working products quickly."},
                {"icon": "sparkles", "title": "Always Learning", "text": "Right now I'm actively deepening my skills in Kubernetes and LLM fine-tuning."},
            ]
        },
    },
    {"key": "skills", "title": "Tools I reach for", "subtitle": "A living toolkit spanning the front end, the back end and the GenAI layer that ties them together."},
    {"key": "services", "title": "Whatever you're building, I can ship it", "subtitle": "Freelance-ready, end to end — from a business website to a production AI feature."},
    {"key": "projects", "title": "Selected work", "subtitle": "Client projects, live products and demos — built end to end."},
    {"key": "testimonials", "title": "What clients say", "subtitle": "Feedback from the people I've worked with."},
    {
        "key": "process", "title": "How I work", "subtitle": "A simple, transparent process from first call to launch.",
        "data": {
            "steps": [
                {"title": "Discover", "text": "We talk through your goals, users and constraints so the problem is clear before anything is designed."},
                {"title": "Scope & plan", "text": "You get a clear scope, timeline and stack agreed before any code is written."},
                {"title": "Build & review", "text": "I build in small, reviewable steps and share progress so you can give feedback early."},
                {"title": "Test & launch", "text": "Testing, security checks and deployment are part of the build, not an afterthought."},
                {"title": "Support", "text": "Post-launch support is included, so fixes and small changes do not stall."},
            ]
        },
    },
    {
        "key": "why_me", "title": "Why work with me", "subtitle": "",
        "data": {"points_source": "settings.trust_points"},
    },
    {"key": "contact_cta", "title": "Let's build your next project", "subtitle": "Tell me what you need — I usually reply within 1–2 business days."},
]

SEO = [
    ("home", "Dileep Kumar Panchumarthi | Full Stack & GenAI Developer", "Full Stack Developer and GenAI developer building websites, e-commerce stores, FastAPI backends and LLM-powered applications."),
    ("about", "About Dileep Kumar Panchumarthi", "Full Stack Developer working across React, Python/FastAPI, PostgreSQL and GenAI — how I work and what I build."),
    ("services", "Services — Websites, Full-Stack Apps & AI Development", "Custom websites, e-commerce, admin dashboards, FastAPI backends, AI chatbots, RAG and LLM integration."),
    ("projects", "Projects — Client Work & Demos", "Client e-commerce builds, GenAI applications and web projects by Dileep Kumar Panchumarthi."),
    ("blog", "Blog — Full-Stack & AI Engineering Notes", "Articles on React, Python, FastAPI, PostgreSQL, RAG, LLMs and application security."),
    ("contact", "Contact — Hire a Full Stack & GenAI Developer", "Tell me about your project: websites, web apps, admin dashboards and AI features."),
]

SKILL_CATEGORIES = [
    ("Frontend", "frontend", "Interfaces that feel fast"),
    ("Backend", "backend", "APIs and business logic"),
    ("Database", "database", "Data that stays consistent"),
    ("AI / GenAI", "ai-genai", "Where the interesting problems live"),
    ("Cloud / DevOps", "cloud-devops", "Shipping and running it"),
    ("Tools", "tools", "Day-to-day toolkit"),
]

# (category slug, name, icon key, colour, featured, learning, note)
SKILLS = [
    ("frontend", "React", "SiReact", "#61DAFB", True, False, ""),
    ("frontend", "TypeScript", "SiTypescript", "#3178C6", True, False, ""),
    ("frontend", "JavaScript", "SiJavascript", "#F7DF1E", False, False, ""),
    ("frontend", "HTML5", "SiHtml5", "#E34F26", False, False, ""),
    ("frontend", "CSS3", "SiCss", "#1572B6", False, False, ""),
    ("frontend", "Tailwind CSS", "SiTailwindcss", "#38BDF8", True, False, ""),
    ("frontend", "SCSS", "SiSass", "#CC6699", False, False, ""),
    ("frontend", "Vite", "SiVite", "#B473FA", False, False, ""),
    ("backend", "Python", "SiPython", "#3776AB", True, False, ""),
    ("backend", "FastAPI", "SiFastapi", "#009688", True, False, ""),
    ("backend", "Flask", "SiFlask", "#B8B8B8", False, False, ""),
    ("backend", "REST APIs", "TbApi", "#38BDF8", False, False, ""),
    ("backend", "SQLAlchemy", "TbDatabaseCog", "#D71F00", False, False, ""),
    ("backend", "JWT Authentication", "TbShieldLock", "#A78BFA", False, False, ""),
    ("backend", "Razorpay", "SiRazorpay", "#3395FF", False, False, ""),
    ("database", "PostgreSQL", "SiPostgresql", "#4169E1", True, False, ""),
    ("database", "SQLite", "SiSqlite", "#003B57", False, False, ""),
    ("ai-genai", "LLMs", "TbBrain", "#A78BFA", True, False, ""),
    ("ai-genai", "RAG", "TbDatabaseSearch", "#34D399", True, False, ""),
    ("ai-genai", "LangChain", "SiLangchain", "#1C3C3C", True, False, ""),
    ("ai-genai", "LlamaIndex", "TbBooks", "#8B5CF6", False, False, ""),
    ("ai-genai", "LangGraph", "TbTopologyStar3", "#22D3EE", True, False, ""),
    ("ai-genai", "CrewAI", "SiCrewai", "#F97316", False, False, ""),
    ("ai-genai", "MCP", "TbPlugConnected", "#22D3EE", False, False, ""),
    ("ai-genai", "Pinecone", "TbCone", "#14B8A6", False, False, ""),
    ("ai-genai", "ChromaDB", "TbColorSwatch", "#F97316", False, False, ""),
    ("ai-genai", "FAISS", "TbVectorBezier", "#4F8AF4", False, False, ""),
    ("ai-genai", "Weaviate", "TbNetwork", "#22C55E", False, False, ""),
    ("ai-genai", "Embeddings", "TbLayersLinked", "#FB923C", False, False, ""),
    ("ai-genai", "Prompt Engineering", "TbMessage2Bolt", "#FACC15", False, False, ""),
    ("ai-genai", "OpenAI", "TbSparkles", "#10A37F", False, False, ""),
    ("ai-genai", "Claude", "SiAnthropic", "#D97757", False, False, ""),
    ("ai-genai", "Gemini", "SiGooglegemini", "#8E75B2", False, False, ""),
    ("ai-genai", "LLM Fine-tuning", "TbAdjustments", "#F472B6", False, True, "Adapting open-source models with LoRA/PEFT instead of just calling APIs"),
    ("cloud-devops", "Docker", "SiDocker", "#2496ED", False, False, ""),
    ("cloud-devops", "AWS", "TbBrandAws", "#F59E0B", False, False, ""),
    ("cloud-devops", "Vercel", "SiVercel", "#E6EDF3", False, False, ""),
    ("cloud-devops", "Railway", "SiRailway", "#E6EDF3", False, False, ""),
    ("cloud-devops", "Kubernetes", "SiKubernetes", "#326CE5", False, True, "Orchestrating containers at scale"),
    ("tools", "Git", "SiGit", "#F05032", False, False, ""),
    ("tools", "GitHub", "SiGithub", "#E6EDF3", False, False, ""),
    ("tools", "VS Code", "TbBrandVscode", "#3B82F6", False, False, ""),
    ("tools", "Postman", "SiPostman", "#FF6C37", False, False, ""),
    ("tools", "n8n", "SiN8N", "#EA4B71", False, False, ""),
]

PROJECT_CATEGORIES = [
    ("E-commerce", "e-commerce", "Online stores with payments, accounts and admin"),
    ("GenAI", "genai", "LLM, RAG and agent applications"),
    ("Web Development", "web-development", "Websites and web apps"),
]

MRS_OVERVIEW = """MRS Ladies Fashion is a US-focused jewelry e-commerce business. I built the complete platform as three separate applications that share one API:

- **Storefront** — Next.js 16 (App Router), server-rendered so search engines receive complete HTML.
- **Staff portal** — a React + Vite single-page app on its own URL, sign-in only.
- **API** — Python FastAPI with SQLAlchemy 2 and PostgreSQL, used by both apps.

Shoppers browse the catalog by category, collection and occasion, keep a wishlist and cart, and pay by card through Stripe. Staff manage products, stock, orders, returns, coupons, content and settings from the portal."""

MRS_ARCHITECTURE = """- **Storefront:** Next.js 16 server rendering for SEO; product images served from Cloudinary.
- **Staff portal:** React + Vite SPA, separate origin, `noindex`.
- **API:** FastAPI + SQLAlchemy 2 + PostgreSQL. Prices, stock and payment state are decided on the server; stock is locked while an order is placed so the last item can only be sold once.
- **Payments:** Stripe card checkout — card numbers never reach the application.
- **Real-time:** Server-Sent Events push staff changes (products, stock, prices, homepage) to open storefront pages and new orders to the staff portal, published only after the database transaction commits.
- **Email:** transactional email for verification codes, password resets and order communication."""

MRS_CONTRIBUTION = """I designed and built the whole platform — storefront, staff portal and API — including the database schema, payment flow, security hardening, SEO and the QA/security test passes."""

MRS_CHALLENGES = """- Selling the last item in stock exactly once while several shoppers check out at the same time.
- Making a client-rendered-feeling store fully indexable by search engines.
- Giving non-technical staff full control of the catalog and homepage without exposing risky operations."""

MRS_SOLUTIONS = """- Server-side pricing and stock locking during order placement; Stripe handles card data.
- Server rendering with per-page titles, canonical URLs, Open Graph tags and JSON-LD (Organization, WebSite, Product, BreadcrumbList, ItemList, FAQPage), plus a sitemap generated from the live catalog.
- Invitation-only staff accounts, authenticator-app two-factor sign-in with recovery codes, account lockout, re-confirmation of the password for sensitive actions, and an audit log for exports."""

MRS_OUTCOMES = """- Live at mrsfashionjewel.com, delivering across the USA with Stripe card checkout.
- Security, regression, performance and load-testing passes documented, with findings remediated."""

CART_OVERVIEW = """CartInMinutes is a quick-commerce grocery and essentials delivery **MVP** (demo brand "Zippi"). It is a production-oriented demo, not a live business: payments and maps run behind abstraction layers with demo fallbacks.

It covers the full flow — browsing and search, cart and checkout, live order tracking and an admin dashboard."""

CART_ARCHITECTURE = """- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind, React Query, Zustand, React Hook Form + Zod, Framer Motion, Recharts — storefront and admin in one app.
- **Backend:** FastAPI, SQLAlchemy 2, Alembic, Pydantic v2, PostgreSQL, optional Redis, WebSockets.
- **Auth:** JWT access + refresh tokens (refresh hashed at rest), forgot-password OTP, role-based admin routes.
- **Real-time:** a `/ws` channel pushes order status, delivery movement and notifications; a simulator advances demo orders.
- **Run:** Docker Compose (frontend, backend, PostgreSQL, Redis)."""

PROJECTS = [
    {
        "title": "MRS Fashion Jewel", "slug": "mrs-fashion-jewel", "category": "e-commerce",
        "tagline": "US jewelry e-commerce platform",
        "summary": "A full jewelry e-commerce platform for a US client: server-rendered Next.js storefront, React staff portal and a FastAPI + PostgreSQL API with Stripe checkout.",
        "overview": MRS_OVERVIEW, "architecture": MRS_ARCHITECTURE, "contribution": MRS_CONTRIBUTION,
        "challenges": MRS_CHALLENGES, "solutions": MRS_SOLUTIONS, "outcomes": MRS_OUTCOMES,
        "features": [
            "Product catalog with categories, collections, occasions and search",
            "Customer accounts with emailed verification codes",
            "Wishlist, cart and Stripe card checkout",
            "Order management, returns and coupons",
            "Staff portal with roles, invitations and two-factor sign-in",
            "Transactional email",
            "Shipping options (flat rate by default)",
            "Server-rendered SEO with structured data and live sitemap",
            "Real-time updates between staff portal and storefront",
            "Security hardening and regression testing",
        ],
        "client_name": "MRS Ladies Fashion", "is_client_project": True, "is_demo": False,
        "live_url": "https://mrsfashionjewel.com/", "highlight_label": "Checkout", "highlight_value": "Stripe card payments",
        "cover_url": "/images/projects/mrs-fashion-jewel.webp", "featured": True, "status": "published", "position": 0,
        "technologies": ["Next.js", "React", "TypeScript", "FastAPI", "Python", "SQLAlchemy", "PostgreSQL", "Stripe", "Cloudinary"],
        "seo_title": "MRS Fashion Jewel — US Jewelry E-commerce Platform",
        "seo_description": "Client project: Next.js storefront, React staff portal and FastAPI + PostgreSQL API with Stripe checkout for a US jewelry store.",
    },
    {
        "title": "CartInMinutes", "slug": "cartinminutes", "category": "e-commerce",
        "tagline": "Quick-commerce grocery delivery MVP",
        "summary": "A grocery and essentials quick-commerce MVP with search, cart and checkout, live order tracking over WebSockets and a full admin dashboard.",
        "overview": CART_OVERVIEW, "architecture": CART_ARCHITECTURE,
        "features": [
            "Home with banners, category rails and offers",
            "Search with suggestions and category filters",
            "Server-backed cart with guest-cart merge on login",
            "Coupons, address book and Buy Now checkout",
            "Live order tracking with a 6-stage timeline",
            "In-app notifications over WebSockets",
            "Admin dashboard: products, inventory, orders, customers, analytics",
        ],
        "is_client_project": False, "is_demo": True,
        "highlight_label": "Real-time", "highlight_value": "WebSocket order tracking",
        "cover_url": "", "featured": True, "status": "published", "position": 1,
        "technologies": ["Next.js", "React", "TypeScript", "FastAPI", "PostgreSQL", "Redis", "WebSockets", "Docker"],
        "seo_title": "CartInMinutes — Quick-commerce Grocery MVP",
        "seo_description": "Grocery delivery MVP with Next.js, FastAPI, PostgreSQL and WebSockets: search, cart, checkout, live tracking and admin.",
    },
]

LEGACY_PROJECTS = [
    ("Fieldnote", "genai", "AI research agent", "Researching a topic usually means a dozen tabs and manually cross-checking sources → built an agent that plans sub-questions, searches the live web, and verifies its own evidence → delivers a cited report end to end, no human steering the middle steps.", ("Full agent run", "~75s"), "/images/projects/proj-fieldnote.webp", "https://fieldnote-ai-research-agent.vercel.app/", ["LangGraph", "Gemini", "FastAPI", "React"], ["Multi-step agent: plan → search → verify → write", "Self-corrects and retries when evidence is thin"], True, ""),
    ("DocsQA", "genai", "RAG chatbot for your documents", "Finding one answer buried in a PDF means manually scanning pages → built a RAG chatbot with token-based chunking and a structured-output pipeline → every answer cites the exact chunk and page, in about 4 seconds.", ("Answer latency", "~4s"), "/images/projects/proj-docsqa.webp", "https://docsqa-five.vercel.app/", ["React", "FastAPI", "LangChain", "Gemini", "ChromaDB"], ["Inline citations linked to source chunk & page", "Schema-enforced answers, not freeform parsing"], True, ""),
    ("LeadPilot", "genai", "AI lead intake agent", "Raw inquiries pile up unlogged, unanswered, and easy to lose → built an agent that extracts structured details, logs to a Sheet, drafts a reply, and notifies Slack in one pass → a lead fully processed in about 35 seconds, connected to a real Sheet and Slack channel, not a simulation.", ("Lead → logged & notified", "~35s"), "/images/projects/proj-leadpilot.webp", "https://leadpilot-flame.vercel.app/", ["LangGraph", "Gemini", "Google Sheets API", "Slack API"], ["One pass: extract → log to Sheet → draft reply → notify Slack", "Connected to a real Sheet and Slack channel, not a simulation"], True, ""),
    ("GoVastra", "e-commerce", "Premium Indian saree e-commerce", "Generic e-commerce templates don't read as premium → built a custom editorial-style storefront with auth, cart, wishlist and real Razorpay payments, verified server-side → a live, operating store today, not a demo.", ("Page load", "~1.6s"), "/images/projects/proj-govastra.webp", "https://govastra.com/", ["React", "Vite", "Auth & Cart", "Razorpay", "Live Chat"], ["Full storefront: auth, cart, wishlist, checkout", "Real payments via Razorpay integration"], False, "GoVastra needed to feel like a boutique, not a generic e-commerce template, while still handling real inventory and payments reliably. The main decision was building a custom, editorial-style storefront — typography-led, image-forward — instead of reaching for an off-the-shelf theme, so the brand actually reads as premium. Wiring Razorpay into checkout correctly, with payment verification handled server-side rather than trusted from the client, was the trickiest technical piece — a naive version of that is a common e-commerce security mistake. It's a real, operating store today, not a demo."),
    ("Calculator Cart", "web-development", "30+ free online calculators", "Most free calculator sites bury the tool under pop-ups and slow ad networks → built 29 calculators across 7 categories, entirely client-side → loads in about 2.5 seconds and has run ad-monetized since launch with zero maintenance.", ("Calculators", "29 across 7 categories"), "/images/projects/proj-calculatorcart.webp", "https://calculatorcart.com/", ["React", "Vite", "SEO", "Google AdSense"], ["29 calculators across 7 categories", "Monetized with Google AdSense"], False, "Built this after noticing how many \"free calculator\" sites bury the actual tool under pop-ups and slow ad networks. The key decision was keeping every calculation client-side — no backend round-trip for a BMI or EMI result — so it feels instant even on a slow connection. Organizing 29 tools into 7 clear categories (instead of one long list) was the main UX challenge, solved with a searchable, filterable grid. It's been live and earning passive ad revenue since launch, with effectively zero ongoing maintenance."),
    ("Soda", "web-development", "Beverage brand landing page", "Product pages for beverage brands usually default to a generic template → built a motion-led hero with a rotating product carousel and a full animated scroll story → a launch-ready storefront front page, live in the browser.", ("Hero", "Full motion, no backend"), "/images/projects/proj-soda.webp", "https://soda-website.vercel.app/", ["React", "Framer Motion", "Tailwind"], ["Rotating product carousel with live pricing cards", "Scroll-driven animated hero, zero backend needed"], True, ""),
    ("Crestline", "web-development", "Construction & real estate site", "Design-build firms need one site that sells both construction services and live listings → built a dual-purpose homepage with a property search bar over a full-bleed hero → a filterable listings flow in a single scroll, no separate portal.", ("Search", "4 live filter fields"), "/images/projects/proj-realestate.webp", "https://real-estate-delta-cyan.vercel.app/", ["React", "Tailwind", "Property Search"], ["Property search bar with type, location, price & beds", "Ground-up to done-right narrative in one hero"], True, ""),
    ("Élané", "web-development", "Luxury salon booking site", "Salon sites often look like a booking widget bolted onto a template → built an editorial, cinematic homepage with a parallax hero and layered imagery → a booking-ready experience that reads boutique, not generic.", ("Feel", "Editorial, parallax hero"), "/images/projects/proj-saloon.webp", "https://saloon-six-jade.vercel.app/", ["React", "Framer Motion", "Parallax"], ["Parallax, layered hero with serif editorial type", "Direct booking & services CTAs above the fold"], True, ""),
    ("Alden", "web-development", "University admissions site", "Prospective students bounce off cluttered .edu templates → built a clean admissions site with live stat cards (founded, rank, faculty ratio) and a program explorer → an application funnel that actually reads as trustworthy.", ("Stats bar", "4 live metrics"), "/images/projects/proj-alden.webp", "https://alden-university.vercel.app/", ["React", "Tailwind", "Illustration"], ["Animated stat bar: founded, programs, rank, ratio", "Illustrated campus hero instead of stock photography"], True, ""),
    ("Roadly", "web-development", "Bus travel booking site", "Bus ticket sites bury the actual search under ads and clutter → built a from/to/date/passengers search widget over a sunset-gradient hero → a book-ready flow, search to seat, with nothing standing in the way.", ("Search", "4-field live booking form"), "/images/projects/proj-bustravel.webp", "https://bustravel-alpha.vercel.app/", ["React", "Tailwind", "Booking UI"], ["From/to/date/passenger search with swap control", "Route-first layout: search before scroll, not after"], True, ""),
]

# (title, icon, featured, summary, features, tech_stack)
SERVICES = [
    ("Custom Website Development", "LayoutTemplate", True,
     "Any type of website — business sites, landing pages, e-commerce stores, dashboards, internal tools. Design to deployment, handled solo, start to finish.",
     ["Custom design, no generic templates", "Responsive on every screen size", "SEO-ready structure and metadata", "Fast loading and accessible markup", "Deployment and handover included"],
     ["React", "TypeScript", "Vite", "Tailwind CSS"]),
    ("Business Website Development", "Building2", False,
     "A professional website that explains what your business does, builds trust and turns visitors into enquiries.",
     ["Service and about pages written around your customers", "Contact and enquiry forms that reach your inbox", "Google-friendly structure and metadata", "Content you can update without a developer (CMS option)"],
     ["React", "Tailwind CSS", "FastAPI"]),
    ("E-commerce Development", "ShoppingCart", True,
     "Online stores with product catalogs, customer accounts, cart, checkout and real payments — built so prices and stock are decided on the server.",
     ["Product catalog, search and filters", "Customer accounts and order history", "Cart and secure checkout (Stripe or Razorpay)", "Order management for staff", "Transactional email"],
     ["Next.js / React", "FastAPI", "PostgreSQL", "Stripe", "Razorpay"]),
    ("Full-Stack Application Development", "Layers", True,
     "Web applications with a React front end, a Python API and a PostgreSQL database — from data model to deployment.",
     ["Database design and migrations", "REST APIs with validation and authentication", "Role-based access", "Automated tests", "Cloud deployment"],
     ["React", "TypeScript", "FastAPI", "SQLAlchemy", "PostgreSQL"]),
    ("Admin Dashboard Development", "LayoutDashboard", False,
     "Secure admin panels that let your team manage content, orders, users and data without touching code.",
     ["CRUD screens with search, filters and pagination", "Roles and permissions enforced on the server", "Audit logs for sensitive actions", "Charts for the numbers that matter"],
     ["React", "TanStack Query", "FastAPI", "PostgreSQL"]),
    ("Python FastAPI Backend Development", "Server", False,
     "Fast, well-structured Python APIs with authentication, validation, database migrations and tests.",
     ["Typed request validation with Pydantic", "JWT / cookie authentication and RBAC", "SQLAlchemy 2 + Alembic migrations", "Rate limiting and security headers", "Pytest test suites"],
     ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL", "Pytest"]),
    ("AI Application Development", "Bot", True,
     "Prompt pipelines, evaluation setups, and internal tools shaped around how your team actually works — not a generic template.",
     ["LLM features inside your product", "Structured outputs you can rely on", "Evaluation and guardrails", "Cost and latency awareness"],
     ["Python", "FastAPI", "OpenAI", "Claude", "Gemini"]),
    ("AI Chatbot Development", "MessageSquareText", False,
     "Chatbots for your website or internal team that answer from your own content and hand off to a human when needed.",
     ["Answers grounded in your content", "Website widget or internal tool", "Conversation logging for review", "Hand-off to email or chat"],
     ["LangChain", "OpenAI / Claude / Gemini", "FastAPI", "React"]),
    ("RAG Application Development", "FileSearch", True,
     "Turn your docs, PDFs, or knowledge base into a chatbot that answers accurately — grounded in your content, with sources, not hallucinations.",
     ["Document ingestion and chunking", "Vector search with citations", "Answer quality evaluation", "Access control on sensitive documents"],
     ["LangChain", "LlamaIndex", "Pinecone / ChromaDB", "FastAPI"]),
    ("LLM Integration", "Plug", False,
     "Wire GPT, Claude, or Gemini into your existing product — a FastAPI backend, a React frontend, or an internal workflow.",
     ["Provider-agnostic integration", "Streaming responses", "Prompt and output validation", "Usage and error monitoring"],
     ["OpenAI", "Claude", "Gemini", "FastAPI"]),
    ("Business Workflow Automation", "Workflow", False,
     "Agents that connect to your actual tools — CRM, email, Slack, sheets — and get the task done, not just chat about it.",
     ["Lead intake and routing", "Email and Slack notifications", "Spreadsheet and CRM updates", "Human approval steps where needed"],
     ["LangGraph", "CrewAI", "n8n", "Python"]),
    ("API Integration", "Cable", False,
     "Connect your website or app to payment gateways, email providers, CRMs and other third-party APIs reliably.",
     ["Payment gateways (Stripe, Razorpay)", "Email and messaging providers", "Webhooks with signature verification", "Retries and error handling"],
     ["FastAPI", "Python", "REST", "Webhooks"]),
    ("Website Redesign and Optimization", "Paintbrush", False,
     "Modernise an existing site: clearer structure, better design, faster pages — without losing what already works.",
     ["UX and content review", "Modern responsive redesign", "Performance improvements", "Safe migration of existing content"],
     ["React", "Tailwind CSS", "Vite"]),
    ("SEO and Performance Optimization", "Gauge", False,
     "Technical SEO and speed work: metadata, structured data, sitemaps, image optimisation and Core Web Vitals.",
     ["Titles, descriptions and Open Graph tags", "Structured data (JSON-LD)", "XML sitemap and robots.txt", "Image and bundle optimisation"],
     ["Lighthouse", "Schema.org", "Vite"]),
    ("Website Deployment and Maintenance", "Rocket", False,
     "Deployment to Vercel, Railway or similar platforms, plus ongoing updates, monitoring and fixes.",
     ["Production deployment with HTTPS", "Environment and secret configuration", "Database backups", "Dependency and security updates"],
     ["Vercel", "Railway", "Docker", "PostgreSQL"]),
]

BLOG_CATEGORIES = [
    "React", "Python", "FastAPI", "PostgreSQL", "AI Engineering", "RAG", "LLMs", "Application Security", "Full-Stack Development",
]
