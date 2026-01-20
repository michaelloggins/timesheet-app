/**
 * React Query hooks for project management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService, CreateProjectDto, UpdateProjectDto } from '../services/projectService';
import { Project, TargetableEmployee } from '../types';

export const PROJECTS_QUERY_KEY = 'projects';

/**
 * Get all projects
 */
export const useProjects = () => {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY],
    queryFn: projectService.getAllProjects,
  });
};

/**
 * Get active projects only
 */
export const useActiveProjects = () => {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, 'active'],
    queryFn: projectService.getActiveProjects,
  });
};

/**
 * Get projects accessible to the current user
 * Based on department assignment or direct employee targeting
 */
export const useProjectsForUser = () => {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, 'forUser'],
    queryFn: projectService.getProjectsForUser,
  });
};

/**
 * Get project by ID
 */
export const useProject = (id: number) => {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, id],
    queryFn: () => projectService.getProjectById(id),
    enabled: !!id,
  });
};

/**
 * Get project by ID with full assignments (departments and employees)
 */
export const useProjectWithAssignments = (id: number | null) => {
  return useQuery({
    queryKey: [PROJECTS_QUERY_KEY, id, 'assignments'],
    queryFn: () => projectService.getProjectWithAssignments(id!),
    enabled: !!id,
  });
};

/**
 * Get employees from specified departments (for employee targeting UI)
 */
export const useEmployeesByDepartments = (departmentIds: number[]) => {
  return useQuery<TargetableEmployee[]>({
    queryKey: [PROJECTS_QUERY_KEY, 'employeesByDepartments', departmentIds],
    queryFn: () => projectService.getEmployeesByDepartments(departmentIds),
    enabled: departmentIds.length > 0,
  });
};

/**
 * Create new project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => projectService.createProject(data),
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
};

/**
 * Update project
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProjectDto }) =>
      projectService.updateProject(id, data),
    onSuccess: (updatedProject) => {
      // Update the specific project in cache
      queryClient.setQueryData<Project>(
        [PROJECTS_QUERY_KEY, updatedProject.projectId],
        updatedProject
      );
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
};

/**
 * Deactivate project (soft delete)
 */
export const useDeactivateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      projectService.deactivateProject(id, reason),
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
};

/**
 * Toggle project active status
 */
export const useToggleProjectStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      projectService.toggleProjectStatus(id, isActive),
    onSuccess: () => {
      // Invalidate and refetch projects
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
};
