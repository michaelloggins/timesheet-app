/**
 * Scoreboard Component
 * Company-wide KPIs with team and employee leaderboards
 */

import {
  Title2,
  Card,
  makeStyles,
  tokens,
  shorthands,
  Text,
  Body1Strong,
  Caption1,
  Badge,
  ProgressBar,
  Spinner,
  Divider,
} from '@fluentui/react-components';
import {
  Trophy24Regular,
  People24Regular,
  Person24Regular,
  CheckmarkCircle24Regular,
  Clock24Regular,
  ArrowTrending24Regular,
  Fire20Regular,
  Building24Regular,
} from '@fluentui/react-icons';
import {
  useCompanyKPIs,
  useDepartmentLeaderboard,
  useCompanyLeaderboard,
} from '../../hooks/useDashboard';
import { getStreakBadge, getComplianceColor } from '../../services/dashboardService';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalXL),
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

  // Company KPIs Section - Gamified Style
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    ...shorthands.gap(tokens.spacingHorizontalL),
    '@media (max-width: 600px)': {
      gridTemplateColumns: '1fr',
    },
  },
  kpiCard: {
    ...shorthands.padding('24px'),
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalM),
    ...shorthands.borderRadius('16px'),
    background: 'linear-gradient(135deg, #ffffff 0%, #f8faf5 100%)',
    boxShadow: '0 4px 20px rgba(40, 111, 31, 0.1)',
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('transparent'),
    transitionProperty: 'all',
    transitionDuration: '200ms',
    ':hover': {
      transform: 'translateY(-4px)',
      boxShadow: '0 8px 30px rgba(40, 111, 31, 0.15)',
      ...shorthands.borderColor('#85b43b'),
    },
  },
  kpiHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kpiIcon: {
    width: '48px',
    height: '48px',
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#e8f5e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#286f1f',
    fontSize: '24px',
  },
  kpiValue: {
    fontSize: '48px',
    fontWeight: tokens.fontWeightBold,
    lineHeight: 1,
    fontFamily: '"Roboto Condensed", sans-serif',
  },
  kpiLabel: {
    color: '#404041',
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  kpiSubtext: {
    fontSize: tokens.fontSizeBase300,
    color: '#666',
  },

  // Current Week Stats - Game-style
  currentWeekCard: {
    ...shorthands.padding('24px'),
    background: 'linear-gradient(135deg, #286f1f 0%, #1a4a14 100%)',
    ...shorthands.borderRadius('16px'),
  },
  currentWeekTitle: {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  currentWeekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalM),
    marginTop: tokens.spacingVerticalL,
    '@media (max-width: 600px)': {
      gridTemplateColumns: 'repeat(2, 1fr)',
    },
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    ...shorthands.padding('20px', tokens.spacingHorizontalM),
    ...shorthands.borderRadius('12px'),
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    backdropFilter: 'blur(10px)',
  },
  statValue: {
    fontSize: '36px',
    fontWeight: tokens.fontWeightBold,
    color: 'white',
    fontFamily: '"Roboto Condensed", sans-serif',
  },
  statLabel: {
    fontSize: tokens.fontSizeBase300,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: tokens.fontWeightSemibold,
  },

  // Leaderboards Section
  leaderboardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    ...shorthands.gap(tokens.spacingHorizontalL),
    '@media (max-width: 900px)': {
      gridTemplateColumns: '1fr',
    },
  },
  leaderboardCard: {
    ...shorthands.padding('24px'),
    height: 'fit-content',
    ...shorthands.borderRadius('16px'),
    boxShadow: '0 4px 20px rgba(40, 111, 31, 0.08)',
  },
  leaderboardHeader: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalL,
    paddingBottom: tokens.spacingVerticalM,
    ...shorthands.borderBottom('2px', 'solid', '#e8f5e3'),
  },
  leaderboardList: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  leaderboardItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
    ...shorthands.padding('12px', '16px'),
    ...shorthands.borderRadius('12px'),
    backgroundColor: '#f8f9fa',
    ...shorthands.borderWidth('2px'),
    ...shorthands.borderStyle('solid'),
    ...shorthands.borderColor('transparent'),
    transitionProperty: 'all',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: '#e8f5e3',
      ...shorthands.borderColor('#85b43b'),
    },
  },
  leaderboardItemTop3: {
    background: 'linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%)',
    ...shorthands.borderColor('#ffc107'),
  },
  rankBadge: {
    minWidth: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...shorthands.borderRadius('50%'),
    fontSize: '20px',
    fontWeight: tokens.fontWeightBold,
    // backgroundColor is applied via inline styles for rank-specific colors (gold, silver, bronze)
  },
  itemInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  itemName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemStats: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalM),
  },
  scoreSection: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
  },
  scoreValue: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase400,
    minWidth: '45px',
    textAlign: 'right',
  },
  complianceBar: {
    width: '60px',
    '@media (max-width: 600px)': {
      display: 'none',
    },
  },
  streakBadge: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalXS),
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteRedForeground1,
  },
  employeeCount: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },

  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '300px',
  },

  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap(tokens.spacingHorizontalS),
    marginBottom: tokens.spacingVerticalM,
  },
});

