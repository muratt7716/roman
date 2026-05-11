export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProjectVisibility = 'draft' | 'open' | 'closed' | 'published'
export type CollaborationStatus = 'recruiting' | 'active' | 'completed'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type ChapterStatus = 'draft' | 'review' | 'final'
export type NotificationType = 'application' | 'acceptance' | 'rejection' | 'comment' | 'mention'
export type BrainstormNoteType = 'plot' | 'character' | 'lore' | 'relationship' | 'sticky'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  portfolio_url: string | null
  reputation_score: number
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  title: string
  slug: string
  genre: string | null
  synopsis: string | null
  tags: string[]
  target_word_count: number | null
  current_word_count: number
  visibility: ProjectVisibility
  collaboration_status: CollaborationStatus
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectRole {
  id: string
  project_id: string
  name: string
  description: string | null
  max_members: number
  permissions: Json
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_id: string
  joined_at: string
  contribution_percentage: number
}

export interface Application {
  id: string
  project_id: string
  applicant_id: string
  role_id: string
  intro: string
  writing_sample: string | null
  portfolio_links: string[]
  status: ApplicationStatus
  created_at: string
}

export interface Chapter {
  id: string
  project_id: string
  title: string
  order_index: number
  status: ChapterStatus
  word_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChapterVersion {
  id: string
  chapter_id: string
  author_id: string
  content: string
  word_count: number
  created_at: string
}

export interface Comment {
  id: string
  chapter_id: string
  author_id: string
  content: string
  selection_range: Json | null
  resolved: boolean
  created_at: string
}

export interface BrainstormNote {
  id: string
  project_id: string
  author_id: string
  type: BrainstormNoteType
  title: string | null
  content: Json
  position_x: number
  position_y: number
  color: string
  created_at: string
  updated_at: string
}

export interface CharacterProfile {
  id: string
  project_id: string
  name: string
  role: string | null
  description: string | null
  traits: string[]
  image_url: string | null
  relationships: Json
  arc_notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  project_id: string
  title: string
  description: string | null
  event_date: string | null
  arc: string | null
  order_index: number
  created_by: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: Json
  read: boolean
  created_at: string
}

export interface ProjectWithOwner extends Project {
  owner: Profile
  roles: ProjectRole[]
  member_count?: number
}

export interface ApplicationWithApplicant extends Application {
  applicant: Profile
  role: ProjectRole
}

export interface MemberWithProfile extends ProjectMember {
  profile: Profile
  role: ProjectRole
}
