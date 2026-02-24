export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  subtasks: Subtask[];
}

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'blocked' | 'done';

export interface Issue {
  id: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  owner?: string;
  stage?: string;
  milestone?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'on-hold' | 'complete';
  githubUrl: string;
  description: string;
  tasks: Task[];
  stages?: string[];
  milestones?: string[];
  issues?: Issue[];
  auditLog?: AuditEntry[];
}

export interface ProjectData {
  projects: Project[];
}

export type ViewMode = 'kanban' | 'list';
