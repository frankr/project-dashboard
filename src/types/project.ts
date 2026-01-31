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

export interface Project {
  id: string;
  name: string;
  status: 'active' | 'on-hold' | 'complete';
  githubUrl: string;
  description: string;
  tasks: Task[];
}

export interface ProjectData {
  projects: Project[];
}

export type ViewMode = 'kanban' | 'list';