export const Scoreboard = () => {
  const styles = useStyles();

  const { companyKPIs, isLoading: kpisLoading } = useCompanyKPIs();
  const { departmentLeaderboard, isLoading: deptLoading } = useDepartmentLeaderboard();
  const { employeeLeaderboard, isLoading: empLoading } = useCompanyLeaderboard(10);

  const isLoading = kpisLoading || deptLoading || empLoading;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="large" label="Loading scoreboard..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Trophy24Regular />
          <Title2>Company Scoreboard</Title2>
        </div>
        {companyKPIs && (
          <Caption1>
            {companyKPIs.totalEmployees} employees | {new Date().getFullYear()} YTD through {new Date(companyKPIs.periodEnd).toLocaleDateString()}
          </Caption1>
        )}
      </div>

      {/* Company-wide KPIs */}
      {companyKPIs && (
        <>
          <div className={styles.kpiGrid}>
            {/* Total Employees */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue}>{companyKPIs.totalEmployees}</div>
                  <div className={styles.kpiLabel}>Active Employees</div>
                </div>
                <People24Regular />
              </div>
            </Card>

            {/* Weekly Compliance */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div
                    className={styles.kpiValue}
                    style={{
                      color:
                        companyKPIs.weeklyCompliance.averageComplianceRate >= 90
                          ? tokens.colorPaletteGreenForeground1
                          : companyKPIs.weeklyCompliance.averageComplianceRate >= 70
                            ? tokens.colorPaletteYellowForeground1
                            : tokens.colorPaletteRedForeground1,
                    }}
                  >
                    {companyKPIs.weeklyCompliance.averageComplianceRate}%
                  </div>
                  <div className={styles.kpiLabel}>Weekly Compliance</div>
                </div>
                <CheckmarkCircle24Regular />
              </div>
              <Text className={styles.kpiSubtext}>
                {companyKPIs.weeklyCompliance.totalApprovedWeeks.toLocaleString()} of{' '}
                {companyKPIs.weeklyCompliance.totalExpectedWeeks.toLocaleString()} weeks approved
              </Text>
              <ProgressBar
                value={companyKPIs.weeklyCompliance.totalApprovedWeeks / Math.max(companyKPIs.weeklyCompliance.totalExpectedWeeks, 1)}
                color={getComplianceColor(companyKPIs.weeklyCompliance.averageComplianceRate)}
              />
            </Card>

            {/* Daily Reporting */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div
                    className={styles.kpiValue}
                    style={{
                      color:
                        companyKPIs.dailyReporting.averageReportingRate >= 90
                          ? tokens.colorPaletteGreenForeground1
                          : companyKPIs.dailyReporting.averageReportingRate >= 70
                            ? tokens.colorPaletteYellowForeground1
                            : tokens.colorPaletteRedForeground1,
                    }}
                  >
                    {companyKPIs.dailyReporting.averageReportingRate}%
                  </div>
                  <div className={styles.kpiLabel}>Daily Reporting</div>
                </div>
                <Clock24Regular />
              </div>
              <Text className={styles.kpiSubtext}>
                {companyKPIs.dailyReporting.totalActualDays.toLocaleString()} of{' '}
                {companyKPIs.dailyReporting.totalExpectedDays.toLocaleString()} days logged
              </Text>
              <ProgressBar
                value={companyKPIs.dailyReporting.totalActualDays / Math.max(companyKPIs.dailyReporting.totalExpectedDays, 1)}
                color={getComplianceColor(companyKPIs.dailyReporting.averageReportingRate)}
              />
            </Card>

            {/* Trend indicator placeholder */}
            <Card className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <div>
                  <div className={styles.kpiValue} style={{ color: tokens.colorBrandForeground1 }}>
                    {companyKPIs.weeklyCompliance.currentWeekStats.approved + companyKPIs.weeklyCompliance.currentWeekStats.submitted}
                  </div>
                  <div className={styles.kpiLabel}>This Week Complete</div>
                </div>
                <ArrowTrending24Regular />
              </div>
              <Text className={styles.kpiSubtext}>
                {companyKPIs.weeklyCompliance.currentWeekStats.missing} still pending
              </Text>
            </Card>
          </div>

          {/* Current Week Status */}
          <Card className={styles.currentWeekCard}>
            <div className={styles.currentWeekTitle}>
              <Clock24Regular style={{ color: 'white' }} />
              <Body1Strong style={{ color: 'white' }}>Current Week Status</Body1Strong>
            </div>
            <div className={styles.currentWeekGrid}>
              <div className={styles.statItem} style={{ backgroundColor: 'rgba(144, 238, 144, 0.25)' }}>
                <span className={styles.statValue} style={{ color: '#90EE90' }}>
                  {companyKPIs.weeklyCompliance.currentWeekStats.approved}
                </span>
                <span className={styles.statLabel}>Approved</span>
              </div>
              <div className={styles.statItem} style={{ backgroundColor: 'rgba(135, 206, 250, 0.25)' }}>
                <span className={styles.statValue} style={{ color: '#87CEFA' }}>
                  {companyKPIs.weeklyCompliance.currentWeekStats.submitted}
                </span>
                <span className={styles.statLabel}>Submitted</span>
              </div>
              <div className={styles.statItem} style={{ backgroundColor: 'rgba(255, 215, 0, 0.25)' }}>
                <span className={styles.statValue} style={{ color: '#FFD700' }}>
                  {companyKPIs.weeklyCompliance.currentWeekStats.draft}
                </span>
                <span className={styles.statLabel}>Draft</span>
              </div>
              <div className={styles.statItem} style={{ backgroundColor: 'rgba(255, 99, 71, 0.25)' }}>
                <span className={styles.statValue} style={{ color: '#FF6B6B' }}>
                  {companyKPIs.weeklyCompliance.currentWeekStats.missing}
                </span>
                <span className={styles.statLabel}>Not Started</span>
              </div>
            </div>
          </Card>
        </>
      )}

      <Divider />

      {/* Leaderboards */}
      <div className={styles.leaderboardsGrid}>
        {/* Team/Department Leaderboard */}
        <Card className={styles.leaderboardCard}>
          <div className={styles.leaderboardHeader}>
            <Building24Regular />
            <Body1Strong>Team Leaderboard</Body1Strong>
            <Badge appearance="outline" size="small">
              By Department
            </Badge>
          </div>

          <div className={styles.leaderboardList}>
            {departmentLeaderboard.map((dept, index) => {
              // Use index+1 as rank since API may not return rank
              const effectiveRank = index + 1;
              const getRankColors = (rank: number) => {
                if (rank === 1) return { bg: '#FFD700', color: '#8B6914', shadow: '0 2px 8px rgba(255, 215, 0, 0.5)' };
                if (rank === 2) return { bg: '#C0C0C0', color: '#4a4a4a', shadow: '0 2px 8px rgba(192, 192, 192, 0.5)' };
                if (rank === 3) return { bg: '#CD7F32', color: '#5c3a1a', shadow: '0 2px 8px rgba(205, 127, 50, 0.5)' };
                return { bg: '#e8f5e3', color: '#286f1f', shadow: 'none' };
              };
              const getRankLabel = (rank: number) => {
                if (rank === 1) return '1st';
                if (rank === 2) return '2nd';
                if (rank === 3) return '3rd';
                return `${rank}`;
              };
              const isTop3 = effectiveRank <= 3;
              const rankColors = getRankColors(effectiveRank);
              return (
                <div
                  key={dept.departmentId}
                  className={`${styles.leaderboardItem} ${isTop3 ? styles.leaderboardItemTop3 : ''}`}
                >
                  <div
                    className={styles.rankBadge}
                    style={{
                      backgroundColor: rankColors.bg,
                      color: rankColors.color,
                      boxShadow: rankColors.shadow,
                    }}
                  >
                    <span style={{ fontSize: isTop3 ? '16px' : '18px', fontWeight: 'bold' }}>{getRankLabel(effectiveRank)}</span>
                  </div>

                  <div className={styles.itemInfo}>
                    <Body1Strong className={styles.itemName}>{dept.departmentName}</Body1Strong>
                    <Caption1 className={styles.employeeCount}>
                      {dept.employeeCount} employees | {dept.currentWeekApproved}/{dept.employeeCount} approved this week
                    </Caption1>
                  </div>

                  <div className={styles.scoreSection}>
                    <div className={styles.complianceBar}>
                      <ProgressBar
                        value={dept.complianceRate / 100}
                        color={getComplianceColor(dept.complianceRate)}
                      />
                    </div>
                    <div className={styles.scoreValue}>{dept.complianceRate}%</div>
                  </div>
                </div>
              );
            })}

            {departmentLeaderboard.length === 0 && (
              <Text style={{ textAlign: 'center', padding: tokens.spacingVerticalL }}>
                No department data available
              </Text>
            )}
          </div>
        </Card>

        {/* Top 10 Employees Leaderboard */}
        <Card className={styles.leaderboardCard}>
          <div className={styles.leaderboardHeader}>
            <Person24Regular />
            <Body1Strong>Top 10 Employees</Body1Strong>
            <Badge appearance="outline" size="small">
              By Score
            </Badge>
          </div>

          <div className={styles.leaderboardList}>
            {employeeLeaderboard.map((employee, index) => {
              // Use index+1 as rank since API may not return rank
              const effectiveRank = index + 1;
              const streakInfo = getStreakBadge(employee.streakWeeks);
              const getRankColors = (rank: number) => {
                if (rank === 1) return { bg: '#FFD700', color: '#8B6914', shadow: '0 2px 8px rgba(255, 215, 0, 0.5)' };
                if (rank === 2) return { bg: '#C0C0C0', color: '#4a4a4a', shadow: '0 2px 8px rgba(192, 192, 192, 0.5)' };
                if (rank === 3) return { bg: '#CD7F32', color: '#5c3a1a', shadow: '0 2px 8px rgba(205, 127, 50, 0.5)' };
                return { bg: '#e8f5e3', color: '#286f1f', shadow: 'none' };
              };
              const getRankLabel = (rank: number) => {
                if (rank === 1) return '1st';
                if (rank === 2) return '2nd';
                if (rank === 3) return '3rd';
                return `${rank}`;
              };
              const isTop3 = effectiveRank <= 3;
              const rankColors = getRankColors(effectiveRank);

              return (
                <div
                  key={employee.userId}
                  className={`${styles.leaderboardItem} ${isTop3 ? styles.leaderboardItemTop3 : ''}`}
                >
                  <div
                    className={styles.rankBadge}
                    style={{
                      backgroundColor: rankColors.bg,
                      color: rankColors.color,
                      boxShadow: rankColors.shadow,
                    }}
                  >
                    <span style={{ fontSize: isTop3 ? '16px' : '18px', fontWeight: 'bold' }}>{getRankLabel(effectiveRank)}</span>
                  </div>

                  <div className={styles.itemInfo}>
                    <Body1Strong className={styles.itemName}>{employee.employeeName}</Body1Strong>
                    <Caption1>
                      Weekly: {employee.weeklyComplianceRate.toFixed(0)}% | Daily: {employee.dailyReportingRate.toFixed(0)}%
                    </Caption1>
                  </div>

                  <div className={styles.scoreSection}>
                    {streakInfo && (
                      <div className={styles.streakBadge} title={streakInfo.label}>
                        <Fire20Regular />
                        <span>{employee.streakWeeks}w</span>
                      </div>
                    )}
                    <div className={styles.scoreValue}>{employee.overallScore.toFixed(0)}</div>
                  </div>
                </div>
              );
            })}

            {employeeLeaderboard.length === 0 && (
              <Text style={{ textAlign: 'center', padding: tokens.spacingVerticalL }}>
                No employee data available
              </Text>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
