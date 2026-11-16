import { QueryClient, useQuery } from "@tanstack/react-query";
import { ApiError, api } from "./api";
import type {
  BlogPost,
  Category,
  Experience,
  Page,
  Project,
  PublicTestimonial,
  SeoMeta,
  Service,
  Site,
  SkillGroup,
} from "./types";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Content edits show up within a minute without any rebuild; navigating also refetches.
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      },
    },
  });
}

const P = "/api/v1/public";

export const useSite = () => useQuery({ queryKey: ["site"], queryFn: () => api<Site>(`${P}/site`) });

export const useSeo = (key: string) =>
  useQuery({ queryKey: ["seo", key], queryFn: () => api<SeoMeta | null>(`${P}/seo/${key}`), staleTime: 300_000, enabled: Boolean(key) });

export type ProjectFilters = { q?: string; category?: string; tech?: string; featured?: boolean; page?: number; page_size?: number };

export const useProjects = (filters: ProjectFilters = {}) =>
  useQuery({
    queryKey: ["projects", filters],
    queryFn: () => api<Page<Project>>(`${P}/projects`, { query: filters }),
    placeholderData: (prev) => prev,
  });

export const useProject = (slug: string) =>
  useQuery({
    queryKey: ["project", slug],
    queryFn: () => api<{ project: Project; testimonials: PublicTestimonial[]; related: Project[] }>(`${P}/projects/${encodeURIComponent(slug)}`),
  });

export const useProjectCategories = () =>
  useQuery({ queryKey: ["project-categories"], queryFn: () => api<Category[]>(`${P}/project-categories`) });

export const useProjectTechnologies = () =>
  useQuery({ queryKey: ["project-technologies"], queryFn: () => api<string[]>(`${P}/projects/technologies`) });

export const useServices = (featured?: boolean) =>
  useQuery({ queryKey: ["services", featured], queryFn: () => api<Service[]>(`${P}/services`, { query: { featured } }) });

export const useService = (slug: string) =>
  useQuery({ queryKey: ["service", slug], queryFn: () => api<Service>(`${P}/services/${encodeURIComponent(slug)}`) });

export const useSkills = () => useQuery({ queryKey: ["skills"], queryFn: () => api<SkillGroup[]>(`${P}/skills`) });

export const useTestimonials = (params: { project?: string; featured?: boolean; limit?: number } = {}) =>
  useQuery({ queryKey: ["testimonials", params], queryFn: () => api<PublicTestimonial[]>(`${P}/testimonials`, { query: params }) });

export const useExperiences = () =>
  useQuery({ queryKey: ["experiences"], queryFn: () => api<Experience[]>(`${P}/experiences`) });

export type BlogFilters = { q?: string; category?: string; tag?: string; page?: number; page_size?: number };

export const useBlog = (filters: BlogFilters = {}) =>
  useQuery({
    queryKey: ["blog", filters],
    queryFn: () => api<Page<BlogPost>>(`${P}/blog`, { query: filters }),
    placeholderData: (prev) => prev,
  });

export const useBlogPost = (slug: string) =>
  useQuery({
    queryKey: ["blog-post", slug],
    queryFn: () => api<{ post: BlogPost; related: BlogPost[] }>(`${P}/blog/${encodeURIComponent(slug)}`),
  });

export const useBlogCategories = () =>
  useQuery({ queryKey: ["blog-categories"], queryFn: () => api<Category[]>(`${P}/blog/categories`) });
