/**
 * Reports Component
 * Time entries report with filtering, sorting, grouping, and export
 */

import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Title2,
  Card,
  makeStyles,
  tokens,
  shorthands,
  Text,
  Button,
  Dropdown,
  Option,
  Input,
  Badge,
  Spinner,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Tab,
  TabList,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogActions,
  DialogContent,
} from '@fluentui/react-components';
import {
  DocumentTable24Regular,
  ArrowDownload24Regular,
  Print24Regular,
  Filter24Regular,
  ArrowSort24Regular,
  Building20Regular,
  Person20Regular,
  Calendar20Regular,
  Folder20Regular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { apiClient } from '../../services/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalL),
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingVerticalM),
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  headerActions: {
    display: 'flex',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  filtersCard: {
    ...shorthands.padding(tokens.spacingVerticalM),
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    ...shorthands.gap(tokens.spacingHorizontalM),
    alignItems: 'flex-end',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXS),
    minWidth: '150px',
  },
  filterLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
  viewTabs: {
    marginBottom: tokens.spacingVerticalM,
  },
  tableCard: {
    ...shorthands.padding(tokens.spacingVerticalM),
    overflowX: 'auto',
  },
  table: {
    minWidth: '800px',
  },
  sortableHeader: {
    cursor: 'pointer',
    userSelect: 'none',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding(tokens.spacingVerticalS, tokens.spacingHorizontalM),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: tokens.spacingVerticalM,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  emptyState: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalXXL),
    color: tokens.colorNeutralForeground3,
  },
  groupHeader: {
    backgroundColor: tokens.colorNeutralBackground3,
    fontWeight: tokens.fontWeightSemibold,
  },
  // Print preview styles
  printPreview: {
    width: '100%',
    maxHeight: '70vh',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalL),
    backgroundColor: 'white',
  },
  printHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '3px solid #286f1f',
  },
  printLogo: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('12px'),
  },
  printLogoIcon: {
    width: '48px',
    height: '48px',
    backgroundColor: '#286f1f',
    ...shorthands.borderRadius('50%'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '24px',
  },
  printCompanyName: {
    fontFamily: '"Roboto Condensed", sans-serif',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#286f1f',
    margin: 0,
  },
  printReportTitle: {
    textAlign: 'right',
  },
  printReportTitleText: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#404041',
    margin: 0,
  },
  printReportDate: {
    fontSize: '14px',
    color: '#666',
    margin: 0,
  },
  printFilters: {
    backgroundColor: '#f3f3f3',
    ...shorthands.padding('12px'),
    ...shorthands.borderRadius('4px'),
    marginBottom: '16px',
    fontSize: '13px',
    color: '#404041',
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  printTableHeader: {
    backgroundColor: '#286f1f',
    color: 'white',
  },
  printTableHeaderCell: {
    ...shorthands.padding('10px', '8px'),
    textAlign: 'left',
    fontWeight: 'bold',
    borderBottom: '2px solid #1a4a14',
  },
  printTableRow: {
    borderBottom: '1px solid #e0e0e0',
  },
  printTableRowAlt: {
    backgroundColor: '#f9f9f9',
    borderBottom: '1px solid #e0e0e0',
  },
  printTableCell: {
    ...shorthands.padding('8px'),
  },
  printGroupRow: {
    backgroundColor: '#e8f5e3',
    fontWeight: 'bold',
    color: '#286f1f',
  },
  printSummary: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '2px solid #286f1f',
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
  },
  printFooter: {
    marginTop: '24px',
    paddingTop: '12px',
    borderTop: '1px solid #ddd',
    textAlign: 'center',
    fontSize: '11px',
    color: '#888',
  },
  dialogSurface: {
    maxWidth: '900px',
    width: '95vw',
  },
});

interface TimeEntry {
  timeEntryId: number;
  employeeName: string;
  employeeEmail: string;
  departmentName: string;
  projectNumber: string;
  projectName: string;
  projectType: string;
  workDate: string;
  hoursWorked: number;
  workLocation: string;
  notes: string | null;
  timesheetStatus: string;
}

