export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProjectVisibility = 'draft' | 'open' | 'closed' | 'published'
export type CollaborationStatus = 'recruiting' | 'active' | 'completed'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type ChapterStatus = 'draft' | 'review' | 'final'
export type NotificationType =
  | 'application' | 'acceptance' | 'rejection'
  | 'comment' | 'mention' | 'invite' | 'suggestion'
  | 'new_chapter' | 'new_follower'
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected'
export type InviteStatus = 'pending' | 'accepted' | 'declined'
export type BrainstormNoteType = 'plot' | 'character' | 'lore' | 'relationship' | 'sticky'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  portfolio_url: string | null
  reputation_score: number
  writing_status?: 'active' | 'open' | 'busy'
  created_at: string
}

export interface ProjectInvite {
  id: string
  project_id: string
  inviter_id: string
  invitee_id: string
  role_id: string
  message: string | null
  status: InviteStatus
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

export interface ChapterSuggestion {
  id: string
  chapter_id: string
  author_id: string
  content: string
  note: string | null
  status: SuggestionStatus
  created_at: string
}

export type ReactionType = 'fire' | 'drop' | 'bolt'
export type ReadingListStatus = 'want' | 'reading' | 'done'

export interface ChapterReaction {
  id: string
  chapter_id: string
  user_id: string
  reaction: ReactionType
  created_at: string
}

export interface ReadingList {
  id: string
  user_id: string
  project_id: string
  status: ReadingListStatus
  updated_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

export type BadgeCode =
  | 'first_chapter'
  | 'thousand_words'
  | 'seven_day_streak'
  | 'team_player'
  | 'beloved'
  | 'followed'
  | 'reader_friend'
  | 'editorial_pick'
  | 'first_submission'
  | 'consistent_writer'
  | 'star_student'
  | 'peer_reader'
  | 'first_sprint'
  | 'sprint_warrior'

export interface UserWritingGoal {
  user_id: string
  daily_target: number
  streak_current: number
  streak_best: number
  streak_last_date: string | null
  updated_at: string
}

export interface UserBadge {
  user_id: string
  badge_code: BadgeCode
  earned_at: string
}

export interface WeeklyStats {
  wordsWritten: number
  reactionsReceived: number
  newFollowers: number
  totalViews: number
}

export interface WritingGoalResponse {
  daily_target: number
  streak_current: number
  streak_best: number
  today_words: number
}

export interface EditorialPick {
  id: string
  title: string
  slug: string
  cover_image_url: string | null
  genre: string | null
  owner_display_name: string | null
  owner_username: string
  score: number
}

export type ClassroomRole = 'teacher' | 'student' | 'parent'
export type SubmissionStatus = 'draft' | 'submitted' | 'graded'
export type AssignmentVisibility = 'private' | 'class_visible'

export interface Classroom {
  id: string
  owner_id: string
  name: string
  school_name: string
  description: string | null
  password?: string
  created_at: string
}

export interface ClassroomMember {
  classroom_id: string
  user_id: string
  role: ClassroomRole
  student_id: string | null
  joined_at: string
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface ClassroomAssignment {
  id: string
  classroom_id: string
  title: string
  description: string | null
  due_date: string | null
  visibility: AssignmentVisibility
  created_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  project_id: string | null
  status: SubmissionStatus
  grade: number | null
  teacher_comment: string | null
  submitted_at: string | null
  graded_at: string | null
  student?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}

export interface AssignmentTemplate {
  id: string
  owner_id: string
  title: string
  description: string | null
  created_at: string
}

export type SprintStatus = 'scheduled' | 'active' | 'finished'

export interface WritingSprint {
  id: string
  title: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  status: SprintStatus
  created_by: string | null
  is_community: boolean
  created_at: string
  participant_count?: number
}

export interface SprintParticipant {
  sprint_id: string
  user_id: string
  word_count: number
  start_word_ref: number
  joined_at: string
  finished_at: string | null
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}
