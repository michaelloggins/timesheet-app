/**
 * Admin Panel
 * Project, Department, and User Management
 */

import { useState, useEffect } from 'react';
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
  shorthands,
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
  Dropdown,
  Option,
  Field,
  Popover,
  PopoverTrigger,
  PopoverSurface,
  Link,
  Text,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Divider,
  Body1Strong,
  Caption1,
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
  HistoryRegular,
  Dismiss24Regular,
  PersonAddRegular,
  PersonEditRegular,
  PersonDeleteRegular,
  BuildingRegular,
  WarningRegular,
  ErrorCircleRegular,
} from '@fluentui/react-icons';
import { useProjects, useCreateProject, useUpdateProject, useDeactivateProject } from '../../hooks/useProjects';
import { useUsers, useSyncUsers, User } from '../../hooks/useUsers';
import { useDepartments, useCreateDepartment, useUpdateDepartment } from '../../hooks/useDepartments';
import { useHolidays, useCreateHoliday, useUpdateHoliday, useDeleteHoliday } from '../../hooks/useHolidays';
import { useAuditLogs, useAdminAuditLogs, AuditLogFilters, AdminAuditLogFilters } from '../../hooks/useAuditLogs';
import { getActionInfo, getAdminActionInfo } from '../../services/auditService';

// Parse date string as local date to avoid timezone shift
const parseLocalDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  // Take only the date part (YYYY-MM-DD) and parse as local time
  const str = dateStr.split('T')[0];
  const [year, month, day] = str.split('-').map(Number);
  return new Date(year, month - 1, day);
};
import { ProjectFormModal } from './ProjectFormModal';
import { DepartmentFormModal } from './DepartmentFormModal';
import { HolidayFormModal } from './HolidayFormModal';
import { UserDetailsModal } from './UserDetailsModal';
import { DelegationSettings } from '../Settings/DelegationSettings';
import { LegacyImportAdmin } from './LegacyImportAdmin';
import { Project, ProjectWithAssignments } from '../../types';
import { CreateProjectDto, projectService } from '../../services/projectService';
import { Department, CreateDepartmentDto } from '../../services/departmentService';
import { Holiday, CreateHolidayDto } from '../../services/holidayService';
import { useCurrentUser } from '../../hooks/useCurrentUser';

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
  tableWrapper: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  },
  tableContainer: {
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
  },
  table: {
    minWidth: '700px',
    tableLayout: 'fixed',
  },
  tableWide: {
    minWidth: '900px',
    tableLayout: 'fixed',
  },
  badge: {
    minWidth: '60px',
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
  },
  filters: {
    display: 'flex',
    gap: tokens.spacingHorizontalL,
    alignItems: 'flex-end',
    marginBottom: tokens.spacingVerticalM,
    flexWrap: 'wrap',
  },
  filterField: {
    minWidth: '150px',
  },
  clickableRow: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  cellTruncate: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cellWrap: {
    wordBreak: 'break-word',
  },
  // Sync Results Dialog styles
  syncDialogSurface: {
    maxWidth: '550px',
    width: '90vw',
  },
  syncResultsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    ...shorthands.gap(tokens.spacingVerticalM, tokens.spacingHorizontalL),
    marginBottom: tokens.spacingVerticalL,
  },
  syncResultItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  syncResultIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  syncResultValue: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
  },
  syncResultLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  syncSection: {
    marginTop: tokens.spacingVerticalM,
  },
  syncSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalS,
  },
  syncErrorList: {
    maxHeight: '150px',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  syncErrorItem: {
    ...shorthands.padding(tokens.spacingVerticalXS, '0'),
    fontSize: tokens.fontSizeBase200,
  },
});


