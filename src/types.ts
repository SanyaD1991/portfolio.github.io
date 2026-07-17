export type Portfolio = {
  id: string
  owner_id: string
  slug: string
  name: string
  subtitle: string | null
  about: string | null
  cover_url: string | null
  contact_email: string | null
  accent_color: string
  background_color: string
  text_color: string
  is_published: boolean
  sort_order: number
  created_at: string
}

export type SectionType = 'text' | 'projects' | 'achievements'

export type PortfolioSection = {
  id: string
  owner_id: string
  portfolio_id: string
  title: string
  type: SectionType
  body: string | null
  sort_order: number
  is_published: boolean
  created_at: string
}

export type Project = {
  id: string
  owner_id: string
  portfolio_id: string
  section_id: string | null
  title: string
  summary: string | null
  description: string | null
  year: string | null
  role: string | null
  cover_url: string | null
  project_url: string | null
  gallery: string[]
  video_urls: string[]
  tags: string[]
  sort_order: number
  is_published: boolean
  created_at: string
}

export type Achievement = {
  id: string
  owner_id: string
  portfolio_id: string
  section_id: string | null
  title: string
  issuer: string | null
  achievement_date: string | null
  description: string | null
  image_url: string | null
  pdf_url: string | null
  link_url: string | null
  sort_order: number
  is_published: boolean
  created_at: string
}
