import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { journalClassificationApi } from '../../../api/journalClassification';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/journalClassificationUi';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/journalClassificationUi';
import { Badge, Tabs, TabsList, TabsTrigger, Alert, AlertDescription, Skeleton } from '../../../components/journalClassificationUi';
import { ArrowRight, AlertTriangle, Check, Info } from 'lucide-react';

export default function JournalClassificationIndex({ onCompanySelect }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError(false);
    journalClassificationApi.getCompanyStats(filter)
      .then((res) => { if (active) setData(res.data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [filter]);

  const getStatusVariant = (percentage) => {
    if (percentage >= 30) return 'destructive';
    if (percentage >= 15) return 'warning';
    return 'success';
  };

  const getStatusLabel = (stats) => {
    if (stats.needs_review) return 'Needs Review';
    if (stats.unrelated_percentage >= 15) return 'Warning';
    return 'Good Quality';
  };

  const taskStats = data?.journal_tasks ?? { related: 0, unrelated: 0, unclassified: 0, total: 0 };
  const relatedPercent = taskStats.total > 0 ? (taskStats.related / taskStats.total) * 100 : 0;
  const pieBackground = taskStats.total > 0
    ? `conic-gradient(#059669 0% ${relatedPercent}%, #e11d48 ${relatedPercent}% 100%)`
    : '#e5e7eb';

  const getStatusIcon = (stats) => {
    if (stats.needs_review) return <AlertTriangle className="h-4 w-4" />;
    if (stats.unrelated_percentage >= 15) return <Info className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  const openCompany = (companyId) => {
    if (onCompanySelect) onCompanySelect(companyId);
    else navigate(`/coordinator/journal-classification/${companyId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Journal Classification Monitor
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ML-powered analysis of student journal entries to identify companies that may not be providing proper internship experiences.
          </p>
        </div>

        {/* Info Banner */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>How it works:</strong> The ML classifier analyzes journal entries to detect whether students are performing 
            course-related work or unrelated activities. A company is flagged for review only when more than 30% of its classified entries are unrelated and at least 10 entries have been classified. This prompts coordinator review; it does not automatically remove a company.
          </AlertDescription>
        </Alert>

        {/* Coordinator summary */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Journal classification summary</CardTitle>
              <CardDescription>Combined related and unrelated journal entries across companies in your assigned program.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row items-center gap-6">
              <div
                role="img"
                aria-label={`${taskStats.related} related and ${taskStats.unrelated} unrelated classified journal entries`}
                className="relative h-40 w-40 shrink-0 rounded-full"
                style={{ background: pieBackground }}
              >
                <div className="absolute inset-7 rounded-full bg-white dark:bg-gray-950 flex flex-col items-center justify-center dark:text-gray-100">
                  <span className="text-3xl font-semibold text-gray-900 dark:text-white">{taskStats.total}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">classified entries</span>
                </div>
              </div>
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <span className="flex items-center gap-2 text-sm font-medium"><span className="h-3 w-3 rounded-full bg-emerald-600" />Related entries</span>
                  <span className="text-right font-semibold">{taskStats.related}<span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">{taskStats.total ? `${relatedPercent.toFixed(1)}%` : '—'}</span></span>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
                  <span className="flex items-center gap-2 text-sm font-medium"><span className="h-3 w-3 rounded-full bg-rose-600" />Unrelated entries</span>
                  <span className="text-right font-semibold">{taskStats.unrelated}<span className="ml-2 text-sm font-normal text-gray-500 dark:text-gray-400">{taskStats.total ? `${(100 - relatedPercent).toFixed(1)}%` : '—'}</span></span>
                </div>
                {taskStats.unclassified > 0 && <p className="text-xs text-gray-500 dark:text-gray-400">{taskStats.unclassified} entries are pending classification or need coordinator review; they are excluded from the percentages.</p>}
                {taskStats.total === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">No classified journal tasks yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Companies evaluated by students</CardTitle>
              <CardDescription>All companies with at least one submitted student evaluation.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
              ) : data?.evaluated_companies?.length ? (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {data.evaluated_companies.map((company) => (
                    <div key={company.company_id} className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900 dark:text-white">{company.company_name}</p>
                        <p className="truncate text-sm text-gray-500 dark:text-gray-400">{company.industry || 'Industry not specified'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-semibold">{company.average_rating ?? '—'} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/ 5</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{company.evaluation_count} {Number(company.evaluation_count) === 1 ? 'evaluation' : 'evaluations'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">No student company evaluations yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Stats */}
        {data?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Companies</CardDescription>
                <CardTitle className="text-3xl">{data.summary.total_companies}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Has Flagged Entries</CardDescription>
                <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">
                  {data.summary.flagged_companies}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Needs Review (&gt;30%)</CardDescription>
                <CardTitle className="text-3xl text-red-600 dark:text-red-400">
                  {data.summary.needs_review_companies}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Filter Tabs */}
        <Card>
          <CardHeader>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All Companies</TabsTrigger>
                <TabsTrigger value="needs_review">Needs Review (&gt;30%)</TabsTrigger>
                <TabsTrigger value="flagged">Has Flagged Entries</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Failed to load journal classification data. Please try again.
                </AlertDescription>
              </Alert>
            ) : data?.companies?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No companies match the current filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-center">Students</TableHead>
                      <TableHead className="text-center">Total Entries</TableHead>
                      <TableHead className="text-center">Classified</TableHead>
                      <TableHead className="text-center">Related</TableHead>
                      <TableHead className="text-center">Unrelated</TableHead>
                      <TableHead className="text-center">Unrelated %</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.companies?.map((item) => (
                      <TableRow
                        key={item.company_id}
                        className={`cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 ${
                          item.stats.needs_review ? 'bg-red-50 dark:bg-red-950/20' : ''
                        }`}
                        onClick={() => openCompany(item.company_id)}
                      >
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {item.company_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.industry || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{item.stats.students_count}</TableCell>
                        <TableCell className="text-center">
                          {item.stats.total_entries}
                        </TableCell>
                        <TableCell className="text-center text-gray-600 dark:text-gray-400">
                          {item.stats.classified_entries}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {item.stats.related_entries}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium text-red-600 dark:text-red-400">
                            {item.stats.unrelated_entries}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStatusVariant(item.stats.unrelated_percentage)}>
                            {item.stats.unrelated_percentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getStatusVariant(item.stats.unrelated_percentage)}>
                            <span className="mr-1">{getStatusIcon(item.stats)}</span>
                            {getStatusLabel(item.stats)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openCompany(item.company_id);
                            }}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-1 dark:hover:text-blue-300"
                          >
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