export const AdminPanel = () => {
  const styles = useStyles();

  // Get current user role permissions
  const { isAdmin, isProjectAdmin, isAuditReviewer, user } = useCurrentUser();

  const [selectedTab, setSelectedTab] = useState<string>('projects');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectWithAssignments | null>(null);
  const [isLoadingProjectDetails, setIsLoadingProjectDetails] = useState(false);
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>({ days: 30, limit: 100 });
  const [adminAuditFilters, setAdminAuditFilters] = useState<AdminAuditLogFilters>({ days: 30, limit: 100 });
  const [auditLogType, setAuditLogType] = useState<'timesheet' | 'admin'>('admin');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSyncResultsOpen, setIsSyncResultsOpen] = useState(false);
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // Set the initial tab and audit log type when user data is loaded
  useEffect(() => {
    if (user && !initialSetupDone) {
      // Determine the default tab based on user role
      if (isProjectAdmin) {
        setSelectedTab('projects');
      } else if (isAuditReviewer) {
        setSelectedTab('audit');
      }

      // AuditReviewers who are not full admins only see timesheet activity
      if (isAuditReviewer && !isAdmin) {
        setAuditLogType('timesheet');
      }

      setInitialSetupDone(true);
    }
  }, [user, initialSetupDone, isAdmin, isProjectAdmin, isAuditReviewer]);

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

  // React Query hooks - Audit Logs
  const { logs: auditLogs, isLoading: auditLoading, error: auditError } = useAuditLogs(auditFilters);
  const { logs: adminAuditLogs, isLoading: adminAuditLoading, error: adminAuditError } = useAdminAuditLogs(adminAuditFilters);

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsModalOpen(true);
  };

  const handleEditProject = async (project: Project) => {
    setIsLoadingProjectDetails(true);
    setIsModalOpen(true);
    try {
      // Fetch project with full assignments (departments and employees)
      const projectWithAssignments = await projectService.getProjectWithAssignments(project.projectId);
      setEditingProject(projectWithAssignments);
    } catch (error) {
      console.error('Failed to fetch project details:', error);
      // Fall back to basic project data
      setEditingProject(project as ProjectWithAssignments);
    } finally {
      setIsLoadingProjectDetails(false);
    }
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
        {/* Projects tab - visible to TimesheetAdmin, Leadership, and ProjectAdmin */}
        {isProjectAdmin && (
          <Tab key="projects" value="projects">Projects</Tab>
        )}
        {/* Departments tab - visible to TimesheetAdmin only */}
        {isAdmin && (
          <Tab key="departments" value="departments">Departments</Tab>
        )}
        {/* Holidays tab - visible to TimesheetAdmin only */}
        {isAdmin && (
          <Tab key="holidays" value="holidays">Holidays</Tab>
        )}
        {/* Users tab - visible to TimesheetAdmin only */}
        {isAdmin && (
          <Tab key="users" value="users">Users</Tab>
        )}
        {/* Audit tab - visible to TimesheetAdmin and AuditReviewer */}
        {(isAdmin || isAuditReviewer) && (
          <Tab key="audit" value="audit" icon={<HistoryRegular />}>Audit Log</Tab>
        )}
        {/* Settings tab - visible to TimesheetAdmin only */}
        {isAdmin && (
          <Tab key="settings" value="settings">Settings</Tab>
        )}
        {/* Legacy Import tab - visible to TimesheetAdmin only */}
        {isAdmin && (
          <Tab key="legacy-import" value="legacy-import" icon={<ArrowSyncRegular />}>Legacy Import</Tab>
        )}
      </TabList>

      <div className={styles.tabContent}>
        {selectedTab === 'projects' && isProjectAdmin && (
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
                <div className={styles.tableWrapper}>
                  <Table className={styles.tableWide}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell style={{ width: '120px' }}>Project Number</TableHeaderCell>
                        <TableHeaderCell style={{ width: '200px' }}>Project Name</TableHeaderCell>
                        <TableHeaderCell style={{ width: '150px' }}>Department</TableHeaderCell>
                        <TableHeaderCell style={{ width: '100px' }}>Type</TableHeaderCell>
                        <TableHeaderCell style={{ width: '120px' }}>Grant ID</TableHeaderCell>
                        <TableHeaderCell style={{ width: '80px' }}>Status</TableHeaderCell>
                        <TableHeaderCell style={{ width: '70px' }}>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects && projects.length > 0 ? (
                        projects.map((project) => (
                          <TableRow key={project.projectId}>
                            <TableCell className={styles.cellTruncate}>{project.projectNumber}</TableCell>
                            <TableCell className={styles.cellTruncate} title={project.projectName}>{project.projectName}</TableCell>
                            <TableCell className={styles.cellTruncate}>{getDepartmentName(project.departmentId)}</TableCell>
                            <TableCell>{project.projectType}</TableCell>
                            <TableCell className={styles.cellTruncate}>{project.grantIdentifier || '-'}</TableCell>
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
              </div>
            )}

            <ProjectFormModal
              open={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingProject(null);
              }}
              onSubmit={handleSubmitProject}
              project={isLoadingProjectDetails ? null : editingProject}
              departments={departments?.map(d => ({ departmentId: d.DepartmentID, departmentName: d.DepartmentName })) || []}
              isLoading={createProject.isPending || updateProject.isPending || isLoadingProjectDetails}
            />
          </>
        )}

        {selectedTab === 'departments' && isAdmin && (
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
                <div className={styles.tableWrapper}>
                  <Table className={styles.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell style={{ width: '100px' }}>Code</TableHeaderCell>
                        <TableHeaderCell style={{ width: '250px' }}>Department Name</TableHeaderCell>
                        <TableHeaderCell style={{ width: '80px' }}>Users</TableHeaderCell>
                        <TableHeaderCell style={{ width: '80px' }}>Projects</TableHeaderCell>
                        <TableHeaderCell style={{ width: '80px' }}>Status</TableHeaderCell>
                        <TableHeaderCell style={{ width: '70px' }}>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments && departments.length > 0 ? (
                        departments.map((department) => (
                          <TableRow key={department.DepartmentID}>
                            <TableCell className={styles.cellTruncate}>{department.DepartmentCode}</TableCell>
                            <TableCell className={styles.cellTruncate} title={department.DepartmentName}>{department.DepartmentName}</TableCell>
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

        {selectedTab === 'holidays' && isAdmin && (
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
                <div className={styles.tableWrapper}>
                  <Table className={styles.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell style={{ width: '250px' }}>Holiday Name</TableHeaderCell>
                        <TableHeaderCell style={{ width: '200px' }}>Date</TableHeaderCell>
                        <TableHeaderCell style={{ width: '120px' }}>Default Hours</TableHeaderCell>
                        <TableHeaderCell style={{ width: '70px' }}>Actions</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays && holidays.length > 0 ? (
                        holidays.map((holiday) => (
                          <TableRow key={holiday.HolidayID}>
                            <TableCell className={styles.cellTruncate} title={holiday.HolidayName}>{holiday.HolidayName}</TableCell>
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

        {selectedTab === 'users' && isAdmin && (
          <>
            <div className={styles.header}>
              <Title3>User Management</Title3>
              <Button
                appearance="primary"
                icon={<ArrowSyncRegular />}
                onClick={async () => {
                  await syncUsers.mutateAsync();
                  setIsSyncResultsOpen(true);
                }}
                disabled={syncUsers.isPending}
              >
                {syncUsers.isPending ? 'Syncing...' : 'Sync from Entra ID'}
              </Button>
            </div>

            {syncUsers.isSuccess && !isSyncResultsOpen && (
              <MessageBar intent={syncUsers.data.errors.length > 0 ? 'warning' : 'success'}>
                <MessageBarBody>
                  <MessageBarTitle>Sync Complete</MessageBarTitle>
                  <span>
                    {syncUsers.data.created + syncUsers.data.updated + syncUsers.data.deactivated} users processed
                    {syncUsers.data.errors.length > 0 && ` with ${syncUsers.data.errors.length} errors`}.{' '}
                    <Link onClick={() => setIsSyncResultsOpen(true)}>View Details</Link>
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
                <div className={styles.tableWrapper}>
                  <Table className={styles.tableWide}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell style={{ width: '180px' }}>Name</TableHeaderCell>
                        <TableHeaderCell style={{ width: '200px' }}>Email</TableHeaderCell>
                        <TableHeaderCell style={{ width: '130px' }}>Department</TableHeaderCell>
                        <TableHeaderCell style={{ width: '100px' }}>Role</TableHeaderCell>
                        <TableHeaderCell style={{ width: '80px' }}>Work Week</TableHeaderCell>
                        <TableHeaderCell style={{ width: '130px' }}>Manager</TableHeaderCell>
                        <TableHeaderCell style={{ width: '70px' }}>Status</TableHeaderCell>
                        <TableHeaderCell style={{ width: '90px' }}>Last Login</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((user) => (
                          <TableRow
                            key={user.UserID}
                            className={styles.clickableRow}
                            onClick={() => setSelectedUser(user)}
                          >
                            <TableCell className={styles.cellTruncate} title={user.Name}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                                <PersonRegular style={{ flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.Name}</span>
                              </div>
                            </TableCell>
                            <TableCell className={styles.cellTruncate} title={user.Email}>{user.Email}</TableCell>
                            <TableCell className={styles.cellTruncate} title={user.DepartmentName || '-'}>{user.DepartmentName || '-'}</TableCell>
                            <TableCell>
                              <Badge
                                appearance="filled"
                                color={
                                  user.Role === 'TimesheetAdmin' ? 'danger' :
                                  user.Role === 'Manager' ? 'warning' :
                                  user.Role === 'Leadership' ? 'important' :
                                  user.Role === 'ProjectAdmin' ? 'severe' :
                                  user.Role === 'AuditReviewer' ? 'subtle' : 'informative'
                                }
                                className={styles.badge}
                              >
                                {user.Role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {user.WorkWeekPattern === 'TuesdaySaturday' ? 'Tue-Sat' : 'Mon-Fri'}
                            </TableCell>
                            <TableCell className={styles.cellTruncate} title={user.ManagerName || '-'}>{user.ManagerName || '-'}</TableCell>
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
                          <TableCell colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                            No users found. Click "Sync from Entra ID" to import users from security groups.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}

        {selectedTab === 'audit' && (isAdmin || isAuditReviewer) && (
          <>
            <div className={styles.header}>
              <Title3>Audit Log</Title3>
            </div>

            {/* Log Type Toggle - Only show both options if user is full admin */}
            {isAdmin ? (
              <TabList
                selectedValue={auditLogType}
                onTabSelect={(_, data) => setAuditLogType(data.value as 'timesheet' | 'admin')}
                size="small"
                style={{ marginBottom: tokens.spacingVerticalM }}
              >
                <Tab value="admin">Admin Actions</Tab>
                <Tab value="timesheet">Timesheet Activity</Tab>
              </TabList>
            ) : (
              /* AuditReviewer only sees Timesheet Activity - no toggle needed */
              <Title3 style={{ marginBottom: tokens.spacingVerticalM }}>Timesheet Activity</Title3>
            )}

            {/* Admin Actions Log - Only accessible to full admins */}
            {auditLogType === 'admin' && isAdmin && (
              <>
                <div className={styles.filters}>
                  <Field label="Time Period" className={styles.filterField}>
                    <Dropdown
                      value={adminAuditFilters.days === 7 ? 'Last 7 days' : adminAuditFilters.days === 30 ? 'Last 30 days' : adminAuditFilters.days === 90 ? 'Last 90 days' : 'All time'}
                      onOptionSelect={(_, data) => {
                        const daysMap: Record<string, number | undefined> = {
                          'Last 7 days': 7,
                          'Last 30 days': 30,
                          'Last 90 days': 90,
                          'All time': undefined,
                        };
                        setAdminAuditFilters({ ...adminAuditFilters, days: daysMap[data.optionText || ''] });
                      }}
                    >
                      <Option>Last 7 days</Option>
                      <Option>Last 30 days</Option>
                      <Option>Last 90 days</Option>
                      <Option>All time</Option>
                    </Dropdown>
                  </Field>

                  <Field label="Action Type" className={styles.filterField}>
                    <Dropdown
                      value={adminAuditFilters.actionType || 'All actions'}
                      onOptionSelect={(_, data) => {
                        const actionMap: Record<string, string | undefined> = {
                          'All actions': undefined,
                          'User Sync': 'USER_SYNC',
                          'Project Changes': 'PROJECT_',
                          'Department Changes': 'DEPARTMENT_',
                          'Holiday Changes': 'HOLIDAY_',
                        };
                        setAdminAuditFilters({ ...adminAuditFilters, actionType: actionMap[data.optionText || ''] });
                      }}
                    >
                      <Option>All actions</Option>
                      <Option>User Sync</Option>
                      <Option>Project Changes</Option>
                      <Option>Department Changes</Option>
                      <Option>Holiday Changes</Option>
                    </Dropdown>
                  </Field>
                </div>

                {adminAuditError && (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Error Loading Admin Audit Logs</MessageBarTitle>
                      {adminAuditError instanceof Error ? adminAuditError.message : 'Failed to load audit logs'}
                    </MessageBarBody>
                  </MessageBar>
                )}

                {adminAuditLoading ? (
                  <Spinner label="Loading admin audit logs..." />
                ) : (
                  <div className={styles.tableContainer}>
                    <div className={styles.tableWrapper}>
                      <Table className={styles.tableWide}>
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell style={{ width: '150px' }}>Date & Time</TableHeaderCell>
                            <TableHeaderCell style={{ width: '130px' }}>Action</TableHeaderCell>
                            <TableHeaderCell style={{ width: '150px' }}>Performed By</TableHeaderCell>
                            <TableHeaderCell style={{ width: '100px' }}>Entity Type</TableHeaderCell>
                            <TableHeaderCell style={{ width: '200px' }}>Entity Name</TableHeaderCell>
                            <TableHeaderCell style={{ width: '80px' }}>Details</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adminAuditLogs && adminAuditLogs.length > 0 ? (
                            adminAuditLogs.map((log) => {
                              const actionInfo = getAdminActionInfo(log.actionType);
                              return (
                                <TableRow key={log.auditId}>
                                  <TableCell>
                                    {new Date(log.actionDate).toLocaleDateString()}{' '}
                                    {new Date(log.actionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      appearance="filled"
                                      color={actionInfo.color}
                                      className={styles.badge}
                                    >
                                      {actionInfo.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={styles.cellTruncate} title={log.actionBy.name}>
                                    {log.actionBy.name}
                                  </TableCell>
                                  <TableCell>{log.entityType || '-'}</TableCell>
                                  <TableCell className={styles.cellTruncate} title={log.entityName || '-'}>
                                    {log.entityName || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {log.details ? (
                                      <Popover>
                                        <PopoverTrigger disableButtonEnhancement>
                                          <Link>View</Link>
                                        </PopoverTrigger>
                                        <PopoverSurface style={{ maxWidth: '400px' }}>
                                          <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                                            {JSON.stringify(log.details, null, 2)}
                                          </pre>
                                        </PopoverSurface>
                                      </Popover>
                                    ) : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                No admin audit logs found for the selected filters.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Timesheet Activity Log - Accessible to both admins and AuditReviewers */}
            {(auditLogType === 'timesheet' || !isAdmin) && (
              <>
                <div className={styles.filters}>
                  <Field label="Time Period" className={styles.filterField}>
                    <Dropdown
                      value={auditFilters.days === 7 ? 'Last 7 days' : auditFilters.days === 30 ? 'Last 30 days' : auditFilters.days === 90 ? 'Last 90 days' : 'All time'}
                      onOptionSelect={(_, data) => {
                        const daysMap: Record<string, number | undefined> = {
                          'Last 7 days': 7,
                          'Last 30 days': 30,
                          'Last 90 days': 90,
                          'All time': undefined,
                        };
                        setAuditFilters({ ...auditFilters, days: daysMap[data.optionText || ''] });
                      }}
                    >
                      <Option>Last 7 days</Option>
                      <Option>Last 30 days</Option>
                      <Option>Last 90 days</Option>
                      <Option>All time</Option>
                    </Dropdown>
                  </Field>

                  <Field label="Action Type" className={styles.filterField}>
                    <Dropdown
                      value={auditFilters.action || 'All actions'}
                      onOptionSelect={(_, data) => {
                        const action = data.optionText === 'All actions' ? undefined : data.optionText;
                        setAuditFilters({ ...auditFilters, action });
                      }}
                    >
                      <Option>All actions</Option>
                      <Option>Created</Option>
                      <Option>Submitted</Option>
                      <Option>Approved</Option>
                      <Option>Returned</Option>
                      <Option>Withdrawn</Option>
                      <Option>Unlocked</Option>
                      <Option>Modified</Option>
                    </Dropdown>
                  </Field>
                </div>

                {auditError && (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Error Loading Audit Logs</MessageBarTitle>
                      {auditError instanceof Error ? auditError.message : 'Failed to load audit logs'}
                    </MessageBarBody>
                  </MessageBar>
                )}

                {auditLoading ? (
                  <Spinner label="Loading audit logs..." />
                ) : (
                  <div className={styles.tableContainer}>
                    <div className={styles.tableWrapper}>
                      <Table className={styles.tableWide}>
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell style={{ width: '150px' }}>Date & Time</TableHeaderCell>
                            <TableHeaderCell style={{ width: '100px' }}>Action</TableHeaderCell>
                            <TableHeaderCell style={{ width: '160px' }}>Performed By</TableHeaderCell>
                            <TableHeaderCell style={{ width: '160px' }}>Timesheet Owner</TableHeaderCell>
                            <TableHeaderCell style={{ width: '130px' }}>Period</TableHeaderCell>
                            <TableHeaderCell style={{ width: '90px' }}>Notes</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs && auditLogs.length > 0 ? (
                            auditLogs.map((log) => {
                              const actionInfo = getActionInfo(log.action);
                              return (
                                <TableRow key={log.historyId}>
                                  <TableCell>
                                    {new Date(log.actionDate).toLocaleDateString()}{' '}
                                    {new Date(log.actionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      appearance="filled"
                                      color={actionInfo.color}
                                      className={styles.badge}
                                    >
                                      {actionInfo.label}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={styles.cellTruncate} title={log.actionBy.name}>
                                    {log.actionBy.name}
                                  </TableCell>
                                  <TableCell className={styles.cellTruncate} title={log.timesheetOwner?.name || '-'}>
                                    {log.timesheetOwner?.name || '-'}
                                  </TableCell>
                                  <TableCell>
                                    {log.periodStartDate && log.periodEndDate ? (
                                      <span>
                                        {parseLocalDate(log.periodStartDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        {' - '}
                                        {parseLocalDate(log.periodEndDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    ) : '-'}
                                  </TableCell>
                                  <TableCell>
                                    {log.notes ? (
                                      <Popover>
                                        <PopoverTrigger disableButtonEnhancement>
                                          <Link>See Notes</Link>
                                        </PopoverTrigger>
                                        <PopoverSurface style={{ maxWidth: '300px' }}>
                                          {log.notes}
                                        </PopoverSurface>
                                      </Popover>
                                    ) : '-'}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                                No audit logs found for the selected filters.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {selectedTab === 'settings' && isAdmin && (
          <>
            <div className={styles.header}>
              <Title3>Delegation Settings</Title3>
            </div>
            <Text style={{ marginBottom: tokens.spacingVerticalM, display: 'block' }}>
              Delegations allow you to authorize another user to approve timesheets on your behalf during
              your absence. The delegate will see pending approvals that would normally come to you.
            </Text>
            <DelegationSettings embedded />
          </>
        )}

        {selectedTab === 'legacy-import' && isAdmin && (
          <LegacyImportAdmin />
        )}
      </div>

      {/* User Details Modal */}
      <UserDetailsModal
        open={selectedUser !== null}
        onClose={() => setSelectedUser(null)}
        user={selectedUser}
      />

      {/* Sync Results Dialog */}
      <Dialog open={isSyncResultsOpen} onOpenChange={(_, data) => setIsSyncResultsOpen(data.open)}>
        <DialogSurface className={styles.syncDialogSurface}>
          <DialogTitle>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Entra ID Sync Results</span>
              <Button
                appearance="subtle"
                icon={<Dismiss24Regular />}
                onClick={() => setIsSyncResultsOpen(false)}
                aria-label="Close"
              />
            </div>
          </DialogTitle>
          <DialogBody>
            <DialogContent>
              {syncUsers.data && (
                <>
                  {/* User Stats */}
                  <Body1Strong style={{ marginBottom: tokens.spacingVerticalS, display: 'block' }}>
                    Users
                  </Body1Strong>
                  <div className={styles.syncResultsGrid}>
                    <div className={styles.syncResultItem}>
                      <div className={styles.syncResultIcon} style={{ backgroundColor: tokens.colorPaletteGreenBackground2 }}>
                        <PersonAddRegular style={{ color: tokens.colorPaletteGreenForeground1 }} />
                      </div>
                      <div>
                        {syncUsers.data.created > 0 ? (
                          <Popover>
                            <PopoverTrigger disableButtonEnhancement>
                              <Link className={styles.syncResultValue} style={{ cursor: 'pointer' }}>{syncUsers.data.created}</Link>
                            </PopoverTrigger>
                            <PopoverSurface style={{ maxWidth: '350px', maxHeight: '300px', overflow: 'auto' }}>
                              <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Created Users</Body1Strong>
                              {syncUsers.data.createdUsers?.map((user, idx) => (
                                <div key={idx} style={{ marginBottom: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, borderBottom: idx < syncUsers.data.createdUsers.length - 1 ? `1px solid ${tokens.colorNeutralStroke2}` : 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                                  <Caption1 style={{ display: 'block' }}>{user.email}</Caption1>
                                  <Caption1 style={{ display: 'block' }}>Role: {user.role}{user.department ? ` • Dept: ${user.department}` : ''}</Caption1>
                                </div>
                              ))}
                            </PopoverSurface>
                          </Popover>
                        ) : (
                          <div className={styles.syncResultValue}>{syncUsers.data.created}</div>
                        )}
                        <div className={styles.syncResultLabel}>Created</div>
                      </div>
                    </div>
                    <div className={styles.syncResultItem}>
                      <div className={styles.syncResultIcon} style={{ backgroundColor: tokens.colorPaletteBlueBackground2 }}>
                        <PersonEditRegular style={{ color: tokens.colorPaletteBlueForeground2 }} />
                      </div>
                      <div>
                        {syncUsers.data.updated > 0 ? (
                          <Popover>
                            <PopoverTrigger disableButtonEnhancement>
                              <Link className={styles.syncResultValue} style={{ cursor: 'pointer' }}>{syncUsers.data.updated}</Link>
                            </PopoverTrigger>
                            <PopoverSurface style={{ maxWidth: '400px', maxHeight: '300px', overflow: 'auto' }}>
                              <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Updated Users</Body1Strong>
                              {syncUsers.data.updatedUsers?.map((user, idx) => (
                                <div key={idx} style={{ marginBottom: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, borderBottom: idx < syncUsers.data.updatedUsers.length - 1 ? `1px solid ${tokens.colorNeutralStroke2}` : 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                                  <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>{user.email}</Caption1>
                                  {user.changes.map((change, cidx) => (
                                    <div key={cidx} style={{ fontSize: '12px', marginLeft: tokens.spacingHorizontalS }}>
                                      <span style={{ color: tokens.colorNeutralForeground3 }}>{change.field}:</span>{' '}
                                      <span style={{ textDecoration: 'line-through', color: tokens.colorPaletteRedForeground1 }}>{change.from || '(none)'}</span>
                                      {' → '}
                                      <span style={{ color: tokens.colorPaletteGreenForeground1 }}>{change.to || '(none)'}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </PopoverSurface>
                          </Popover>
                        ) : (
                          <div className={styles.syncResultValue}>{syncUsers.data.updated}</div>
                        )}
                        <div className={styles.syncResultLabel}>Updated</div>
                      </div>
                    </div>
                    <div className={styles.syncResultItem}>
                      <div className={styles.syncResultIcon} style={{ backgroundColor: tokens.colorPaletteRedBackground2 }}>
                        <PersonDeleteRegular style={{ color: tokens.colorPaletteRedForeground1 }} />
                      </div>
                      <div>
                        {syncUsers.data.deactivated > 0 ? (
                          <Popover>
                            <PopoverTrigger disableButtonEnhancement>
                              <Link className={styles.syncResultValue} style={{ cursor: 'pointer' }}>{syncUsers.data.deactivated}</Link>
                            </PopoverTrigger>
                            <PopoverSurface style={{ maxWidth: '350px', maxHeight: '300px', overflow: 'auto' }}>
                              <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Deactivated Users</Body1Strong>
                              {syncUsers.data.deactivatedUsers?.map((user, idx) => (
                                <div key={idx} style={{ marginBottom: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, borderBottom: idx < syncUsers.data.deactivatedUsers.length - 1 ? `1px solid ${tokens.colorNeutralStroke2}` : 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                                  <Caption1 style={{ display: 'block' }}>{user.email}</Caption1>
                                  <Caption1 style={{ display: 'block' }}>Role: {user.role}{user.department ? ` • Dept: ${user.department}` : ''}</Caption1>
                                </div>
                              ))}
                            </PopoverSurface>
                          </Popover>
                        ) : (
                          <div className={styles.syncResultValue}>{syncUsers.data.deactivated}</div>
                        )}
                        <div className={styles.syncResultLabel}>Deactivated</div>
                      </div>
                    </div>
                  </div>

                  {/* Departments Section */}
                  <Body1Strong style={{ marginBottom: tokens.spacingVerticalS, marginTop: tokens.spacingVerticalM, display: 'block' }}>
                    Departments
                  </Body1Strong>
                  <div className={styles.syncResultsGrid}>
                    <div className={styles.syncResultItem}>
                      <div className={styles.syncResultIcon} style={{ backgroundColor: tokens.colorPaletteGreenBackground2 }}>
                        <BuildingRegular style={{ color: tokens.colorPaletteGreenForeground1 }} />
                      </div>
                      <div>
                        {syncUsers.data.departmentsCreated > 0 ? (
                          <Popover>
                            <PopoverTrigger disableButtonEnhancement>
                              <Link className={styles.syncResultValue} style={{ cursor: 'pointer' }}>{syncUsers.data.departmentsCreated}</Link>
                            </PopoverTrigger>
                            <PopoverSurface style={{ maxWidth: '300px' }}>
                              <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Created Departments</Body1Strong>
                              {syncUsers.data.createdDepartments?.map((dept, idx) => (
                                <div key={idx} style={{ marginBottom: tokens.spacingVerticalXS }}>
                                  <span style={{ fontWeight: 600 }}>{dept.name}</span>
                                  <Caption1 style={{ marginLeft: tokens.spacingHorizontalS }}>({dept.code})</Caption1>
                                </div>
                              ))}
                            </PopoverSurface>
                          </Popover>
                        ) : (
                          <div className={styles.syncResultValue}>{syncUsers.data.departmentsCreated}</div>
                        )}
                        <div className={styles.syncResultLabel}>Created</div>
                      </div>
                    </div>
                    <div className={styles.syncResultItem}>
                      <div className={styles.syncResultIcon} style={{ backgroundColor: tokens.colorPaletteBlueBackground2 }}>
                        <BuildingRegular style={{ color: tokens.colorPaletteBlueForeground2 }} />
                      </div>
                      <div>
                        {syncUsers.data.departmentsUpdated > 0 ? (
                          <Popover>
                            <PopoverTrigger disableButtonEnhancement>
                              <Link className={styles.syncResultValue} style={{ cursor: 'pointer' }}>{syncUsers.data.departmentsUpdated}</Link>
                            </PopoverTrigger>
                            <PopoverSurface style={{ maxWidth: '400px', maxHeight: '300px', overflow: 'auto' }}>
                              <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>Updated Departments</Body1Strong>
                              {syncUsers.data.updatedDepartments?.map((dept, idx) => (
                                <div key={idx} style={{ marginBottom: tokens.spacingVerticalS, paddingBottom: tokens.spacingVerticalS, borderBottom: idx < syncUsers.data.updatedDepartments.length - 1 ? `1px solid ${tokens.colorNeutralStroke2}` : 'none' }}>
                                  <div style={{ fontWeight: 600 }}>{dept.name}</div>
                                  <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>Code: {dept.code}</Caption1>
                                  {dept.changes?.map((change, cidx) => (
                                    <div key={cidx} style={{ fontSize: '12px', marginLeft: tokens.spacingHorizontalS }}>
                                      <span style={{ color: tokens.colorNeutralForeground3 }}>{change.field}:</span>{' '}
                                      <span style={{ textDecoration: 'line-through', color: tokens.colorPaletteRedForeground1 }}>{change.from || '(none)'}</span>
                                      {' → '}
                                      <span style={{ color: tokens.colorPaletteGreenForeground1 }}>{change.to || '(none)'}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </PopoverSurface>
                          </Popover>
                        ) : (
                          <div className={styles.syncResultValue}>{syncUsers.data.departmentsUpdated}</div>
                        )}
                        <div className={styles.syncResultLabel}>Updated</div>
                      </div>
                    </div>
                  </div>

                  {/* Conflicts Section */}
                  {syncUsers.data.conflicts.length > 0 && (
                    <div className={styles.syncSection}>
                      <Divider />
                      <div className={styles.syncSectionHeader} style={{ marginTop: tokens.spacingVerticalM }}>
                        <WarningRegular style={{ color: tokens.colorPaletteYellowForeground1 }} />
                        <Body1Strong>Conflicts ({syncUsers.data.conflicts.length})</Body1Strong>
                      </div>
                      <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                        These users are members of multiple department groups. Notification emails have been sent.
                      </Caption1>
                      <div className={styles.syncErrorList}>
                        {syncUsers.data.conflicts.map((conflict, index) => (
                          <div key={index} className={styles.syncErrorItem}>
                            {conflict}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors Section */}
                  {syncUsers.data.errors.length > 0 && (
                    <div className={styles.syncSection}>
                      <Divider />
                      <div className={styles.syncSectionHeader} style={{ marginTop: tokens.spacingVerticalM }}>
                        <ErrorCircleRegular style={{ color: tokens.colorPaletteRedForeground1 }} />
                        <Body1Strong>Errors ({syncUsers.data.errors.length})</Body1Strong>
                      </div>
                      <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                        The following errors occurred during sync:
                      </Caption1>
                      <div className={styles.syncErrorList}>
                        {syncUsers.data.errors.map((error, index) => (
                          <div key={index} className={styles.syncErrorItem} style={{ color: tokens.colorPaletteRedForeground1 }}>
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Success message if no issues */}
                  {syncUsers.data.conflicts.length === 0 && syncUsers.data.errors.length === 0 && (
                    <MessageBar intent="success" style={{ marginTop: tokens.spacingVerticalM }}>
                      <MessageBarBody>
                        Sync completed successfully with no issues.
                      </MessageBarBody>
                    </MessageBar>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setIsSyncResultsOpen(false)}>
                Close
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
