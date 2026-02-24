'use client';

import { useMemo, useState } from 'react';
import { Project, ProjectData, ViewMode, Task, Issue, AuditEntry } from '@/types/project';
import { LayoutGrid, List, Rocket, Pause, CheckCircle, Plus } from 'lucide-react';
import { ProjectCard } from '@/components/project-card';
import { AgentsPanel } from '@/components/agents-panel';

interface DashboardProps {
  initialData: ProjectData;
}

type NewProjectFormState = {
  name: string;
  description: string;
  githubUrl: string;
  status: Project['status'];
  stages: string;
  milestones: string;
};

const defaultFormState: NewProjectFormState = {
  name: '',
  description: '',
  githubUrl: '',
  status: 'active',
  stages: 'Discovery, Build, QA, Launch',
  milestones: 'MVP Ready, Internal Pilot, External Beta, GA',
};

const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const splitList = (value: string) => value.split(',').map(v => v.trim()).filter(Boolean);

function buildIntakeTasks(stages: string[], milestones: string[]): Task[] {
  return [
    {
      id: id('task-stage-map'),
      title: 'Define and lock project stages',
      completed: false,
      subtasks: stages.map(stage => ({ id: id('sub-stage'), title: stage, completed: false })),
    },
    {
      id: id('task-mile-map'),
      title: 'Define and lock milestones',
      completed: false,
      subtasks: milestones.map(milestone => ({ id: id('sub-mile'), title: milestone, completed: false })),
    },
    {
      id: id('task-val'),
      title: 'Validation & support readiness (avoid nightmare mode)',
      completed: false,
      subtasks: [
        { id: id('sub-val'), title: 'Error handling + retries for model/provider failures', completed: false },
        { id: id('sub-val'), title: 'Input validation + guardrails for issue creation', completed: false },
        { id: id('sub-val'), title: 'Audit trail/logging for project and issue updates', completed: false },
        { id: id('sub-val'), title: 'Fail-safe defaults and clear operator runbook', completed: false },
      ],
    },
  ];
}

function addAudit(project: Project, action: string, detail: string): Project {
  const entry: AuditEntry = {
    id: id('audit'),
    at: nowIso(),
    actor: 'kai',
    action,
    detail,
  };
  return { ...project, auditLog: [entry, ...(project.auditLog || [])].slice(0, 50) };
}

export function Dashboard({ initialData }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialData.projects.map(p => ({ ...p, issues: p.issues || [], auditLog: p.auditLog || [] })));
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [form, setForm] = useState<NewProjectFormState>(defaultFormState);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const persistProjects = async (nextProjects: Project[]) => {
    setSaveError(null);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projects: nextProjects }),
    });
    if (!res.ok) throw new Error((await res.text()) || 'Failed to save project data');
  };

  const updateProjects = (updater: (prev: Project[]) => Project[]) => {
    setProjects(prev => {
      const next = updater(prev);
      void persistProjects(next).catch((err: unknown) => setSaveError(err instanceof Error ? err.message : 'Failed to persist changes'));
      return next;
    });
  };

  const handleTaskToggle = (projectId: string, taskId: string, completed: boolean) => {
    updateProjects(prev => prev.map(project => project.id !== projectId ? project : {
      ...project,
      tasks: project.tasks.map(task => task.id === taskId ? { ...task, completed } : task),
    }));
  };

  const handleSubtaskToggle = (projectId: string, taskId: string, subtaskId: string, completed: boolean) => {
    updateProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        tasks: project.tasks.map(task => {
          if (task.id !== taskId) return task;
          const updatedSubtasks = task.subtasks.map(subtask => subtask.id === subtaskId ? { ...subtask, completed } : subtask);
          return { ...task, subtasks: updatedSubtasks, completed: updatedSubtasks.length > 0 && updatedSubtasks.every(s => s.completed) };
        }),
      };
    }));
  };

  const handleCreateIssue = (projectId: string, issueInput: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!issueInput.title.trim()) {
      setSaveError('Issue title is required');
      return;
    }
    updateProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const issue: Issue = { ...issueInput, id: id('issue'), createdAt: nowIso(), updatedAt: nowIso() };
      return addAudit({ ...project, issues: [issue, ...(project.issues || [])] }, 'issue.create', `${issue.title} (${issue.severity})`);
    }));
  };

  const handleUpdateIssue = (projectId: string, issueId: string, patch: Partial<Issue>) => {
    updateProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      const issues = project.issues || [];
      const current = issues.find(i => i.id === issueId);
      if (!current) return project;

      const nextIssues = issues.map(i => i.id === issueId ? { ...i, ...patch, updatedAt: nowIso() } : i);
      return addAudit({ ...project, issues: nextIssues }, 'issue.update', `${current.title}: updated fields`);
    }));
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return setSaveError('Project name is required.');

    try {
      setIsSaving(true);
      setSaveError(null);
      const stages = splitList(form.stages);
      const milestones = splitList(form.milestones);
      const newProject: Project = {
        id: id('project'),
        name: form.name.trim(),
        description: form.description.trim() || 'New project intake',
        githubUrl: form.githubUrl.trim(),
        status: form.status,
        stages,
        milestones,
        tasks: buildIntakeTasks(stages, milestones),
        issues: [],
        auditLog: [],
      };
      const nextProjects = [newProject, ...projects];
      setProjects(nextProjects);
      await persistProjects(nextProjects);
      setForm(defaultFormState);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSaving(false);
    }
  };

  const health = useMemo(() => {
    const allIssues = projects.flatMap(p => (p.issues || []).map(i => ({ ...i, projectId: p.id })));
    const now = new Date();
    return {
      total: allIssues.length,
      unowned: allIssues.filter(i => !i.owner?.trim()).length,
      overdue: allIssues.filter(i => i.dueDate && new Date(i.dueDate) < now && i.status !== 'done').length,
    };
  }, [projects]);

  const activeProjects = projects.filter(p => p.status === 'active');
  const onHoldProjects = projects.filter(p => p.status === 'on-hold');
  const completeProjects = projects.filter(p => p.status === 'complete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Project Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{projects.length} projects • {projects.reduce((acc, p) => acc + p.tasks.length, 0)} tasks</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'kanban' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600'}`}><LayoutGrid className="h-4 w-4" /><span className="hidden sm:inline">Kanban</span></button>
              <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${viewMode === 'list' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600'}`}><List className="h-4 w-4" /><span className="hidden sm:inline">List</span></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <AgentsPanel />

        <section className="mb-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-semibold">Health checks</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="rounded border p-2">Issues: <b>{health.total}</b></div>
                        <div className="rounded border p-2">Unowned: <b>{health.unowned}</b></div>
            <div className="rounded border p-2">Overdue: <b>{health.overdue}</b></div>
          </div>
        </section>

        <section className="mb-6 rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2"><Plus className="h-4 w-4 text-purple-600" /><h2 className="text-sm font-semibold">New Project Intake</h2></div>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Project name" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="GitHub URL (optional)" value={form.githubUrl} onChange={e => setForm(prev => ({ ...prev, githubUrl: e.target.value }))} />
            <input className="rounded-md border px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Stages (comma separated)" value={form.stages} onChange={e => setForm(prev => ({ ...prev, stages: e.target.value }))} />
            <input className="rounded-md border px-3 py-2 text-sm" placeholder="Milestones (comma separated)" value={form.milestones} onChange={e => setForm(prev => ({ ...prev, milestones: e.target.value }))} />
            <select className="rounded-md border px-3 py-2 text-sm" value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as Project['status'] }))}><option value="active">Active</option><option value="on-hold">On Hold</option><option value="complete">Complete</option></select>
            <button type="submit" disabled={isSaving} className="rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-60">{isSaving ? 'Creating...' : 'Create project'}</button>
          </form>
          {saveError && <p className="mt-3 text-xs text-red-600">{saveError}</p>}
        </section>

        {viewMode === 'kanban' ? (
          <KanbanView activeProjects={activeProjects} onHoldProjects={onHoldProjects} completeProjects={completeProjects} onTaskToggle={handleTaskToggle} onSubtaskToggle={handleSubtaskToggle} onCreateIssue={handleCreateIssue} onUpdateIssue={handleUpdateIssue} />
        ) : (
          <ListView projects={projects} onTaskToggle={handleTaskToggle} onSubtaskToggle={handleSubtaskToggle} onCreateIssue={handleCreateIssue} onUpdateIssue={handleUpdateIssue} />
        )}
      </main>
    </div>
  );
}

