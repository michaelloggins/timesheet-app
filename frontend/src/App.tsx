import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import { AppShell } from '@components/Layout/AppShell';
import { LoginPage } from '@components/Auth/LoginPage';
import { Dashboard } from '@components/Dashboard/Dashboard';
import { TimesheetEntry } from '@components/Timesheet/TimesheetEntry';
import { TimesheetList } from '@components/Timesheet/TimesheetList';
import { ApprovalsList } from '@components/Approvals/ApprovalsList';
import { Scoreboard } from '@components/Scoreboard/Scoreboard';
import { Reports } from '@components/Reports/Reports';
import { AdminPanel } from '@components/Admin/AdminPanel';
import { DelegationSettings } from '@components/Settings/DelegationSettings';

function App() {
  const isAuthenticated = useIsAuthenticated();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/timesheets" element={<TimesheetList />} />
        <Route path="/timesheets/entry" element={<TimesheetEntry />} />
        <Route path="/timesheets/:id" element={<TimesheetEntry />} />
        <Route path="/approvals" element={<ApprovalsList />} />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/settings/delegations" element={<DelegationSettings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default App;
