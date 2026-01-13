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
  ArrowSyncRegular,
  PersonRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
} from '@fluentui/react-icons';
import { useProjects, useCreateProject, useUpdateProject, useDeactivateProject } from '../../hooks/useProjects';
import { useUsers, useSyncUsers } from '../../hooks/useUsers';
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '../../hooks/useDepartments';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../../hooks/useHolidays';
import { ProjectFormModal } from './ProjectFormModal';
import { DepartmentFormModal } from './DepartmentFormModal';
import { HolidayFormModal } from './HolidayFormModal';
import { Project } from '../../types';
import { CreateProjectDto } from '../../services/projectService';
import { Department, CreateDepartmentDto } from '../../services/departmentService';
import { Holiday, CreateHolidayDto } from '../../services/holidayService';

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


export const AdminPanel = () => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<string>('projects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  // React Query hooks - Projects
  const { data: projects, isLoading: projectsLoading, error: projectsError } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deactivateProject = useDeactivateProject();

  // React Query hooks - Departments
  const { data: departments, isLoading: departmentsLoading, error: departmentsError } = useDepartments();
  const createDepartment = useCreateDepartment();
  const updateDepartment = useUpdateDepartment();

  // React Query hooks - Users
  const { data: users, isLoading: usersLoading, error: usersError } = useUsers();
  const syncUsers = useSyncUsers();

  // React Query hooks - Holidays
  const { data: holidays, isLoading: holidaysLoading, error: holidaysError } = useHolidays();
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDeactivateProject = async (projectId: number) => {
    if (confirm('Are you sure you want to deactivate this project? It can be reactivated later.')) {
      try {
        await deactivateProject.mutateAsync({ id: projectId, reason: 'Deactivated by administrator' });
      } catch (error) {
        console.error('Failed to deactivate project:', error);
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

  const getDepartmentName = (departmentId: number | null) => {
    if (departmentId === null) return 'All Departments';
    return departments?.find(d => d.DepartmentID === departmentId)?.DepartmentName || 'Unknown';
  };

  const handleCreateDepartment = () => {
    setEditingDepartment(null);
    setIsDeptModalOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setIsDeptModalOpen(true);
  };

  const handleSubmitDepartment = async (data: CreateDepartmentDto) => {
    try {
      if (editingDepartment) {
        await updateDepartment.mutateAsync({
          id: editingDepartment.DepartmentID,
          data,
        });
      } else {
        await createDepartment.mutateAsync(data);
      }
      setIsDeptModalOpen(false);
      setEditingDepartment(null);
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  const handleCreateHoliday = () => {
    setEditingHoliday(null);
    setIsHolidayModalOpen(true);
  };

  const handleEditHoliday = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setIsHolidayModalOpen(true);
  };

  const handleDeleteHoliday = async (holidayId: number) => {
    if (confirm('Are you sure you want to delete this holiday?')) {
      try {
        await deleteHoliday.mutateAsync(holidayId);
      } catch (error) {
        console.error('Failed to delete holiday:', error);
      }
    }
  };

  const handleSubmitHoliday = async (data: CreateHolidayDto) => {
    try {
      if (editingHoliday) {
        await updateHoliday.mutateAsync({
          id: editingHoliday.HolidayID,
          data,
        });
      } else {
        await createHoliday.mutateAsync(data);
      }
      setIsHolidayModalOpen(false);
      setEditingHoliday(null);
    } catch (error) {
      console.error('Failed to save holiday:', error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title2>Admin Panel</Title2>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={(_, data) => setSelectedTab(data.value as string)}>
        <Tab key="projects" value="projects">Projects</Tab>
        <Tab key="departments" value="departments">Departments</Tab>
        <Tab key="holidays" value="holidays">Holidays</Tab>
        <Tab key="users" value="users">Users</Tab>
        <Tab key="settings" value="settings">Settings</Tab>
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

            {projectsError && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error Loading Projects</MessageBarTitle>
                  {projectsError instanceof Error ? projectsError.message : 'Failed to load projects'}
                </MessageBarBody>
              </MessageBar>
            )}

            {projectsLoading ? (
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
                                    onClick={() => handleDeactivateProject(project.projectId)}
                                  >
                                    Deactivate
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
              departments={departments?.map(d => ({ departmentId: d.DepartmentID, departmentName: d.DepartmentName })) || []}
              isLoading={createProject.isPending || updateProject.isPending}
            />
          </>
        )}

        {selectedTab === 'departments' && (
          <>
            <div className={styles.header}>
              <Title3>Department Management</Title3>
              <Button
                appearance="primary"
                icon={<AddRegular />}
                onClick={handleCreateDepartment}
              >
                New Department
              </Button>
            </div>

            {departmentsError && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error Loading Departments</MessageBarTitle>
                  {departmentsError instanceof Error ? departmentsError.message : 'Failed to load departments'}
                </MessageBarBody>
              </MessageBar>
            )}

            {departmentsLoading ? (
              <Spinner label="Loading departments..." />
            ) : (
              <div className={styles.tableContainer}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Code</TableHeaderCell>
                      <TableHeaderCell>Department Name</TableHeaderCell>
                      <TableHeaderCell>Users</TableHeaderCell>
                      <TableHeaderCell>Projects</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departments && departments.length > 0 ? (
                      departments.map((department) => (
                        <TableRow key={department.DepartmentID}>
                          <TableCell>{department.DepartmentCode}</TableCell>
                          <TableCell>{department.DepartmentName}</TableCell>
                          <TableCell>{department.UserCount || 0}</TableCell>
                          <TableCell>{department.ProjectCount || 0}</TableCell>
                          <TableCell>
                            <Badge
                              appearance="filled"
                              color={department.IsActive ? 'success' : 'danger'}
                              className={styles.badge}
                            >
                              {department.IsActive ? 'Active' : 'Inactive'}
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
                                    onClick={() => handleEditDepartment(department)}
                                  >
                                    Edit
                                  </MenuItem>
                                </MenuList>
                              </MenuPopover>
                            </Menu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                          No departments found. Click "New Department" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <DepartmentFormModal
              open={isDeptModalOpen}
              onClose={() => {
                setIsDeptModalOpen(false);
                setEditingDepartment(null);
              }}
              onSubmit={handleSubmitDepartment}
              department={editingDepartment}
              isLoading={createDepartment.isPending || updateDepartment.isPending}
            />
          </>
        )}

        {selectedTab === 'holidays' && (
          <>
            <div className={styles.header}>
              <Title3>Holiday Management</Title3>
              <Button
                appearance="primary"
                icon={<AddRegular />}
                onClick={handleCreateHoliday}
              >
                New Holiday
              </Button>
            </div>

            {holidaysError && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error Loading Holidays</MessageBarTitle>
                  {holidaysError instanceof Error ? holidaysError.message : 'Failed to load holidays'}
                </MessageBarBody>
              </MessageBar>
            )}

            {holidaysLoading ? (
              <Spinner label="Loading holidays..." />
            ) : (
              <div className={styles.tableContainer}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Holiday Name</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Default Hours</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays && holidays.length > 0 ? (
                      holidays.map((holiday) => (
                        <TableRow key={holiday.HolidayID}>
                          <TableCell>{holiday.HolidayName}</TableCell>
                          <TableCell>
                            {new Date(holiday.HolidayDate).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>{holiday.DefaultHours} hrs</TableCell>
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
                                    onClick={() => handleEditHoliday(holiday)}
                                  >
                                    Edit
                                  </MenuItem>
                                  <MenuItem
                                    icon={<DeleteRegular />}
                                    onClick={() => handleDeleteHoliday(holiday.HolidayID)}
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
                        <TableCell colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                          No holidays configured. Click "New Holiday" to add company holidays.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <HolidayFormModal
              open={isHolidayModalOpen}
              onClose={() => {
                setIsHolidayModalOpen(false);
                setEditingHoliday(null);
              }}
              onSubmit={handleSubmitHoliday}
              holiday={editingHoliday}
              isLoading={createHoliday.isPending || updateHoliday.isPending}
            />
          </>
        )}

        {selectedTab === 'users' && (
          <>
            <div className={styles.header}>
              <Title3>User Management</Title3>
              <Button
                appearance="primary"
                icon={<ArrowSyncRegular />}
                onClick={() => syncUsers.mutate()}
                disabled={syncUsers.isPending}
              >
                {syncUsers.isPending ? 'Syncing...' : 'Sync from Entra ID'}
              </Button>
            </div>

            {syncUsers.isSuccess && (
              <MessageBar intent={syncUsers.data.conflicts.length > 0 ? 'warning' : 'success'}>
                <MessageBarBody>
                  <MessageBarTitle>Sync Complete</MessageBarTitle>
                  <span>
                    Users: {syncUsers.data.created} created, {syncUsers.data.updated} updated, {syncUsers.data.deactivated} deactivated
                    {(syncUsers.data.departmentsCreated > 0 || syncUsers.data.departmentsUpdated > 0) &&
                      ` | Departments: ${syncUsers.data.departmentsCreated} created, ${syncUsers.data.departmentsUpdated} updated`}
                    {syncUsers.data.conflicts.length > 0 &&
                      ` | ${syncUsers.data.conflicts.length} conflicts (emails sent)`}
                    {syncUsers.data.errors.length > 0 &&
                      ` | ${syncUsers.data.errors.length} errors`}
                  </span>
                </MessageBarBody>
              </MessageBar>
            )}

            {syncUsers.isError && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Sync Failed</MessageBarTitle>
                  {syncUsers.error.message}
                </MessageBarBody>
              </MessageBar>
            )}

            {usersError && (
              <MessageBar intent="error">
                <MessageBarBody>
                  <MessageBarTitle>Error Loading Users</MessageBarTitle>
                  {usersError instanceof Error ? usersError.message : 'Failed to load users'}
                </MessageBarBody>
              </MessageBar>
            )}

            {usersLoading ? (
              <Spinner label="Loading users..." />
            ) : (
              <div className={styles.tableContainer}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Name</TableHeaderCell>
                      <TableHeaderCell>Email</TableHeaderCell>
                      <TableHeaderCell>Department</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Manager</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell>Last Login</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users && users.length > 0 ? (
                      users.map((user) => (
                        <TableRow key={user.UserID}>
                          <TableCell>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <PersonRegular />
                              {user.Name}
                            </div>
                          </TableCell>
                          <TableCell>{user.Email}</TableCell>
                          <TableCell>{user.DepartmentName || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              appearance="filled"
                              color={
                                user.Role === 'TimesheetAdmin' ? 'danger' :
                                user.Role === 'Manager' ? 'warning' :
                                user.Role === 'Leadership' ? 'important' : 'informative'
                              }
                              className={styles.badge}
                            >
                              {user.Role}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.ManagerName || '-'}</TableCell>
                          <TableCell>
                            {user.IsActive ? (
                              <Badge appearance="filled" color="success" icon={<CheckmarkCircleRegular />}>
                                Active
                              </Badge>
                            ) : (
                              <Badge appearance="filled" color="danger" icon={<DismissCircleRegular />}>
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.LastLoginDate
                              ? new Date(user.LastLoginDate).toLocaleDateString()
                              : 'Never'}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                          No users found. Click "Sync from Entra ID" to import users from security groups.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
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
