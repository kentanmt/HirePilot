import type { DefaultSession } from "next-auth";

// Extend NextAuth Session
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// ─── Job Types ────────────────────────────────────────────────────────────────

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  description: string | null;
  requirements: string[];
  url: string | null;
  source: string | null;
  matchScore: number | null;
  matchReason: string | null;
  isSaved: boolean;
  isArchived: boolean;
  postedAt: Date | null;
  createdAt: Date;
}

export interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  url?: string;
  source: string;
  matchScore: number;
  matchReason: string;
}

// ─── Application Types ────────────────────────────────────────────────────────

export type ApplicationStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "INTERVIEW"
  | "FINAL_ROUND"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export interface ApplicationWithJob {
  id: string;
  status: ApplicationStatus;
  appliedAt: Date | null;
  nextStep: string | null;
  nextStepAt: Date | null;
  aiGenerated: boolean;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean;
    salaryMin: number | null;
    salaryMax: number | null;
    matchScore: number | null;
    url: string | null;
  };
}

// ─── Resume Types ─────────────────────────────────────────────────────────────

export interface ResumeContent {
  summary: string;
  experience: ExperienceItem[];
  skills: string[];
  education: EducationItem[];
  projects?: ProjectItem[];
}

export interface ExperienceItem {
  company: string;
  title: string;
  duration: string;
  location?: string;
  bullets: string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  year: string;
  gpa?: string;
}

export interface ProjectItem {
  name: string;
  description: string;
  url?: string;
  stack: string[];
}

export interface ResumeChange {
  type: "added" | "removed" | "modified" | "reordered";
  section: string;
  description: string;
}

// ─── Contact Types ────────────────────────────────────────────────────────────

export interface ContactSuggestion {
  name: string;
  title: string;
  company: string;
  platform: "LINKEDIN" | "EMAIL" | "TWITTER" | "OTHER";
  profileUrl?: string;
  relevance: string;
  outreach?: string;
}

// ─── Interview Types ──────────────────────────────────────────────────────────

export type QuestionType =
  | "BEHAVIORAL"
  | "TECHNICAL"
  | "ROLE_SPECIFIC"
  | "CULTURE_FIT"
  | "SITUATIONAL";

export interface InterviewQuestion {
  id: string;
  type: QuestionType;
  question: string;
  answer: string | null;
  feedback: string | null;
  score: number | null;
  tips: string[];
  practiced: boolean;
}

// ─── Readiness Types ──────────────────────────────────────────────────────────

export interface ReadinessData {
  overallScore: number;
  resumeScore: number;
  applicationScore: number;
  networkScore: number;
  interviewScore: number;
  actionItems: string[];
  insights: string | null;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfileData {
  targetRole: string | null;
  seniority: string | null;
  targetLocations: string[];
  targetCompanies: string[];
  skills: string[];
  yearsExperience: number | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  bio: string | null;
  onboardingDone: boolean;
}
