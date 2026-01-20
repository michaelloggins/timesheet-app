/**
 * Project Form Modal
 * Create/Edit project dialog with multi-department and employee targeting
 */

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Field,
  Dropdown,
  Option,
  Switch,
  makeStyles,
  tokens,
  Checkbox,
  Divider,
  Text,
  Badge,
  Spinner,
  Tag,
  TagGroup,
  shorthands,
  Caption1,
} from '@fluentui/react-components';
import { PersonRegular, BuildingRegular } from '@fluentui/react-icons';
import { Project, ProjectWithAssignments, TargetableEmployee } from '../../types';
import { CreateProjectDto } from '../../services/projectService';
import { useEmployeesByDepartments } from '../../hooks/useProjects';

const useStyles = makeStyles({
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  sectionHeader: {
    marginTop: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalS,
    fontWeight: tokens.fontWeightSemibold,
  },
  departmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '200px',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  departmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  employeeSection: {
    marginTop: tokens.spacingVerticalM,
  },
  employeeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    maxHeight: '250px',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  employeeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
    ...shorthands.padding(tokens.spacingVerticalXS, '0'),
  },
  employeeInfo: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
  },
  selectedTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalXS,
    marginTop: tokens.spacingVerticalS,
  },
  hint: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    marginTop: tokens.spacingVerticalXS,
  },
  targetingModeSelector: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground2,
  },
  targetingOption: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalS,
  },
  dialogSurface: {
    maxWidth: '600px',
    width: '90vw',
  },
});

type TargetingMode = 'all' | 'departments' | 'employees';

interface ProjectFormData {
  projectNumber: string;
  projectName: string;
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier: string;
  isActive: boolean;
  targetingMode: TargetingMode;
  selectedDepartmentIds: number[];
  selectedEmployeeIds: number[];
}

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectDto) => void;
  project?: Project | ProjectWithAssignments | null;
  departments: Array<{ departmentId: number; departmentName: string }>;
  isLoading?: boolean;
}

// Type guard for ProjectWithAssignments
const isProjectWithAssignments = (project: Project | ProjectWithAssignments): project is ProjectWithAssignments => {
  return 'assignedDepartments' in project || 'assignedEmployees' in project;
};