interface FilterOptions {
  departments: { departmentId: number; departmentName: string }[];
  projects: { projectId: number; projectNumber: string; projectName: string; projectType: string }[];
  users: { userId: number; name: string; email: string }[];
}

type ViewMode = 'flat' | 'byDept' | 'byEmployee' | 'byDate' | 'byProject';
type SortField = 'workDate' | 'employeeName' | 'departmentName' | 'projectName' | 'hoursWorked';
type SortDir = 'asc' | 'desc';

export const Reports = () => {
  const styles = useStyles();
  const { isAdmin } = useCurrentUser();

  // Filter state
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [departmentId, setDepartmentId] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  // View and sort state
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [sortField, setSortField] = useState<SortField>('workDate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Print dialog state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch filter options
  const { data: filterOptions } = useQuery<FilterOptions>({
    queryKey: ['reports', 'filter-options'],
    queryFn: async () => {
      const res = await apiClient.get('/reports/filter-options');
      return res.data.data;
    },
  });

  // Fetch time entries
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', 'time-entries', startDate, endDate, departmentId, userId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('startDate', startDate);
      params.set('endDate', endDate);
      if (departmentId) params.set('departmentId', departmentId);
      if (userId) params.set('userId', userId);
      if (projectId) params.set('projectId', projectId);
      const res = await apiClient.get(`/reports/time-entries?${params}`);
      return res.data;
    },
  });

  const entries: TimeEntry[] = reportData?.data || [];
  const meta = reportData?.meta;

  // Sort entries
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDir === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [entries, sortField, sortDir]);

  // Group entries by view mode
  const groupedEntries = useMemo(() => {
    if (viewMode === 'flat') return { '': sortedEntries };

    const groupKey: Record<ViewMode, keyof TimeEntry> = {
      flat: 'timeEntryId',
      byDept: 'departmentName',
      byEmployee: 'employeeName',
      byDate: 'workDate',
      byProject: 'projectName',
    };

    const key = groupKey[viewMode];
    const groups: Record<string, TimeEntry[]> = {};

    sortedEntries.forEach((entry) => {
      const groupValue = String(entry[key]);
      if (!groups[groupValue]) groups[groupValue] = [];
      groups[groupValue].push(entry);
    });

    return groups;
  }, [sortedEntries, viewMode]);

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Handle print - open print preview dialog
  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  // Execute actual print
  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Time Entry Report - MiraVista</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Roboto Condensed', Arial, sans-serif; padding: 20px; color: #404041; }
            .print-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 3px solid #286f1f; }
            .print-logo { display: flex; align-items: center; gap: 12px; }
            .print-logo-icon { width: 48px; height: 48px; background-color: #286f1f; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 24px; }
            .print-company-name { font-size: 24px; font-weight: bold; color: #286f1f; }
            .print-report-title { text-align: right; }
            .print-report-title h2 { font-size: 18px; font-weight: bold; color: #404041; }
            .print-report-date { font-size: 14px; color: #666; }
            .print-filters { background-color: #f3f3f3; padding: 12px; border-radius: 4px; margin-bottom: 16px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            thead { background-color: #286f1f; color: white; }
            th { padding: 10px 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #1a4a14; }
            td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .group-row { background-color: #e8f5e3 !important; font-weight: bold; color: #286f1f; }
            .summary { margin-top: 20px; padding-top: 16px; border-top: 2px solid #286f1f; display: flex; justify-content: space-between; font-size: 14px; }
            .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #ddd; text-align: center; font-size: 11px; color: #888; }
            .text-right { text-align: right; }
            .status-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
            .status-approved { background-color: #d4edda; color: #155724; }
            .status-submitted { background-color: #cce5ff; color: #004085; }
            .status-returned { background-color: #fff3cd; color: #856404; }
            .status-draft { background-color: #e2e3e5; color: #383d41; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Get active filter descriptions
  const getFilterDescription = () => {
    const filters: string[] = [];
    filters.push(`Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`);
    if (departmentId) {
      const dept = filterOptions?.departments.find(d => d.departmentId.toString() === departmentId);
      if (dept) filters.push(`Department: ${dept.departmentName}`);
    }
    if (userId) {
      const user = filterOptions?.users.find(u => u.userId.toString() === userId);
      if (user) filters.push(`Employee: ${user.name}`);
    }
    if (projectId) {
      const project = filterOptions?.projects.find(p => p.projectId.toString() === projectId);
      if (project) filters.push(`Project: ${project.projectName}`);
    }
    return filters.join(' | ');
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await apiClient.post('/reports/export', {
        startDate,
        endDate,
      }, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `time-entries-${startDate}-to-${endDate}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Render sort indicator
  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <DocumentTable24Regular />
          <Title2>Time Entry Reports</Title2>
        </div>
        <div className={styles.headerActions}>
          <Button
            appearance="secondary"
            icon={<Print24Regular />}
            onClick={handlePrint}
          >
            Print
          </Button>
          {isAdmin && (
            <Button
              appearance="primary"
              icon={<ArrowDownload24Regular />}
              onClick={handleExport}
            >
              Export to Excel
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className={styles.filtersCard}>
        <div className={styles.filtersRow}>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Start Date</span>
            <Input
              type="date"
              value={startDate}
              onChange={(_, data) => setStartDate(data.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>End Date</span>
            <Input
              type="date"
              value={endDate}
              onChange={(_, data) => setEndDate(data.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Department</span>
            <Dropdown
              placeholder="All Departments"
              value={filterOptions?.departments.find(d => d.departmentId.toString() === departmentId)?.departmentName || ''}
              selectedOptions={departmentId ? [departmentId] : []}
              onOptionSelect={(_, data) => setDepartmentId(data.optionValue || '')}
            >
              <Option value="">All Departments</Option>
              {filterOptions?.departments.map(d => (
                <Option key={d.departmentId} value={d.departmentId.toString()}>
                  {d.departmentName}
                </Option>
              ))}
            </Dropdown>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Employee</span>
            <Dropdown
              placeholder="All Employees"
              value={filterOptions?.users.find(u => u.userId.toString() === userId)?.name || ''}
              selectedOptions={userId ? [userId] : []}
              onOptionSelect={(_, data) => setUserId(data.optionValue || '')}
            >
              <Option value="">All Employees</Option>
              {filterOptions?.users.map(u => (
                <Option key={u.userId} value={u.userId.toString()}>
                  {u.name}
                </Option>
              ))}
            </Dropdown>
          </div>
          <div className={styles.filterGroup}>
            <span className={styles.filterLabel}>Project</span>
            <Dropdown
              placeholder="All Projects"
              value={filterOptions?.projects.find(p => p.projectId.toString() === projectId)?.projectName || ''}
              selectedOptions={projectId ? [projectId] : []}
              onOptionSelect={(_, data) => setProjectId(data.optionValue || '')}
            >
              <Option value="">All Projects</Option>
              {filterOptions?.projects.map(p => (
                <Option key={p.projectId} value={p.projectId.toString()} text={`${p.projectNumber} - ${p.projectName}`}>
                  {p.projectNumber} - {p.projectName}
                </Option>
              ))}
            </Dropdown>
          </div>
        </div>
      </Card>

      {/* View Mode Tabs */}
      <TabList
        selectedValue={viewMode}
        onTabSelect={(_, data) => setViewMode(data.value as ViewMode)}
        className={styles.viewTabs}
      >
        <Tab value="flat" icon={<ArrowSort24Regular />}>All Entries</Tab>
        <Tab value="byDept" icon={<Building20Regular />}>By Department</Tab>
        <Tab value="byEmployee" icon={<Person20Regular />}>By Employee</Tab>
        <Tab value="byDate" icon={<Calendar20Regular />}>By Date</Tab>
        <Tab value="byProject" icon={<Folder20Regular />}>By Project</Tab>
      </TabList>

      {/* Data Table */}
      <Card className={styles.tableCard}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <Spinner size="large" label="Loading report data..." />
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.emptyState}>
            <Filter24Regular style={{ fontSize: '48px', marginBottom: tokens.spacingVerticalM }} />
            <Text size={400}>No time entries found for the selected filters</Text>
          </div>
        ) : (
          <>
            <Table className={styles.table}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell
                    className={styles.sortableHeader}
                    onClick={() => handleSort('workDate')}
                  >
                    Date{renderSortIndicator('workDate')}
                  </TableHeaderCell>
                  <TableHeaderCell
                    className={styles.sortableHeader}
                    onClick={() => handleSort('employeeName')}
                  >
                    Employee{renderSortIndicator('employeeName')}
                  </TableHeaderCell>
                  <TableHeaderCell
                    className={styles.sortableHeader}
                    onClick={() => handleSort('departmentName')}
                  >
                    Department{renderSortIndicator('departmentName')}
                  </TableHeaderCell>
                  <TableHeaderCell
                    className={styles.sortableHeader}
                    onClick={() => handleSort('projectName')}
                  >
                    Project{renderSortIndicator('projectName')}
                  </TableHeaderCell>
                  <TableHeaderCell
                    className={styles.sortableHeader}
                    onClick={() => handleSort('hoursWorked')}
                    style={{ textAlign: 'right' }}
                  >
                    Hours{renderSortIndicator('hoursWorked')}
                  </TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedEntries).map(([group, groupEntries]) => (
                  <React.Fragment key={`group-${group || 'all'}`}>
                    {viewMode !== 'flat' && group && (
                      <TableRow className={styles.groupHeader}>
                        <TableCell colSpan={7}>
                          <TableCellLayout>
                            {group} ({groupEntries.length} entries, {groupEntries.reduce((s, e) => s + e.hoursWorked, 0).toFixed(1)} hours)
                          </TableCellLayout>
                        </TableCell>
                      </TableRow>
                    )}
                    {groupEntries.map((entry) => (
                      <TableRow key={entry.timeEntryId}>
                        <TableCell>
                          <TableCellLayout>
                            {new Date(entry.workDate).toLocaleDateString()}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>{entry.employeeName}</TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>{entry.departmentName}</TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>
                            <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                              {entry.projectNumber}
                            </Text>
                            {' '}{entry.projectName}
                          </TableCellLayout>
                        </TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <TableCellLayout>{entry.hoursWorked.toFixed(1)}</TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>{entry.workLocation}</TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <Badge
                            appearance="filled"
                            color={
                              entry.timesheetStatus === 'Approved' ? 'success' :
                              entry.timesheetStatus === 'Submitted' ? 'informative' :
                              entry.timesheetStatus === 'Returned' ? 'warning' : 'subtle'
                            }
                            size="small"
                          >
                            {entry.timesheetStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>

            {/* Summary */}
            <div className={styles.summaryRow}>
              <Text>
                <strong>{meta?.totalRecords.toLocaleString()}</strong> entries from{' '}
                {new Date(meta?.startDate).toLocaleDateString()} to {new Date(meta?.endDate).toLocaleDateString()}
              </Text>
              <Text>
                <strong>Total Hours: {meta?.totalHours.toFixed(1)}</strong>
              </Text>
            </div>
          </>
        )}
      </Card>

      {/* Print Preview Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={(_, data) => setShowPrintDialog(data.open)}>
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <DialogTitle
              action={
                <Button
                  appearance="subtle"
                  icon={<Dismiss24Regular />}
                  onClick={() => setShowPrintDialog(false)}
                />
              }
            >
              Print Preview - Time Entry Report
            </DialogTitle>
            <DialogContent>
              <div className={styles.printPreview} ref={printRef}>
                {/* Report Header */}
                <div className="print-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', paddingBottom: '16px', borderBottom: '3px solid #286f1f' }}>
                  <div className="print-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="print-logo-icon" style={{ width: '48px', height: '48px', backgroundColor: '#286f1f', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '24px' }}>Y</div>
                    <span className="print-company-name" style={{ fontFamily: '"Roboto Condensed", sans-serif', fontSize: '24px', fontWeight: 'bold', color: '#286f1f' }}>MiraVista Diagnostics</span>
                  </div>
                  <div className="print-report-title" style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#404041', margin: 0 }}>Time Entry Report</h2>
                    <p className="print-report-date" style={{ fontSize: '14px', color: '#666', margin: 0 }}>Generated: {new Date().toLocaleString()}</p>
                  </div>
                </div>

                {/* Filter Summary */}
                <div className="print-filters" style={{ backgroundColor: '#f3f3f3', padding: '12px', borderRadius: '4px', marginBottom: '16px', fontSize: '13px' }}>
                  <strong>Report Filters:</strong> {getFilterDescription()}
                </div>

                {/* Data Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#286f1f', color: 'white' }}>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Date</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Employee</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Department</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Project</th>
                      <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 'bold' }}>Hours</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Location</th>
                      <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 'bold' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedEntries).map(([group, groupEntries]) => (
                      <React.Fragment key={`print-group-${group || 'all'}`}>
                        {viewMode !== 'flat' && group && (
                          <tr style={{ backgroundColor: '#e8f5e3', fontWeight: 'bold', color: '#286f1f' }}>
                            <td colSpan={7} style={{ padding: '8px' }}>
                              {group} ({groupEntries.length} entries, {groupEntries.reduce((s, e) => s + e.hoursWorked, 0).toFixed(1)} hours)
                            </td>
                          </tr>
                        )}
                        {groupEntries.map((entry, idx) => (
                          <tr key={`print-${entry.timeEntryId}`} style={{ backgroundColor: idx % 2 === 1 ? '#f9f9f9' : 'white', borderBottom: '1px solid #e0e0e0' }}>
                            <td style={{ padding: '8px' }}>{new Date(entry.workDate).toLocaleDateString()}</td>
                            <td style={{ padding: '8px' }}>{entry.employeeName}</td>
                            <td style={{ padding: '8px' }}>{entry.departmentName}</td>
                            <td style={{ padding: '8px' }}>{entry.projectNumber} - {entry.projectName}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{entry.hoursWorked.toFixed(1)}</td>
                            <td style={{ padding: '8px' }}>{entry.workLocation}</td>
                            <td style={{ padding: '8px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: entry.timesheetStatus === 'Approved' ? '#d4edda' : entry.timesheetStatus === 'Submitted' ? '#cce5ff' : entry.timesheetStatus === 'Returned' ? '#fff3cd' : '#e2e3e5',
                                color: entry.timesheetStatus === 'Approved' ? '#155724' : entry.timesheetStatus === 'Submitted' ? '#004085' : entry.timesheetStatus === 'Returned' ? '#856404' : '#383d41',
                              }}>
                                {entry.timesheetStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>

                {/* Summary */}
                <div className="summary" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #286f1f', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span><strong>{meta?.totalRecords.toLocaleString()}</strong> time entries</span>
                  <span><strong>Total Hours: {meta?.totalHours.toFixed(1)}</strong></span>
                </div>

                {/* Footer */}
                <div className="footer" style={{ marginTop: '24px', paddingTop: '12px', borderTop: '1px solid #ddd', textAlign: 'center', fontSize: '11px', color: '#888' }}>
                  MiraVista Diagnostics - Timesheet Tracking System | Confidential
                </div>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowPrintDialog(false)}>
                Cancel
              </Button>
              <Button appearance="primary" icon={<Print24Regular />} onClick={executePrint}>
                Print Report
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};
