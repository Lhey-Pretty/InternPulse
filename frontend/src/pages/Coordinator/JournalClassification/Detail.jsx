import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { journalClassificationApi } from '../../../api/journalClassification';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/journalClassificationUi';
import { Badge, Alert, AlertDescription, AlertTitle, Tabs, TabsList, TabsTrigger, Skeleton, Button } from '../../../components/journalClassificationUi';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function JournalClassificationDetail({ companyId: companyIdProp, onBack }) {
  const routeParams = useParams();
  const companyId = companyIdProp || routeParams.companyId;
  const navigate = useNavigate();
  const [filterLevel, setFilterLevel] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(false);
    journalClassificationApi.getCompanyJournals(companyId, filterLevel, currentPage)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [companyId, filterLevel, currentPage]);

  const company = data?.company;
  const stats = data?.stats;
  const entries = data?.entries;
  const classifiedCount = Number(stats?.classified_entries || 0);
  const relatedCount = Number(stats?.related_entries || 0);
  const unrelatedCount = Number(stats?.unrelated_entries || 0);
  const relatedPercentage = classifiedCount > 0 ? (relatedCount / classifiedCount) * 100 : 0;
  const unrelatedPercentage = classifiedCount > 0 ? (unrelatedCount / classifiedCount) * 100 : 0;
  const relevancePie = classifiedCount > 0
    ? `conic-gradient(#059669 0% ${relatedPercentage}%, #e11d48 ${relatedPercentage}% 100%)`
    : '#e5e7eb';

  const getStatusVariant = (percentage) => {
    if (percentage >= 30) return 'destructive';
    if (percentage >= 15) return 'warning';
    return 'default';
  };

  const getStatusLabel = (stats) => {
    if (stats?.needs_review) return 'Needs Review';
    if (stats?.unrelated_percentage >= 15) return 'Warning';
    return 'Good Quality';
  };

  const getStatusIcon = (stats) => {
    if (stats?.needs_review) return <AlertTriangle className="h-5 w-5" />;
    if (stats?.unrelated_percentage >= 15) return <AlertCircle className="h-5 w-5" />;
    return <CheckCircle2 className="h-5 w-5" />;
  };

  const getFlagBadgeVariant = (flagLevel) => {
    if (flagLevel === 'Unrelated') return 'destructive';
    if (flagLevel === 'Warning - Errand / Administrative') return 'warning';
    return 'default';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Back Button */}
        <div>
          <Button
            variant="ghost"
            onClick={() => onBack ? onBack() : navigate('/coordinator/journal-classification')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to companies directory
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Journal Quality Analysis
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load journal classification details. Please try again.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Company Info + Stats */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{company?.company_name}</CardTitle>
                    <CardDescription>{company?.industry || 'Industry not specified'}</CardDescription>
                  </div>
                  <Badge variant={company?.verification_status === 'verified' ? 'default' : 'secondary'}>
                    {company?.verification_status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Status Banner */}
                {stats && (
                  <Alert variant={getStatusVariant(stats.unrelated_percentage)}>
                    <div className="flex items-center gap-3">
                      {getStatusIcon(stats)}
                      <div>
                        <AlertTitle>{getStatusLabel(stats)}</AlertTitle>
                        <AlertDescription>
                          {stats.needs_review
                            ? 'High percentage of unrelated journal entries detected. Review the entries and other company feedback before making a partnership decision.'
                            : stats.unrelated_percentage >= 15
                            ? 'Some unrelated journal entries detected. Review the entries and monitor the interns’ experience.'
                            : 'Classified journal entries show alignment with the students’ programs.'}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}

                {/* Metrics Grid */}
                {stats && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                    <MetricCard label="Total Entries" value={stats.total_entries} />
                    <MetricCard label="Related" value={stats.related_entries} variant="success" />
                    <MetricCard label="Unrelated" value={stats.unrelated_entries} variant="destructive" />
                    <MetricCard label="Classified" value={stats.classified_entries} variant="info" />
                    <MetricCard label="Pending Review" value={stats.unclassified_entries} variant="warning" />
                    <MetricCard label="Students" value={stats.students_count} variant="info" />
                    <MetricCard label="Flagged" value={stats.flagged_entries} variant="warning" />
                  </div>
                )}

                {stats && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Related vs. Unrelated Journal Activities</CardTitle>
                      <CardDescription>
                        Combined results from {stats.students_count} student{stats.students_count === 1 ? '' : 's'} placed with this company. Percentages use classified entries only; {stats.unclassified_entries} entries are pending or need review.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6 sm:flex-row">
                      <div
                        role="img"
                        aria-label={`${relatedCount} related (${relatedPercentage.toFixed(1)}%) and ${unrelatedCount} unrelated (${unrelatedPercentage.toFixed(1)}%) classified journal entries`}
                        className="relative h-40 w-40 shrink-0 rounded-full"
                        style={{ background: relevancePie }}
                      >
                        <div className="absolute inset-7 flex flex-col items-center justify-center rounded-full bg-white dark:bg-gray-950">
                          <span className="text-3xl font-semibold text-gray-900 dark:text-white">{classifiedCount}</span>
                          <span className="text-center text-xs text-gray-500">classified entries</span>
                        </div>
                      </div>
                      <div className="w-full space-y-3">
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                          <span className="flex items-center gap-2 text-sm font-medium"><span className="h-3 w-3 rounded-full bg-emerald-600" />Related</span>
                          <span className="font-semibold">{relatedCount}<span className="ml-2 text-sm font-normal text-gray-500">{classifiedCount ? `${relatedPercentage.toFixed(1)}%` : '—'}</span></span>
                        </div>
                        <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                          <span className="flex items-center gap-2 text-sm font-medium"><span className="h-3 w-3 rounded-full bg-rose-600" />Unrelated</span>
                          <span className="font-semibold">{unrelatedCount}<span className="ml-2 text-sm font-normal text-gray-500">{classifiedCount ? `${unrelatedPercentage.toFixed(1)}%` : '—'}</span></span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">The current classifier assigns one related/unrelated result per journal entry. Detected task phrases are supporting detail, not individually scored tasks.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warning Banner for Auto-flagged Companies */}
                {stats?.needs_review && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>⚠️ Recommended Action</AlertTitle>
                    <AlertDescription>
                      This company has been automatically flagged for partnership review due to high unrelated journal
                      percentage (&gt;30%). Consider conducting an internship quality audit or site visit.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Journal Entries List */}
            <Card>
              <CardHeader>
                <CardTitle>Journal Entries</CardTitle>
                <Tabs value={filterLevel} onValueChange={setFilterLevel}>
                  <TabsList>
                    <TabsTrigger value="all">All Entries</TabsTrigger>
                    <TabsTrigger value="unrelated">Unrelated Only</TabsTrigger>
                    <TabsTrigger value="warning">Warnings Only</TabsTrigger>
                    <TabsTrigger value="normal">Normal Only</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>

              <CardContent>
                {entries?.data?.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">No journal entries found with this filter.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {entries?.data?.map((entry) => (
                      <Card key={entry.id} className="border-l-4" style={{
                        borderLeftColor: entry.is_related ? '#10b981' : '#ef4444'
                      }}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900 dark:text-white">{entry.title}</h3>
                                <Badge variant={getFlagBadgeVariant(entry.flag_level)}>
                                  {entry.flag_level}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span> {new Date(entry.entry_date).toLocaleDateString()}</span>
                                <span> {entry.student_name} ({entry.student_id})</span>
                                <span> {entry.course_code}</span>
                                <span> Confidence: {(entry.confidence_score * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 line-clamp-3">
                            {entry.content}
                          </p>

                          {entry.detected_tasks && entry.detected_tasks.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                                Detected Tasks:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {entry.detected_tasks.map((task, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {task}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {entry.classification_feedback && (
                            <Alert className="mt-3">
                              <AlertDescription className="text-xs">
                                <strong>ML Feedback:</strong> {entry.classification_feedback}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {/* Pagination */}
                    {entries && entries.last_page > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Showing {(entries.current_page - 1) * entries.per_page + 1} to{' '}
                          {Math.min(entries.current_page * entries.per_page, entries.total)} of {entries.total} entries
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={entries.current_page === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => p + 1)}
                            disabled={entries.current_page === entries.last_page}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, variant = 'default' }) {
  const variantClasses = {
    default: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    destructive: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    warning: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${variantClasses[variant]}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}
