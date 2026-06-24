import PageHeader from '../components/PageHeader';
import ProgressFeed from '../components/ProgressFeed';
import { useProject } from '../store/projectStore';

export default function ProgressFeedPage() {
  const project = useProject();

  return (
    <>
      <PageHeader
        title="Site Progress Feed"
        subtitle="Daily photo & video updates — upload, caption, tag by category and browse the full archive"
      />
      <ProgressFeed
        projectManager={project.projectManager}
        compact={false}
      />
    </>
  );
}
