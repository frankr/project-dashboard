'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectCard } from '@/components/project-card';
import { AgentsPanel } from '@/components/agents-panel';
import { Project, ProjectData, ViewMode } from '@/types/project';
import { LayoutGrid, List, Rocket, Pause, CheckCircle } from 'lucide-react';

interface DashboardProps {
  initialData: ProjectData;
}

export function Dashboard({ initialData }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>(initialData.projects);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  const handleTaskToggle = (projectId: string, taskId: string, completed: boolean) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        tasks: project.tasks.map(task => 
          task.id === taskId ? { ...task, completed } : task
        )
      };
    }));
  };

  const handleSubtaskToggle = (projectId: string, taskId: string, subtaskId: string, completed: boolean) => {
    setProjects(prev => prev.map(project => {
      if (project.id !== projectId) return project;
      return {
        ...project,
        tasks: project.tasks.map(task => {
          if (task.id !== taskId) return task;
          const updatedSubtasks = task.subtasks.map(subtask =>
            subtask.id === subtaskId ? { ...subtask, completed } : subtask
          );
          // Auto-complete parent task if all subtasks are done
          const allComplete = updatedSubtasks.every(s => s.completed);
          return { 
            ...task, 
            subtasks: updatedSubtasks,
            completed: allComplete
          };
        })
      };
    }));
  };

  const activeProjects = projects.filter(p => p.status === 'active');
  const onHoldProjects = projects.filter(p => p.status === 'on-hold');
  const completeProjects = projects.filter(p => p.status === 'complete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Project Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {projects.length} projects • {projects.reduce((acc, p) => acc + p.tasks.length, 0)} tasks
              </p>
            </div>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'kanban' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list' 
                    ? 'bg-white text-purple-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Agents Panel */}
        <AgentsPanel />
        
        {viewMode === 'kanban' ? (
          <KanbanView 
            activeProjects={activeProjects}
            onHoldProjects={onHoldProjects}
            completeProjects={completeProjects}
            onTaskToggle={handleTaskToggle}
            onSubtaskToggle={handleSubtaskToggle}
          />
        ) : (
          <ListView 
            projects={projects}
            onTaskToggle={handleTaskToggle}
            onSubtaskToggle={handleSubtaskToggle}
          />
        )}
      </main>
    </div>
  );
}

interface ViewProps {
  onTaskToggle: (projectId: string, taskId: string, completed: boolean) => void;
  onSubtaskToggle: (projectId: string, taskId: string, subtaskId: string, completed: boolean) => void;
}

interface KanbanViewProps extends ViewProps {
  activeProjects: Project[];
  onHoldProjects: Project[];
  completeProjects: Project[];
}

function KanbanView({ activeProjects, onHoldProjects, completeProjects, onTaskToggle, onSubtaskToggle }: KanbanViewProps) {
  const columns = [
    { 
      title: 'Active', 
      icon: Rocket, 
      projects: activeProjects, 
      headerClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600'
    },
    { 
      title: 'On Hold', 
      icon: Pause, 
      projects: onHoldProjects, 
      headerClass: 'text-amber-700 bg-amber-50 border-amber-200',
      iconClass: 'text-amber-600'
    },
    { 
      title: 'Complete', 
      icon: CheckCircle, 
      projects: completeProjects, 
      headerClass: 'text-blue-700 bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600'
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {columns.map(({ title, icon: Icon, projects, headerClass, iconClass }) => (
        <div key={title} className="space-y-4">
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${headerClass}`}>
            <Icon className={`h-5 w-5 ${iconClass}`} />
            <h2 className="font-semibold">{title}</h2>
            <span className="ml-auto text-sm font-medium opacity-70">{projects.length}</span>
          </div>
          
          <div className="space-y-4">
            {projects.length > 0 ? (
              projects.map(project => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  onTaskToggle={onTaskToggle}
                  onSubtaskToggle={onSubtaskToggle}
                />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                No projects
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface ListViewProps extends ViewProps {
  projects: Project[];
}

function ListView({ projects, onTaskToggle, onSubtaskToggle }: ListViewProps) {
  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {projects.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project}
          onTaskToggle={onTaskToggle}
          onSubtaskToggle={onSubtaskToggle}
        />
      ))}
    </div>
  );
}
