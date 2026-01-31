import { Dashboard } from '@/components/dashboard';
import { ProjectData } from '@/types/project';
import fs from 'fs';
import path from 'path';

async function getProjectData(): Promise<ProjectData> {
  const filePath = path.join(process.env.HOME || '', 'clawd', 'project-data.json');
  
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error('Error reading project data:', error);
    return { projects: [] };
  }
}

export default async function Home() {
  const projectData = await getProjectData();
  
  return <Dashboard initialData={projectData} />;
}
