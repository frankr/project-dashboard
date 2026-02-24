'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Github, ExternalLink } from 'lucide-react';
import { Project, Task, Subtask, Issue, IssueStatus } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectCardProps {
  project: Project;
  onTaskToggle?: (projectId: string, taskId: string, completed: boolean) => void;
  onSubtaskToggle?: (projectId: string, taskId: string, subtaskId: string, completed: boolean) => void;
  onCreateIssue?: (projectId: string, issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateIssue?: (projectId: string, issueId: string, patch: Partial<Issue>) => void;
}

const statusConfig = {
  active: { label: 'Active', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  'on-hold': { label: 'On Hold', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  complete: { label: 'Complete', className: 'bg-blue-100 text-blue-700 border-blue-200' },
};

function calculateProgress(tasks: Task[]): number {
  if (!tasks.length) return 0;
  let totalItems = 0;
  let completedItems = 0;
  tasks.forEach(task => {
    if (task.subtasks.length) {
      totalItems += task.subtasks.length;
      completedItems += task.subtasks.filter(s => s.completed).length;
    } else {
      totalItems += 1;
      completedItems += task.completed ? 1 : 0;
    }
  });
  return totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
}

function TaskItem({ task, projectId, onTaskToggle, onSubtaskToggle }: { task: Task; projectId: string; onTaskToggle?: (projectId: string, taskId: string, completed: boolean) => void; onSubtaskToggle?: (projectId: string, taskId: string, subtaskId: string, completed: boolean) => void; }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasSubtasks = task.subtasks.length > 0;
  const completedSubtasks = task.subtasks.filter(s => s.completed).length;
  const allSubtasksComplete = hasSubtasks && completedSubtasks === task.subtasks.length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-start gap-2 py-2">
        <div className={cn('flex items-center justify-center w-5 h-5 mt-0.5 rounded-full transition-all duration-300', (task.completed || allSubtasksComplete) && 'animate-check')}>
          <Checkbox
            checked={hasSubtasks ? allSubtasksComplete : task.completed}
            onCheckedChange={checked => !hasSubtasks && onTaskToggle?.(projectId, task.id, checked as boolean)}
            disabled={hasSubtasks}
            className={cn('transition-all duration-300', (task.completed || allSubtasksComplete) && 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500')}
          />
        </div>

        <div className="flex-1 min-w-0">
          <CollapsibleTrigger className="flex items-center gap-1 text-left w-full group" disabled={!hasSubtasks}>
            <span className={cn('text-sm font-medium transition-all duration-200', (task.completed || allSubtasksComplete) && 'text-muted-foreground line-through')}>{task.title}</span>
            {hasSubtasks && (<><span className="text-xs text-muted-foreground ml-1">({completedSubtasks}/{task.subtasks.length})</span>{isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />}</>)}
          </CollapsibleTrigger>

          {hasSubtasks && (
            <CollapsibleContent>
              <div className="mt-2 ml-4 space-y-1.5 border-l-2 border-muted pl-3">
                {task.subtasks.map(subtask => (
                  <SubtaskItem key={subtask.id} subtask={subtask} projectId={projectId} taskId={task.id} onSubtaskToggle={onSubtaskToggle} />
                ))}
              </div>
            </CollapsibleContent>
          )}
        </div>
      </div>
    </Collapsible>
  );
}

function SubtaskItem({ subtask, projectId, taskId, onSubtaskToggle }: { subtask: Subtask; projectId: string; taskId: string; onSubtaskToggle?: (projectId: string, taskId: string, subtaskId: string, completed: boolean) => void; }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <Checkbox
        checked={subtask.completed}
        onCheckedChange={checked => onSubtaskToggle?.(projectId, taskId, subtask.id, checked as boolean)}
        className={cn('h-4 w-4 transition-all duration-300', subtask.completed && 'data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500')}
      />
      <span className={cn('text-sm transition-all duration-200', subtask.completed && 'text-muted-foreground line-through')}>{subtask.title}</span>
    </div>
  );
}

function IssuePanel({ project, onCreateIssue, onUpdateIssue }: { project: Project; onCreateIssue?: (projectId: string, issue: Omit<Issue, 'id' | 'createdAt' | 'updatedAt'>) => void; onUpdateIssue?: (projectId: string, issueId: string, patch: Partial<Issue>) => void; }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [status, setStatus] = useState<IssueStatus>('todo');
  const [dueDate, setDueDate] = useState('');

  const issues = project.issues || [];
  const stats = { open: issues.filter(i => i.status !== 'done').length };

  const createIssue = () => {
    if (!title.trim()) return;
    onCreateIssue?.(project.id, { title: title.trim(), severity: 'medium', status, owner: owner.trim(), dueDate: dueDate || undefined, description: '' });
    setTitle('');
    setOwner('');
    setDueDate('');
  };

  return (
    <div className="mt-4 border-t pt-4">
      <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
        <span>Issues: {issues.length} • Open: {stats.open}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
        <input className="rounded border px-2 py-1.5 text-xs md:col-span-2" placeholder="New issue title" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="rounded border px-2 py-1.5 text-xs" placeholder="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
        <select className="rounded border px-2 py-1.5 text-xs" value={status} onChange={e => setStatus(e.target.value as IssueStatus)}><option value="todo">Todo</option><option value="in-progress">Doing</option><option value="done">Done</option></select>
        <input className="rounded border px-2 py-1.5 text-xs" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        <button type="button" onClick={createIssue} className="rounded bg-slate-900 text-white text-xs px-2 py-1.5">Add issue</button>
      </div>

      <div className="space-y-2">
        {issues.map(issue => (
          <div key={issue.id} className="rounded border p-2">
            <div className="text-xs font-semibold">{issue.title}</div>
            <div className="mt-1 grid grid-cols-2 md:grid-cols-5 gap-1">
              <select className="rounded border px-1 py-1 text-[11px]" value={issue.status} onChange={e => onUpdateIssue?.(project.id, issue.id, { status: e.target.value as IssueStatus })}><option value="todo">Todo</option><option value="in-progress">Doing</option><option value="done">Done</option></select>
              <input className="rounded border px-1 py-1 text-[11px]" value={issue.owner || ''} onChange={e => onUpdateIssue?.(project.id, issue.id, { owner: e.target.value })} placeholder="Owner" />
              <input type="date" className="rounded border px-1 py-1 text-[11px]" value={issue.dueDate || ''} onChange={e => onUpdateIssue?.(project.id, issue.id, { dueDate: e.target.value || undefined })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectCard({ project, onTaskToggle, onSubtaskToggle, onCreateIssue, onUpdateIssue }: ProjectCardProps) {
  const progress = calculateProgress(project.tasks);
  const status = statusConfig[project.status];

  return (
    <Card className="w-full transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <CardTitle className="text-lg font-bold truncate">{project.name}</CardTitle>
            <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
          </div>
          <Badge variant="outline" className={cn('shrink-0', status.className)}>{status.label}</Badge>
        </div>

        {project.githubUrl && (
          <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mt-1">
            <Github className="h-4 w-4" />
            <span className="truncate">{project.githubUrl.replace('https://github.com/', '')}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        <div className="space-y-1.5 mt-3">
          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Progress</span><span className="font-medium">{progress}%</span></div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-0.5 divide-y divide-muted/50">
          {project.tasks.map(task => <TaskItem key={task.id} task={task} projectId={project.id} onTaskToggle={onTaskToggle} onSubtaskToggle={onSubtaskToggle} />)}
        </div>
        <IssuePanel project={project} onCreateIssue={onCreateIssue} onUpdateIssue={onUpdateIssue} />
      </CardContent>
    </Card>
  );
}
