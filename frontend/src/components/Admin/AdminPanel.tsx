/**
 * Admin Panel
 * Project, Department, and User Management
 */

import { useState } from 'react';
import {
  Title2,
  Title3,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Badge,
  makeStyles,
  tokens,
  TabList,
  Tab,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from '@fluentui/react-components';
import {
  AddRegular,
  EditRegular,
  DeleteRegular,
  MoreVerticalRegular,
} from '@fluentui/react-icons';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '../../hooks/useProjects';
import { ProjectFormModal } from './ProjectFormModal';
import { Project } from '../../types';
import { CreateProjectDto } from '../../services/projectService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalL,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tabContent: {
    marginTop: tokens.spacingVerticalM,
  },
  tableContainer: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  badge: {
    minWidth: '60px',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
});

// Mock departments - you'll want to fetch these from the API
const mockDepartments = [
  { departmentId: 1, departmentName: 'Engineering' },
  { departmentId: 2, departmentName: 'Marketing' },
  { departmentId: 3, departmentName: 'Sales' },
  { departmentId: 4, departmentName: 'Operations' },
];

export const AdminPanel = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('projects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // React Query hooks
  const { data: projects, isLoading, error } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await deleteProject.mutateAsync(projectId);
      } catch (error) {
        console.error('Failed to delete project:', error);
      }
    }
  };

  const handleSubmitProject = async (data: CreateProjectDto) => {
    try {
      if (editingProject) {
        await updateProject.mutateAsync({
          id: editingProject.projectId,
          data: { ...data, projectId: editingProject.projectId },
        });
      } else {
        await createProject.mutateAsync(data);
      }
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  };

  const getDepartmentName = (departmentId: number) => {
    return mockDepartments.find(d => d.departmentId === departmentId)?.departmentName || 'Unknown';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title2>Admin Panel</Title2>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as string)}>
        <Tab value="projects">Projects</Tab>
        <Tab value="departments">Departments</Tab>
        <Tab value="users">Users</Tab>
        <Tab value="settings">Settings</Tab>
      </TabList>

      <div className={styles.tabContent}>
        {selectedTab === 'projects' && (
          <>
            <div className={styles.header}>
              <Title3>Project Management</Title3>
              <Button
                appearance="primary"
                icon={<AddRegular />}
                onClick={handleCreateProject}
              >
                New Project
              </Button>
            </div>

            {error && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error Loading Projects</MessageBarTitle>
                  {error instanceof Error ? error.message : 'Failed to load projects'}
                </MessageBarBody>
              </MessageBar>
            )}

            {isLoading ? (
              <Spinner label="Loading projects..." />
            ) : (
              <div className={styles.tableContainer}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Project Number</TableHeaderCell>
                      <TableHeaderCell>Project Name</TableHeaderCell>
                      <TableHeaderCell>Department</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>Grant ID</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects && projects.length > 0 ? (
                      projects.map((project) => (
                        <TableRow key={project.projectId}>
                          <TableCell>{project.projectNumber}</TableCell>
                          <TableCell>{project.projectName}</TableCell>
                          <TableCell>{getDepartmentName(project.departmentId)}</TableCell>
                          <TableCell>{project.projectType}</TableCell>
                          <TableCell>{project.grantIdentifier || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              appearance="filled"
                              color={project.isActive ? 'success' : 'danger'}
                              className={styles.badge}
                            >
                              {project.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Menu>
                              <MenuTrigger disableButtonEnhancement>
                                <Button
                                  appearance="subtle"
                                  icon={<MoreVerticalRegular />}
                                  aria-label="More actions"
                                />
                              </MenuTrigger>
                              <MenuPopover>
                                <MenuList>
                                  <MenuItem
                                    icon={<EditRegular />}
                                    onClick={() => handleEditProject(project)}
                                  >
                                    Edit
                                  </MenuItem>
                                  <MenuItem
                                    icon={<DeleteRegular />}
                                    onClick={() => handleDeleteProject(project.projectId)}
                                  >
                                    Delete
                                  </MenuItem>
                                </MenuList>
                              </MenuPopover>
                            </Menu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                          No projects found. Click "New Project" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <ProjectFormModal
              open={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingProject(null);
              }}
              onSubmit={handleSubmitProject}
              project={editingProject}
              departments={mockDepartments}
              isLoading={createProject.isPending || updateProject.isPending}
            />
          </>
        )}

        {selectedTab === 'departments' && (
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>Coming Soon</MessageBarTitle>
              Department management will be available in a future update.
            </MessageBarBody>
          </MessageBar>
        )}

        {selectedTab === 'users' && (
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>Coming Soon</MessageBarTitle>
              User management will be available in a future update.
            </MessageBarBody>
          </MessageBar>
        )}

        {selectedTab === 'settings' && (
          <MessageBar intent="info">
            <MessageBarBody>
              <MessageBarTitle>Coming Soon</MessageBarTitle>
              System settings will be available in a future update.
            </MessageBarBody>
          </MessageBar>
        )}
      </div>
    </div>
  );
};
