/**
 * Legacy Import Admin Component
 * Admin interface for managing SharePoint legacy data import
 */

import { useState, useRef } from 'react';
import {
  Title3,
  Button,
  Card,
  CardHeader,
  CardPreview,
  Badge,
  makeStyles,
  tokens,
  shorthands,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Switch,
  Input,
  Field,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Text,
  Body1Strong,
  Caption1,
  Divider,
} from '@fluentui/react-components';
import {
  DatabaseRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  WarningRegular,
  ClockRegular,
  SettingsRegular,
  InfoRegular,
  ArrowDownloadRegular,
  DocumentRegular,
  ArrowUploadRegular,
} from '@fluentui/react-icons';
import {
  useLegacyImportStatus,
  useLegacyImportHistory,
  useRunManualImport,
  useUpdateLegacyImportConfig,
  useImportPreview,
  useBatchLog,
  useImportCsv,
} from '../../hooks/useLegacyImport';

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
    flexWrap: 'wrap',
    gap: tokens.spacingVerticalM,
  },
  statusCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: tokens.spacingHorizontalL,
  },
  statusCard: {
    ...shorthands.padding(tokens.spacingVerticalL),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow4,
  },
  statusValue: {
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
  },
  statusLabel: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
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
  configSection: {
    ...shorthands.padding(tokens.spacingVerticalL),
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  configRow: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalL,
    marginBottom: tokens.spacingVerticalM,
  },
  badge: {
    minWidth: '70px',
  },
  resultCard: {
    ...shorthands.padding(tokens.spacingVerticalL),
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    boxShadow: tokens.shadow4,
  },
  resultGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: tokens.spacingHorizontalM,
    marginTop: tokens.spacingVerticalM,
  },
  resultItem: {
    textAlign: 'center',
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  errorList: {
    maxHeight: '200px',
    overflowY: 'auto',
    ...shorthands.padding(tokens.spacingVerticalS),
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    marginTop: tokens.spacingVerticalS,
  },
  previewSection: {
    marginTop: tokens.spacingVerticalL,
  },
});