export const ProjectFormModal = ({
  open,
  onClose,
  onSubmit,
  project,
  departments,
  isLoading = false,
}: ProjectFormModalProps) => {
  const styles = useStyles();

  // Track selected department IDs for fetching employees
  const [watchedDepartmentIds, setWatchedDepartmentIds] = useState<number[]>([]);

  // Fetch employees from selected departments
  const { data: availableEmployees, isLoading: employeesLoading } = useEmployeesByDepartments(watchedDepartmentIds);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      projectNumber: '',
      projectName: '',
      projectType: 'Work',
      grantIdentifier: '',
      isActive: true,
      targetingMode: 'all',
      selectedDepartmentIds: [],
      selectedEmployeeIds: [],
    },
  });

  const targetingMode = watch('targetingMode');
  const selectedDepartmentIds = watch('selectedDepartmentIds');
  const selectedEmployeeIds = watch('selectedEmployeeIds');

  // Update watched department IDs when selection changes
  useEffect(() => {
    if (targetingMode === 'employees') {
      setWatchedDepartmentIds(selectedDepartmentIds);
    } else {
      setWatchedDepartmentIds([]);
    }
  }, [targetingMode, selectedDepartmentIds]);

  // Determine the initial targeting mode based on project assignments
  const getInitialTargetingMode = (proj: Project | ProjectWithAssignments | null): TargetingMode => {
    if (!proj) return 'all';

    if (isProjectWithAssignments(proj)) {
      const hasEmployees = proj.assignedEmployees && proj.assignedEmployees.length > 0;
      const hasDepartments = proj.assignedDepartments && proj.assignedDepartments.length > 0;

      if (hasEmployees) return 'employees';
      if (hasDepartments) return 'departments';
    }

    return 'all';
  };

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      const targetingMode = getInitialTargetingMode(project);

      let selectedDeptIds: number[] = [];
      let selectedEmpIds: number[] = [];

      if (isProjectWithAssignments(project)) {
        selectedDeptIds = project.assignedDepartments?.map(d => d.departmentId) || [];
        selectedEmpIds = project.assignedEmployees?.map(e => e.userId) || [];
      }

      reset({
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        projectType: project.projectType,
        grantIdentifier: project.grantIdentifier || '',
        isActive: project.isActive,
        targetingMode,
        selectedDepartmentIds: selectedDeptIds,
        selectedEmployeeIds: selectedEmpIds,
      });

      // Pre-fetch employees if in employee targeting mode
      if (targetingMode === 'employees' && selectedDeptIds.length > 0) {
        setWatchedDepartmentIds(selectedDeptIds);
      }
    } else {
      reset({
        projectNumber: '',
        projectName: '',
        projectType: 'Work',
        grantIdentifier: '',
        isActive: true,
        targetingMode: 'all',
        selectedDepartmentIds: [],
        selectedEmployeeIds: [],
      });
      setWatchedDepartmentIds([]);
    }
  }, [project, reset]);

  // Group employees by department for display
  const employeesByDepartment = useMemo(() => {
    if (!availableEmployees) return new Map<string, TargetableEmployee[]>();

    const grouped = new Map<string, TargetableEmployee[]>();
    availableEmployees.forEach(emp => {
      const deptName = emp.departmentName || 'Unknown';
      if (!grouped.has(deptName)) {
        grouped.set(deptName, []);
      }
      grouped.get(deptName)!.push(emp);
    });
    return grouped;
  }, [availableEmployees]);

  const handleFormSubmit = (data: ProjectFormData) => {
    const submitData: CreateProjectDto = {
      projectNumber: data.projectNumber,
      projectName: data.projectName,
      departmentId: null, // No longer using legacy single department
      projectType: data.projectType,
      grantIdentifier: data.grantIdentifier || undefined,
      isActive: data.isActive,
      assignedDepartmentIds: data.targetingMode === 'all' ? [] : data.selectedDepartmentIds,
      assignedEmployeeIds: data.targetingMode === 'employees' ? data.selectedEmployeeIds : [],
    };
    onSubmit(submitData);
  };

  const handleDepartmentToggle = (deptId: number, checked: boolean) => {
    const current = selectedDepartmentIds;
    if (checked) {
      setValue('selectedDepartmentIds', [...current, deptId]);
    } else {
      setValue('selectedDepartmentIds', current.filter(id => id !== deptId));
      // Also remove any employees from this department
      if (availableEmployees) {
        const employeesToRemove = availableEmployees
          .filter(emp => emp.departmentId === deptId)
          .map(emp => emp.userId);
        setValue('selectedEmployeeIds', selectedEmployeeIds.filter(id => !employeesToRemove.includes(id)));
      }
    }
  };

  const handleEmployeeToggle = (empId: number, checked: boolean) => {
    const current = selectedEmployeeIds;
    if (checked) {
      setValue('selectedEmployeeIds', [...current, empId]);
    } else {
      setValue('selectedEmployeeIds', current.filter(id => id !== empId));
    }
  };

  const handleTargetingModeChange = (mode: TargetingMode) => {
    setValue('targetingMode', mode);
    if (mode === 'all') {
      setValue('selectedDepartmentIds', []);
      setValue('selectedEmployeeIds', []);
    } else if (mode === 'departments') {
      setValue('selectedEmployeeIds', []);
    }
  };

  const getSelectedDepartmentNames = () => {
    return departments
      .filter(d => selectedDepartmentIds.includes(d.departmentId))
      .map(d => d.departmentName);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface className={styles.dialogSurface}>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogBody>
            <DialogTitle>{project ? 'Edit Project' : 'New Project'}</DialogTitle>
            <DialogContent className={styles.content}>
              <Field
                label="Project Number"
                required
                validationMessage={errors.projectNumber?.message}
                className={styles.field}
              >
                <Controller
                  name="projectNumber"
                  control={control}
                  rules={{ required: 'Project number is required' }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., PRJ-001"
                      disabled={isLoading}
                    />
                  )}
                />
              </Field>

              <Field
                label="Project Name"
                required
                validationMessage={errors.projectName?.message}
                className={styles.field}
              >
                <Controller
                  name="projectName"
                  control={control}
                  rules={{ required: 'Project name is required' }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., Website Redesign"
                      disabled={isLoading}
                    />
                  )}
                />
              </Field>

              <Field label="Project Type" required className={styles.field}>
                <Controller
                  name="projectType"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      {...field}
                      value={field.value}
                      onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      disabled={isLoading}
                    >
                      <Option value="Work">Work</Option>
                      <Option value="PTO">PTO</Option>
                      <Option value="Holiday">Holiday</Option>
                    </Dropdown>
                  )}
                />
              </Field>

              <Field
                label="Grant Identifier"
                hint="Optional - for grant-funded projects"
                className={styles.field}
              >
                <Controller
                  name="grantIdentifier"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="e.g., GRANT-2024-001"
                      disabled={isLoading}
                    />
                  )}
                />
              </Field>

              <Divider />

              {/* Project Targeting Section */}
              <Text className={styles.sectionHeader}>
                <BuildingRegular style={{ marginRight: '8px' }} />
                Project Visibility
              </Text>
              <Text className={styles.hint}>
                Select which employees can see and use this project for time entries.
              </Text>

              <div className={styles.targetingModeSelector}>
                <div className={styles.targetingOption}>
                  <Checkbox
                    checked={targetingMode === 'all'}
                    onChange={() => handleTargetingModeChange('all')}
                    disabled={isLoading}
                  />
                  <div>
                    <Text weight="semibold">All Departments (Company-wide)</Text>
                    <Caption1 style={{ display: 'block' }}>
                      Every employee can use this project
                    </Caption1>
                  </div>
                </div>

                <div className={styles.targetingOption}>
                  <Checkbox
                    checked={targetingMode === 'departments'}
                    onChange={() => handleTargetingModeChange('departments')}
                    disabled={isLoading}
                  />
                  <div>
                    <Text weight="semibold">Specific Departments</Text>
                    <Caption1 style={{ display: 'block' }}>
                      Only employees in selected departments
                    </Caption1>
                  </div>
                </div>

                <div className={styles.targetingOption}>
                  <Checkbox
                    checked={targetingMode === 'employees'}
                    onChange={() => handleTargetingModeChange('employees')}
                    disabled={isLoading}
                  />
                  <div>
                    <Text weight="semibold">Specific Employees</Text>
                    <Caption1 style={{ display: 'block' }}>
                      Select departments first, then choose individual employees
                    </Caption1>
                  </div>
                </div>
              </div>

              {/* Department Selection (for departments or employees mode) */}
              {(targetingMode === 'departments' || targetingMode === 'employees') && (
                <Field label="Select Departments" className={styles.field}>
                  <div className={styles.departmentList}>
                    {departments.map((dept) => (
                      <div key={dept.departmentId} className={styles.departmentItem}>
                        <Checkbox
                          checked={selectedDepartmentIds.includes(dept.departmentId)}
                          onChange={(_, data) => handleDepartmentToggle(dept.departmentId, !!data.checked)}
                          disabled={isLoading}
                        />
                        <Text>{dept.departmentName}</Text>
                      </div>
                    ))}
                  </div>
                  {selectedDepartmentIds.length > 0 && (
                    <div className={styles.selectedTags}>
                      <TagGroup>
                        {getSelectedDepartmentNames().map((name) => (
                          <Tag key={name} appearance="brand" size="small">
                            {name}
                          </Tag>
                        ))}
                      </TagGroup>
                    </div>
                  )}
                </Field>
              )}

              {/* Employee Selection (for employees mode only) */}
              {targetingMode === 'employees' && selectedDepartmentIds.length > 0 && (
                <div className={styles.employeeSection}>
                  <Field label="Select Employees" className={styles.field}>
                    {employeesLoading ? (
                      <Spinner size="small" label="Loading employees..." />
                    ) : availableEmployees && availableEmployees.length > 0 ? (
                      <div className={styles.employeeList}>
                        {Array.from(employeesByDepartment.entries()).map(([deptName, employees]) => (
                          <div key={deptName}>
                            <Text weight="semibold" style={{ marginTop: tokens.spacingVerticalS, marginBottom: tokens.spacingVerticalXS, display: 'block' }}>
                              {deptName}
                            </Text>
                            {employees.map((emp) => (
                              <div key={emp.userId} className={styles.employeeItem}>
                                <Checkbox
                                  checked={selectedEmployeeIds.includes(emp.userId)}
                                  onChange={(_, data) => handleEmployeeToggle(emp.userId, !!data.checked)}
                                  disabled={isLoading}
                                />
                                <PersonRegular />
                                <div className={styles.employeeInfo}>
                                  <Text>{emp.name}</Text>
                                  <Caption1>{emp.email}</Caption1>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <Text className={styles.hint}>No employees found in selected departments.</Text>
                    )}
                    {selectedEmployeeIds.length > 0 && (
                      <div className={styles.selectedTags}>
                        <Badge appearance="filled" color="informative">
                          {selectedEmployeeIds.length} employee{selectedEmployeeIds.length !== 1 ? 's' : ''} selected
                        </Badge>
                      </div>
                    )}
                  </Field>
                </div>
              )}

              <Divider />

              <Field label="Active" className={styles.field}>
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onChange={(_, data) => field.onChange(data.checked)}
                      disabled={isLoading}
                      label={field.value ? 'Active' : 'Inactive'}
                    />
                  )}
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" appearance="primary" disabled={isLoading}>
                {isLoading ? 'Saving...' : project ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