interface ViewProps {
  onTaskToggle: (projectId: string, taskId: string, completed: boolean) => void;
  onSubtaskToggle: (projectId: string, taskId: string, subtaskId: string, completed: boolean) => void;
  onCreateIssue: (projectId: string, issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateIssue: (projectId: string, issueId: string, patch: Partial<Issue>) => void;
}

interface KanbanViewProps extends ViewProps {
  activeProjects: Project[];
  onHoldProjects: Project[];
  completeProjects: Project[];
}

function KanbanView({ activeProjects, onHoldProjects, completeProjects, onTaskToggle, onSubtaskToggle, onCreateIssue, onUpdateIssue }: KanbanViewProps) {
  const columns = [
    { title: 'Active', icon: Rocket, projects: activeProjects, headerClass: 'text-emerald-700 bg-emerald-50 border-emerald-200', iconClass: 'text-emerald-600' },
    { title: 'On Hold', icon: Pause, projects: onHoldProjects, headerClass: 'text-amber-700 bg-amber-50 border-amber-200', iconClass: 'text-amber-600' },
    { title: 'Complete', icon: CheckCircle, projects: completeProjects, headerClass: 'text-blue-700 bg-blue-50 border-blue-200', iconClass: 'text-blue-600' },
  ];

  return <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">{columns.map(({ title, icon: Icon, projects, headerClass, iconClass }) => <div key={title} className="space-y-4"><div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${headerClass}`}><Icon className={`h-5 w-5 ${iconClass}`} /><h2 className="font-semibold">{title}</h2><span className="ml-auto text-sm font-medium opacity-70">{projects.length}</span></div><div className="space-y-4">{projects.length ? projects.map(project => <ProjectCard key={project.id} project={project} onTaskToggle={onTaskToggle} onSubtaskToggle={onSubtaskToggle} onCreateIssue={onCreateIssue} onUpdateIssue={onUpdateIssue} />) : <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">No projects</div>}</div></div>)}</div>;
}

interface ListViewProps extends ViewProps { projects: Project[]; }

function ListView({ projects, onTaskToggle, onSubtaskToggle, onCreateIssue, onUpdateIssue }: ListViewProps) {
  return <div className="space-y-4 max-w-3xl mx-auto">{projects.map(project => <ProjectCard key={project.id} project={project} onTaskToggle={onTaskToggle} onSubtaskToggle={onSubtaskToggle} onCreateIssue={onCreateIssue} onUpdateIssue={onUpdateIssue} />)}</div>;
}