export const LegacyImportAdmin = () => {
  const styles = useStyles();

  // State
  const [showConfig, setShowConfig] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBatchLog, setShowBatchLog] = useState<number | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const [configSiteId, setConfigSiteId] = useState('');
  const [configListId, setConfigListId] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data queries
  const { data: status, isLoading: statusLoading, error: statusError, refetch: refetchStatus } = useLegacyImportStatus();
  const { data: history, isLoading: historyLoading } = useLegacyImportHistory(10);

  // Mutations
  const runImport = useRunManualImport();
  const updateConfig = useUpdateLegacyImportConfig();
  const importCsv = useImportCsv();

  // Preview query (only when dialog is open)
  const { data: previewData, isLoading: previewLoading } = useImportPreview(showPreview);

  // Batch log query (only when viewing a specific batch)
  const { data: batchLogData, isLoading: batchLogLoading } = useBatchLog(showBatchLog);

  const handleRunImport = async () => {
    await runImport.mutateAsync();
    refetchStatus();
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateConfig.mutateAsync({ enabled });
    refetchStatus();
  };

  const handleToggleAutoSync = async (autoSyncOnLogin: boolean) => {
    await updateConfig.mutateAsync({ autoSyncOnLogin });
    refetchStatus();
  };

  const handleSaveConfig = async () => {
    await updateConfig.mutateAsync({
      siteId: configSiteId,
      listId: configListId,
    });
    setShowConfig(false);
    refetchStatus();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
      setCsvFileName(file.name);
      setShowCsvUpload(true);
    };
    reader.readAsText(file);

    // Reset file input so same file can be selected again
    event.target.value = '';
  };

  const handleCsvImport = async () => {
    if (!csvContent) return;

    await importCsv.mutateAsync(csvContent);
    refetchStatus();
  };

  const handleCloseCsvDialog = () => {
    setShowCsvUpload(false);
    setCsvContent(null);
    setCsvFileName('');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'informative' => {
    switch (status) {
      case 'Completed': return 'success';
      case 'Running': return 'informative';
      case 'Failed': return 'danger';
      default: return 'warning';
    }
  };

  if (statusLoading) {
    return <Spinner label="Loading legacy import status..." />;
  }

  if (statusError) {
    return (
      <MessageBar intent="error">
        <MessageBarBody>
          <MessageBarTitle>Error Loading Status</MessageBarTitle>
          {statusError instanceof Error ? statusError.message : 'Failed to load import status'}
        </MessageBarBody>
      </MessageBar>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <Title3>Legacy SharePoint Import</Title3>
          <Caption1 style={{ display: 'block', marginTop: tokens.spacingVerticalXS }}>
            Import historical timesheet data from SharePoint Lists
          </Caption1>
        </div>
        <div style={{ display: 'flex', gap: tokens.spacingHorizontalS }}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <Button
            appearance="subtle"
            icon={<SettingsRegular />}
            onClick={() => setShowConfig(true)}
          >
            Configure
          </Button>
          <Button
            appearance="subtle"
            icon={<InfoRegular />}
            onClick={() => setShowPreview(true)}
            disabled={!status?.enabled}
          >
            Preview Data
          </Button>
          <Button
            appearance="secondary"
            icon={<ArrowUploadRegular />}
            onClick={() => fileInputRef.current?.click()}
          >
            Import CSV
          </Button>
          <Button
            appearance="primary"
            icon={<ArrowDownloadRegular />}
            onClick={handleRunImport}
            disabled={!status?.enabled || runImport.isPending}
          >
            {runImport.isPending ? 'Importing...' : 'Run Import Now'}
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className={styles.statusCards}>
        <div className={styles.statusCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            {status?.enabled ? (
              <CheckmarkCircleRegular style={{ color: tokens.colorPaletteGreenForeground1, fontSize: '24px' }} />
            ) : (
              <DismissCircleRegular style={{ color: tokens.colorPaletteRedForeground1, fontSize: '24px' }} />
            )}
            <div>
              <div className={styles.statusValue} style={{ fontSize: tokens.fontSizeBase500 }}>
                {status?.enabled ? 'Enabled' : 'Disabled'}
              </div>
              <div className={styles.statusLabel}>Import Status</div>
            </div>
          </div>
        </div>

        <div className={styles.statusCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <DatabaseRegular style={{ color: tokens.colorPaletteBlueForeground2, fontSize: '24px' }} />
            <div>
              <div className={styles.statusValue}>{status?.importedItems ?? 0}</div>
              <div className={styles.statusLabel}>Items Imported</div>
            </div>
          </div>
        </div>

        <div className={styles.statusCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <ClockRegular style={{ color: tokens.colorNeutralForeground3, fontSize: '24px' }} />
            <div>
              <div className={styles.statusValue} style={{ fontSize: tokens.fontSizeBase400 }}>
                {status?.pendingItems ?? 0}
              </div>
              <div className={styles.statusLabel}>Pending Items</div>
            </div>
          </div>
        </div>

        <div className={styles.statusCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacingHorizontalS }}>
            <WarningRegular style={{ color: tokens.colorPaletteRedForeground1, fontSize: '24px' }} />
            <div>
              <div className={styles.statusValue} style={{ fontSize: tokens.fontSizeBase400 }}>
                {status?.failedItems ?? 0}
              </div>
              <div className={styles.statusLabel}>Failed Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Last Sync Info */}
      <Card>
        <CardHeader
          header={<Body1Strong>Last Sync Information</Body1Strong>}
          description={
            <Caption1>
              Last synced: {formatDate(status?.lastSyncDate ?? null)}
              {status?.autoSyncOnLogin && ' (Auto-sync enabled)'}
            </Caption1>
          }
        />
        {status?.lastBatch && (
          <CardPreview style={{ padding: tokens.spacingVerticalM }}>
            <div style={{ display: 'flex', gap: tokens.spacingHorizontalL, flexWrap: 'wrap' }}>
              <div>
                <Caption1>Batch ID</Caption1>
                <Body1Strong style={{ display: 'block' }}>{status.lastBatch.batchId}</Body1Strong>
              </div>
              <div>
                <Caption1>Status</Caption1>
                <div>
                  <Badge
                    appearance="filled"
                    color={getStatusColor(status.lastBatch.status)}
                  >
                    {status.lastBatch.status}
                  </Badge>
                </div>
              </div>
              <div>
                <Caption1>Total Items</Caption1>
                <Body1Strong style={{ display: 'block' }}>{status.lastBatch.totalItems}</Body1Strong>
              </div>
              <div>
                <Caption1>Imported</Caption1>
                <Body1Strong style={{ display: 'block', color: tokens.colorPaletteGreenForeground1 }}>
                  {status.lastBatch.importedItems}
                </Body1Strong>
              </div>
            </div>
          </CardPreview>
        )}
      </Card>

      {/* Import Result (if just ran) */}
      {runImport.isSuccess && runImport.data && (
        <div className={styles.resultCard}>
          <Body1Strong>Import Results</Body1Strong>
          <div className={styles.resultGrid}>
            <div className={styles.resultItem}>
              <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteGreenForeground1 }}>
                {runImport.data.importedItems}
              </div>
              <Caption1>Imported</Caption1>
            </div>
            <div className={styles.resultItem}>
              <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold' }}>
                {runImport.data.skippedItems}
              </div>
              <Caption1>Skipped</Caption1>
            </div>
            <div className={styles.resultItem}>
              <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteYellowForeground1 }}>
                {runImport.data.duplicateItems}
              </div>
              <Caption1>Duplicates</Caption1>
            </div>
            <div className={styles.resultItem}>
              <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>
                {runImport.data.failedItems}
              </div>
              <Caption1>Failed</Caption1>
            </div>
            <div className={styles.resultItem}>
              <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>
                {runImport.data.userNotFoundItems}
              </div>
              <Caption1>User Not Found</Caption1>
            </div>
          </div>
          {runImport.data.errors.length > 0 && (
            <div className={styles.errorList}>
              <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
                Errors ({runImport.data.errors.length}):
              </Caption1>
              {runImport.data.errors.slice(0, 10).map((error, idx) => (
                <Text key={idx} size={200} style={{ display: 'block', color: tokens.colorPaletteRedForeground1 }}>
                  {error}
                </Text>
              ))}
              {runImport.data.errors.length > 10 && (
                <Caption1>...and {runImport.data.errors.length - 10} more errors</Caption1>
              )}
            </div>
          )}
        </div>
      )}

      {/* Import History */}
      <div>
        <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
          Import History
        </Body1Strong>
        {historyLoading ? (
          <Spinner size="small" label="Loading history..." />
        ) : (
          <div className={styles.tableContainer}>
            <div className={styles.tableWrapper}>
              <Table className={styles.table}>
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell style={{ width: '80px' }}>Batch ID</TableHeaderCell>
                    <TableHeaderCell style={{ width: '80px' }}>Type</TableHeaderCell>
                    <TableHeaderCell style={{ width: '150px' }}>Started</TableHeaderCell>
                    <TableHeaderCell style={{ width: '100px' }}>Status</TableHeaderCell>
                    <TableHeaderCell style={{ width: '80px' }}>Total</TableHeaderCell>
                    <TableHeaderCell style={{ width: '80px' }}>Imported</TableHeaderCell>
                    <TableHeaderCell style={{ width: '80px' }}>Failed</TableHeaderCell>
                    <TableHeaderCell style={{ width: '80px' }}>Actions</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history && history.length > 0 ? (
                    history.map((batch) => (
                      <TableRow key={batch.batchId}>
                        <TableCell>{batch.batchId}</TableCell>
                        <TableCell>
                          <Badge
                            appearance="outline"
                            color={batch.triggerType === 'Auto' ? 'informative' : 'important'}
                          >
                            {batch.triggerType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(batch.startDate).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            appearance="filled"
                            color={getStatusColor(batch.status)}
                            className={styles.badge}
                          >
                            {batch.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{batch.totalItems}</TableCell>
                        <TableCell style={{ color: tokens.colorPaletteGreenForeground1 }}>
                          {batch.importedItems}
                        </TableCell>
                        <TableCell style={{ color: batch.failedItems > 0 ? tokens.colorPaletteRedForeground1 : undefined }}>
                          {batch.failedItems}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={<DocumentRegular />}
                            onClick={() => setShowBatchLog(batch.batchId)}
                          >
                            View Log
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>
                        No import history found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={showConfig} onOpenChange={(_, data) => setShowConfig(data.open)}>
        <DialogSurface>
          <DialogTitle>Legacy Import Configuration</DialogTitle>
          <DialogBody>
            <DialogContent>
              <div className={styles.configSection}>
                <div className={styles.configRow}>
                  <Switch
                    checked={status?.enabled ?? false}
                    onChange={(_, data) => handleToggleEnabled(data.checked)}
                    label="Enable Legacy Import"
                    disabled={updateConfig.isPending}
                  />
                </div>

                <div className={styles.configRow}>
                  <Switch
                    checked={status?.autoSyncOnLogin ?? false}
                    onChange={(_, data) => handleToggleAutoSync(data.checked)}
                    label="Auto-sync on User Login"
                    disabled={updateConfig.isPending || !status?.enabled}
                  />
                </div>

                <Divider style={{ margin: `${tokens.spacingVerticalM} 0` }} />

                <Body1Strong style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                  SharePoint Connection
                </Body1Strong>

                <Field
                  label="SharePoint Site ID (Full Compound ID)"
                  style={{ marginBottom: tokens.spacingVerticalM }}
                  hint="Format: hostname,site-id,web-id (from Graph Explorer)"
                >
                  <Input
                    placeholder="miravistadiagnostics.sharepoint.com,xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy"
                    value={configSiteId}
                    onChange={(_, data) => setConfigSiteId(data.value)}
                  />
                </Field>

                <Field label="SharePoint List ID">
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={configListId}
                    onChange={(_, data) => setConfigListId(data.value)}
                  />
                </Field>

                <Caption1 style={{ display: 'block', marginTop: tokens.spacingVerticalM, color: tokens.colorNeutralForeground3 }}>
                  <strong>To get the Site ID:</strong> In Graph Explorer, run:<br />
                  <code style={{ fontSize: '11px' }}>GET /sites/miravistadiagnostics.sharepoint.com:/sites/YourSite</code><br />
                  Copy the full "id" value (e.g., miravistadiagnostics.sharepoint.com,guid1,guid2)
                </Caption1>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={handleSaveConfig}
                disabled={updateConfig.isPending || (!configSiteId && !configListId)}
              >
                Save Configuration
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={(_, data) => setShowPreview(data.open)}>
        <DialogSurface style={{ maxWidth: '800px', width: '90vw' }}>
          <DialogTitle>SharePoint Data Preview</DialogTitle>
          <DialogBody>
            <DialogContent>
              {previewLoading ? (
                <Spinner label="Loading preview data from SharePoint..." />
              ) : previewData ? (
                <>
                  <MessageBar intent="info" style={{ marginBottom: tokens.spacingVerticalM }}>
                    <MessageBarBody>
                      Found {previewData.totalItems} items in the SharePoint list.
                      Showing first 10 items as preview.
                    </MessageBarBody>
                  </MessageBar>

                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {previewData.previewItems.map((item, idx) => (
                      <Card key={item.id} style={{ marginBottom: tokens.spacingVerticalS }}>
                        <CardHeader
                          header={<Body1Strong>Item {idx + 1}: {item.id}</Body1Strong>}
                          description={
                            <Caption1>
                              Created: {item.createdDateTime ? new Date(item.createdDateTime).toLocaleString() : 'N/A'}
                            </Caption1>
                          }
                        />
                        <CardPreview style={{ padding: tokens.spacingVerticalS }}>
                          <pre style={{ fontSize: '11px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {JSON.stringify(item.fields, null, 2)}
                          </pre>
                        </CardPreview>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    Unable to load preview data. Make sure SharePoint is properly configured.
                  </MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Batch Log Dialog */}
      <Dialog open={showBatchLog !== null} onOpenChange={(_, data) => !data.open && setShowBatchLog(null)}>
        <DialogSurface style={{ maxWidth: '800px', width: '90vw' }}>
          <DialogTitle>Import Batch Log - #{showBatchLog}</DialogTitle>
          <DialogBody>
            <DialogContent>
              {batchLogLoading ? (
                <Spinner label="Loading batch log..." />
              ) : batchLogData ? (
                <>
                  {/* Batch Info */}
                  <div style={{ marginBottom: tokens.spacingVerticalL }}>
                    <Body1Strong>Batch Information</Body1Strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalS }}>
                      <div>
                        <Caption1>Status</Caption1>
                        <div>
                          <Badge appearance="filled" color={getStatusColor(batchLogData.batch.status)}>
                            {batchLogData.batch.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Caption1>Trigger</Caption1>
                        <Text>{batchLogData.batch.triggerType} {batchLogData.batch.triggerUserName ? `by ${batchLogData.batch.triggerUserName}` : ''}</Text>
                      </div>
                      <div>
                        <Caption1>Started</Caption1>
                        <Text>{new Date(batchLogData.batch.startDate).toLocaleString()}</Text>
                      </div>
                      <div>
                        <Caption1>Ended</Caption1>
                        <Text>{batchLogData.batch.endDate ? new Date(batchLogData.batch.endDate).toLocaleString() : 'Running...'}</Text>
                      </div>
                    </div>
                  </div>

                  {/* Error Message */}
                  {batchLogData.batch.errorMessage && (
                    <MessageBar intent="error" style={{ marginBottom: tokens.spacingVerticalM }}>
                      <MessageBarBody>
                        <MessageBarTitle>Batch Error</MessageBarTitle>
                        {batchLogData.batch.errorMessage}
                      </MessageBarBody>
                    </MessageBar>
                  )}

                  {/* Summary */}
                  <div style={{ marginBottom: tokens.spacingVerticalL }}>
                    <Body1Strong>Import Summary</Body1Strong>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: tokens.spacingHorizontalM, marginTop: tokens.spacingVerticalS }}>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold' }}>{batchLogData.batch.totalItems}</div>
                        <Caption1>Total Items</Caption1>
                      </div>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteGreenForeground1 }}>{batchLogData.summary.imported}</div>
                        <Caption1>Imported</Caption1>
                      </div>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold' }}>{batchLogData.summary.skipped}</div>
                        <Caption1>Skipped</Caption1>
                      </div>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteYellowForeground1 }}>{batchLogData.summary.duplicate}</div>
                        <Caption1>Duplicates</Caption1>
                      </div>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>{batchLogData.summary.userNotFound}</div>
                        <Caption1>User Not Found</Caption1>
                      </div>
                      <div style={{ textAlign: 'center', padding: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, borderRadius: tokens.borderRadiusMedium }}>
                        <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>{batchLogData.summary.failed}</div>
                        <Caption1>Failed</Caption1>
                      </div>
                    </div>
                  </div>

                  {/* Failures by User */}
                  {batchLogData.failuresByUser.length > 0 && (
                    <div style={{ marginBottom: tokens.spacingVerticalL }}>
                      <Body1Strong>Failures by User (Top 20)</Body1Strong>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: tokens.spacingVerticalS }}>
                        <Table size="small">
                          <TableHeader>
                            <TableRow>
                              <TableHeaderCell>User Name</TableHeaderCell>
                              <TableHeaderCell style={{ width: '100px' }}>Count</TableHeaderCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {batchLogData.failuresByUser.map((item, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{item.userName}</TableCell>
                                <TableCell>{item.count}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  {/* Recent Errors */}
                  {batchLogData.recentErrors.length > 0 && (
                    <div>
                      <Body1Strong>Recent Errors (Last 50)</Body1Strong>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: tokens.spacingVerticalS, backgroundColor: tokens.colorNeutralBackground3, padding: tokens.spacingVerticalS, borderRadius: tokens.borderRadiusMedium }}>
                        {batchLogData.recentErrors.map((error, idx) => (
                          <div key={idx} style={{ marginBottom: tokens.spacingVerticalXS }}>
                            <Text size={200}>
                              <span style={{ color: tokens.colorNeutralForeground3 }}>Item {error.itemId}:</span>{' '}
                              <Badge size="small" color={error.status === 'UserNotFound' ? 'warning' : 'danger'}>{error.status}</Badge>{' '}
                              <span style={{ color: tokens.colorPaletteRedForeground1 }}>{error.error}</span>
                            </Text>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <MessageBar intent="warning">
                  <MessageBarBody>
                    Unable to load batch log.
                  </MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={() => setShowBatchLog(null)}>
                Close
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* CSV Upload Dialog */}
      <Dialog open={showCsvUpload} onOpenChange={(_, data) => !data.open && handleCloseCsvDialog()}>
        <DialogSurface style={{ maxWidth: '600px' }}>
          <DialogTitle>Import from CSV File</DialogTitle>
          <DialogBody>
            <DialogContent>
              {importCsv.isPending ? (
                <div style={{ textAlign: 'center', padding: tokens.spacingVerticalXXL }}>
                  <Spinner label="Importing data from CSV..." />
                  <Caption1 style={{ display: 'block', marginTop: tokens.spacingVerticalM }}>
                    This may take a few minutes for large files...
                  </Caption1>
                </div>
              ) : importCsv.isSuccess && importCsv.data ? (
                <>
                  <MessageBar intent="success" style={{ marginBottom: tokens.spacingVerticalM }}>
                    <MessageBarBody>
                      <MessageBarTitle>Import Completed</MessageBarTitle>
                      Successfully processed {importCsv.data.totalItems} items from CSV.
                    </MessageBarBody>
                  </MessageBar>
                  <div className={styles.resultGrid}>
                    <div className={styles.resultItem}>
                      <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteGreenForeground1 }}>
                        {importCsv.data.importedItems}
                      </div>
                      <Caption1>Imported</Caption1>
                    </div>
                    <div className={styles.resultItem}>
                      <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold' }}>
                        {importCsv.data.skippedItems}
                      </div>
                      <Caption1>Skipped</Caption1>
                    </div>
                    <div className={styles.resultItem}>
                      <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteYellowForeground1 }}>
                        {importCsv.data.duplicateItems}
                      </div>
                      <Caption1>Duplicates</Caption1>
                    </div>
                    <div className={styles.resultItem}>
                      <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>
                        {importCsv.data.userNotFoundItems}
                      </div>
                      <Caption1>User Not Found</Caption1>
                    </div>
                    <div className={styles.resultItem}>
                      <div style={{ fontSize: tokens.fontSizeHero700, fontWeight: 'bold', color: tokens.colorPaletteRedForeground1 }}>
                        {importCsv.data.failedItems}
                      </div>
                      <Caption1>Failed</Caption1>
                    </div>
                  </div>
                  {importCsv.data.errors.length > 0 && (
                    <div className={styles.errorList}>
                      <Caption1 style={{ display: 'block', marginBottom: tokens.spacingVerticalXS }}>
                        Errors ({importCsv.data.errors.length}):
                      </Caption1>
                      {importCsv.data.errors.slice(0, 10).map((error, idx) => (
                        <Text key={idx} size={200} style={{ display: 'block', color: tokens.colorPaletteRedForeground1 }}>
                          {error}
                        </Text>
                      ))}
                      {importCsv.data.errors.length > 10 && (
                        <Caption1>...and {importCsv.data.errors.length - 10} more errors</Caption1>
                      )}
                    </div>
                  )}
                </>
              ) : importCsv.isError ? (
                <MessageBar intent="error">
                  <MessageBarBody>
                    <MessageBarTitle>Import Failed</MessageBarTitle>
                    {importCsv.error instanceof Error ? importCsv.error.message : 'Failed to import CSV data'}
                  </MessageBarBody>
                </MessageBar>
              ) : (
                <>
                  <MessageBar intent="info" style={{ marginBottom: tokens.spacingVerticalM }}>
                    <MessageBarBody>
                      <MessageBarTitle>File Selected</MessageBarTitle>
                      {csvFileName}
                    </MessageBarBody>
                  </MessageBar>
                  <Text style={{ display: 'block', marginBottom: tokens.spacingVerticalM }}>
                    This will import timesheet data from the selected CSV file.
                    The CSV should have the following columns:
                  </Text>
                  <div style={{ backgroundColor: tokens.colorNeutralBackground3, padding: tokens.spacingVerticalS, borderRadius: tokens.borderRadiusMedium, marginBottom: tokens.spacingVerticalM }}>
                    <Caption1 style={{ fontFamily: 'monospace' }}>
                      Department, Title (Employee Name), Work Date, ProjectName, Hours Worked, Submitted, Status, ApprovedBy, Note
                    </Caption1>
                  </div>
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      Employees must already exist in the system to import their timesheet data.
                      Entries for unknown users will be marked as "UserNotFound".
                    </MessageBarBody>
                  </MessageBar>
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={handleCloseCsvDialog}>
                {importCsv.isSuccess ? 'Close' : 'Cancel'}
              </Button>
              {!importCsv.isSuccess && !importCsv.isPending && (
                <Button
                  appearance="primary"
                  onClick={handleCsvImport}
                  disabled={!csvContent}
                >
                  Import Data
                </Button>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

export default LegacyImportAdmin;
