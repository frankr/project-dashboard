'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Bot, ChevronDown, ChevronUp, Clock, Zap, RefreshCw } from 'lucide-react';

interface AgentSession {
  key: string;
  sessionId: string;
  label: string;
  status: 'running' | 'completed' | 'failed';
  task: string;
  startTime: number;
  updatedAt: number;
  duration?: number;
  totalTokens?: number;
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'just now';
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

function getStatusEmoji(status: AgentSession['status']) {
  switch (status) {
    case 'running':
      return '🏃';
    case 'completed':
      return '✅';
    case 'failed':
      return '❌';
  }
}

function getStatusBadgeVariant(status: AgentSession['status']): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'running':
      return 'default';
    case 'completed':
      return 'secondary';
    case 'failed':
      return 'destructive';
  }
}

function AgentCard({ agent }: { agent: AgentSession }) {
  return (
    <Card className="bg-white border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-md ${
              agent.status === 'running' 
                ? 'bg-purple-100' 
                : agent.status === 'completed' 
                  ? 'bg-emerald-100' 
                  : 'bg-red-100'
            }`}>
              <Bot className={`h-4 w-4 ${
                agent.status === 'running' 
                  ? 'text-purple-600 animate-pulse' 
                  : agent.status === 'completed' 
                    ? 'text-emerald-600' 
                    : 'text-red-600'
              }`} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 truncate">{agent.label}</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(agent.startTime)}
              </p>
            </div>
          </div>
          
          <Badge variant={getStatusBadgeVariant(agent.status)} className="shrink-0">
            {getStatusEmoji(agent.status)} {agent.status}
          </Badge>
        </div>
        
        <p className="mt-3 text-sm text-slate-600 line-clamp-2">{agent.task}</p>
        
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {agent.duration && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(agent.duration)}
            </span>
          )}
          {agent.totalTokens && (
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {agent.totalTokens.toLocaleString()} tokens
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AgentsPanel() {
  const [agents, setAgents] = useState<AgentSession[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents');
      const data = await res.json();
      setAgents(data.agents || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchAgents, 10000);
    return () => clearInterval(interval);
  }, []);

  const runningCount = agents.filter(a => a.status === 'running').length;
  const completedCount = agents.filter(a => a.status === 'completed').length;
  const failedCount = agents.filter(a => a.status === 'failed').length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-6">
      <Card className="bg-gradient-to-r from-purple-50/50 to-blue-50/50 border-purple-200/50">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-purple-50/50 transition-colors rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    AI Sub-Agents
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {runningCount > 0 && <span className="text-purple-600 font-medium">{runningCount} running</span>}
                    {runningCount > 0 && (completedCount > 0 || failedCount > 0) && ' • '}
                    {completedCount > 0 && <span className="text-emerald-600">{completedCount} completed</span>}
                    {completedCount > 0 && failedCount > 0 && ' • '}
                    {failedCount > 0 && <span className="text-red-600">{failedCount} failed</span>}
                    {agents.length === 0 && 'No active agents'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchAgents();
                  }}
                  className="p-1.5 rounded-md hover:bg-purple-100 transition-colors"
                  title={`Last refreshed: ${lastRefresh.toLocaleTimeString()}`}
                >
                  <RefreshCw className={`h-4 w-4 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                {isOpen ? (
                  <ChevronUp className="h-5 w-5 text-purple-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-purple-600" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 text-purple-600 animate-spin" />
              </div>
            ) : agents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm border-2 border-dashed border-purple-200 rounded-lg">
                No sub-agents have been spawned yet
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {agents.slice(0, 9).map(agent => (
                  <AgentCard key={agent.key} agent={agent} />
                ))}
              </div>
            )}
            {agents.length > 9 && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                + {agents.length - 9} more agents
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
