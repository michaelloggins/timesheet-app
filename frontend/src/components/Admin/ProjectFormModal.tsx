/**
 * Project Form Modal
 * Create/Edit project dialog
 */

import { useEffect } from 'react';
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
} from '@fluentui/react-components';
import { Project } from '../../types';
import { CreateProjectDto } from '../../services/projectService';

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
});

interface ProjectFormData {
  projectNumber: string;
  projectName: string;
  departmentId: number | null; // null = All Departments (universal)
  projectType: 'Work' | 'PTO' | 'Holiday';
  grantIdentifier: string;
  isActive: boolean;
}

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectDto) => void;
  project?: Project | null;
  departments: Array<{ departmentId: number; departmentName: string }>;
  isLoading?: boolean;
}

export const ProjectFormModal = ({
  open,
  onClose,
  onSubmit,
  project,
  departments,
  isLoading = false,
}: ProjectFormModalProps) => {
  const styles = useStyles();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    defaultValues: {
      projectNumber: '',
      projectName: '',
      departmentId: null, // Default to All Departments
      projectType: 'Work',
      grantIdentifier: '',
      isActive: true,
    },
  });

  // Reset form when project changes
  useEffect(() => {
    if (project) {
      reset({
        projectNumber: project.projectNumber,
        projectName: project.projectName,
        departmentId: project.departmentId, // Can be null for universal projects
        projectType: project.projectType,
        grantIdentifier: project.grantIdentifier || '',
        isActive: project.isActive,
      });
    } else {
      reset({
        projectNumber: '',
        projectName: '',
        departmentId: null, // Default to All Departments
        projectType: 'Work',
        grantIdentifier: '',
        isActive: true,
      });
    }
  }, [project, reset, departments]);

  const handleFormSubmit = (data: ProjectFormData) => {
    const submitData: CreateProjectDto = {
      projectNumber: data.projectNumber,
      projectName: data.projectName,
      departmentId: data.departmentId, // null = All Departments
      projectType: data.projectType,
      grantIdentifier: data.grantIdentifier || undefined,
      isActive: data.isActive,
    };
    onSubmit(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
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

              <Field label="Department" className={styles.field}>
                <Controller
                  name="departmentId"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      {...field}
                      value={field.value === null ? 'All Departments' : departments.find(d => d.departmentId === field.value)?.departmentName}
                      onOptionSelect={(_, data) => {
                        const value = data.optionValue;
                        field.onChange(value === 'all' ? null : Number(value));
                      }}
                      disabled={isLoading}
                    >
                      <Option key="all" value="all">
                        All Departments (Universal)
                      </Option>
                      {departments.map((dept) => (
                        <Option key={dept.departmentId} value={String(dept.departmentId)}>
                          {dept.departmentName}
                        </Option>
                      ))}
                    </Dropdown>
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
