<?php

use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AuthorsController;
use App\Http\Controllers\Api\V1\CompanyProfileController;
use App\Http\Controllers\Api\V1\CompanyWorkspaceController;
use App\Http\Controllers\Api\V1\CoordinatorWorkspaceController;
use App\Http\Controllers\Api\V1\AdminWorkspaceController;
use App\Http\Controllers\Admin\EvaluationCriteriaController;
use App\Http\Controllers\Api\V1\InternshipPlacementController;
use App\Http\Controllers\Api\V1\InternshipPostingController;
use App\Http\Controllers\Api\V1\CompanyInternController;
use App\Http\Controllers\Api\V1\CoordinatorMonitoringController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\StudentWorkspaceController;
use App\Http\Controllers\Api\V1\JournalClassificationController;
use App\Http\Controllers\Api\V1\SkillController;
use App\Http\Controllers\Api\V1\StudentProfileController;
use App\Http\Controllers\Api\V1\StudentRecommendationController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\UserInternshipsController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API V1 Routes
|--------------------------------------------------------------------------
|
| Prefixed with /api/v1 as defined in bootstrap/app.php
|
*/

// Public browse routes
Route::prefix('auth')->middleware('throttle:api')->group(function (): void {
    Route::get('/options', [AuthController::class, 'options']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/google', [AuthController::class, 'googleLogin']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

Route::apiResource('internships', InternshipPostingController::class)->only(['index', 'show'])->middleware('throttle:api');
Route::get('skills', [SkillController::class, 'index'])->middleware('throttle:api');
Route::get('rubrics', [AdminWorkspaceController::class, 'rubrics'])->middleware('throttle:api');

// ML webhook uses a shared service token instead of a user JWT.
Route::post('journal-classification', [JournalClassificationController::class, 'store'])
    ->middleware('throttle:api')
    ->name('api.journal-classification.store');

// Protected routes (JWT bearer tokens)
Route::middleware(['jwt', 'throttle:api'])->group(function (): void {
    Route::get('evaluation-policy', [AdminWorkspaceController::class, 'evaluationPolicy']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);
    Route::post('/auth/first-login-setup', [AuthController::class, 'firstLoginSetup']);
    Route::post('/auth/change-email', [AuthController::class, 'changeEmail']);

    Route::apiResource('internships', InternshipPostingController::class)->except(['index', 'show']);
    Route::put('internships/{internship}', [InternshipPostingController::class, 'replace']);
    Route::patch('internships/{internship}', [InternshipPostingController::class, 'update']);
    Route::apiResource('users', UserController::class);
    // Step 22: Implementing user internships routes
    Route::apiResource('users.internships', UserInternshipsController::class);
    Route::apiResource('authors', AuthorsController::class)->except(['store', 'update', 'destroy']);
    
    // Profiles
    Route::get('profile/student', [StudentProfileController::class, 'show']);
    Route::put('profile/student', [StudentProfileController::class, 'update']);
    Route::get('student/recommendations', [StudentRecommendationController::class, 'index']);
    Route::get('profile/company', [CompanyProfileController::class, 'show']);
    Route::put('profile/company', [CompanyProfileController::class, 'update']);
    Route::get('company/postings', [CompanyWorkspaceController::class, 'postings']);
    Route::post('company/postings', [CompanyWorkspaceController::class, 'storePosting']);
    Route::patch('company/postings/{posting}', [CompanyWorkspaceController::class, 'updatePosting']);
    Route::delete('company/postings/{posting}', [CompanyWorkspaceController::class, 'deletePosting']);
    Route::get('company/evaluation-summary', [CompanyWorkspaceController::class, 'evaluationSummary']);
    Route::get('company/applicants', [CompanyWorkspaceController::class, 'applicants']);
    Route::patch('company/applicants/{application}/status', [CompanyWorkspaceController::class, 'updateApplicantStatus']);
    Route::get('company/applicants/{application}/resume', [CompanyWorkspaceController::class, 'viewResume']);
    Route::post('company/applicants/{application}/placement-request', [CompanyWorkspaceController::class, 'requestPlacement']);
    Route::get('coordinator/overview', [CoordinatorWorkspaceController::class, 'overview']);
    Route::get('coordinator/applications', [CoordinatorWorkspaceController::class, 'applications']);
    Route::patch('coordinator/applications/{application}/status', [CoordinatorWorkspaceController::class, 'updateApplication']);
    Route::get('coordinator/companies', [CoordinatorWorkspaceController::class, 'companies']);
    Route::patch('coordinator/companies/{companyProfile}/verification', [CoordinatorWorkspaceController::class, 'updateCompany']);
    Route::get('coordinator/placements', [CoordinatorWorkspaceController::class, 'placements']);
    Route::get('coordinator/placements/{placement}', [CoordinatorWorkspaceController::class, 'placement']);
    Route::post('coordinator/placements/{placement}/transfer', [CoordinatorWorkspaceController::class, 'transferPlacement']);
    Route::get('coordinator/companies/{companyProfile}', [CoordinatorWorkspaceController::class, 'company']);
    Route::get('coordinator/recommendation-options', [CoordinatorWorkspaceController::class, 'recommendationOptions']);
    Route::get('coordinator/profile', [CoordinatorWorkspaceController::class, 'profile']);
    Route::put('coordinator/profile', [CoordinatorWorkspaceController::class, 'updateProfile']);
    Route::get('coordinator/recommendations', [CoordinatorWorkspaceController::class, 'recommendations']);
    Route::post('coordinator/recommendations', [CoordinatorWorkspaceController::class, 'storeRecommendation']);
    Route::post('coordinator/recommendations/{recommendation}/confirm', [CoordinatorWorkspaceController::class, 'confirmRecommendation']);
    Route::patch('coordinator/recommendations/{recommendation}/reject', [CoordinatorWorkspaceController::class, 'rejectRecommendation']);
    Route::get('admin/users', [AdminWorkspaceController::class, 'users']);
    Route::get('admin/users/export', [AdminWorkspaceController::class, 'exportUsers']);
    Route::post('admin/users', [AdminWorkspaceController::class, 'storeUser']);
    Route::patch('admin/users/{user}', [AdminWorkspaceController::class, 'updateUser']);
    Route::delete('admin/users/{user}', [AdminWorkspaceController::class, 'deleteUser']);
    Route::get('admin/students', [AdminWorkspaceController::class, 'students']);
    Route::get('admin/students/{studentProfile}', [AdminWorkspaceController::class, 'student']);
    Route::get('admin/session-logs', [AdminWorkspaceController::class, 'sessionLogs']);
    Route::get('admin/ml-dashboard', [AdminWorkspaceController::class, 'mlDashboard']);
    Route::get('admin/company-requests', [AdminWorkspaceController::class, 'companyRequests']);
    Route::patch('admin/company-requests/{companyRequest}/review', [AdminWorkspaceController::class, 'reviewCompanyRequest']);
    Route::get('admin/companies', [AdminWorkspaceController::class, 'companies']);
    Route::post('admin/companies', [AdminWorkspaceController::class, 'storeCompany']);
    Route::get('admin/companies/{companyProfile}', [AdminWorkspaceController::class, 'company']);
    Route::patch('admin/companies/{companyProfile}', [AdminWorkspaceController::class, 'updateCompany']);
    Route::patch('admin/companies/{companyProfile}/toggle-active', [AdminWorkspaceController::class, 'toggleCompanyActive']);
    Route::patch('admin/companies/{companyProfile}/verification', [AdminWorkspaceController::class, 'updateCompanyVerification']);
    Route::get('admin/audit-logs', [AdminWorkspaceController::class, 'auditLogs']);
    Route::get('admin/reports', [AdminWorkspaceController::class, 'reports']);
    Route::get('admin/settings', [AdminWorkspaceController::class, 'settings']);
    Route::put('admin/settings', [AdminWorkspaceController::class, 'updateSettings']);
    Route::get('admin/rubrics', [AdminWorkspaceController::class, 'rubrics']);
    Route::put('admin/rubrics', [AdminWorkspaceController::class, 'updateRubrics']);
    Route::get('admin/skills', [AdminWorkspaceController::class, 'skills']);
    Route::get('admin/skills-hub', [AdminWorkspaceController::class, 'skillsHub']);
    Route::get('admin/skills/export', [AdminWorkspaceController::class, 'exportSkills']);
    Route::post('admin/skills/import', [AdminWorkspaceController::class, 'importSkills']);
    Route::post('admin/skills', [AdminWorkspaceController::class, 'storeSkill']);
    Route::patch('admin/skills/{skill}', [AdminWorkspaceController::class, 'updateSkill']);
    Route::delete('admin/skills/{skill}', [AdminWorkspaceController::class, 'deleteSkill']);
    
    // Evaluation Criteria Management
    Route::get('admin/evaluation-criteria', [EvaluationCriteriaController::class, 'index']);
    Route::get('admin/evaluation-criteria/{criterion}', [EvaluationCriteriaController::class, 'show']);
    Route::patch('admin/evaluation-criteria/{criterion}', [EvaluationCriteriaController::class, 'update']);
    Route::post('admin/evaluation-criteria/reorder', [EvaluationCriteriaController::class, 'reorder']);
    Route::patch('admin/evaluation-criteria/{criterion}/toggle', [EvaluationCriteriaController::class, 'toggleStatus']);

    // Applications & Placements
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::post('applications', [ApplicationController::class, 'store']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);
    Route::patch('applications/{application}/withdraw', [ApplicationController::class, 'withdraw']);
    Route::apiResource('placements', InternshipPlacementController::class);

    // Journal Classification (ML service callback)
    Route::get('journal-classification/statistics', [JournalClassificationController::class, 'statistics']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::get('notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/read-all', [NotificationController::class, 'markAllAsRead']);

    // Student workspace: journal, attendance, weekly logs, tasks, evaluations
    Route::get('student/overview', [StudentWorkspaceController::class, 'overview']);
    Route::get('student/evaluation-summary', [StudentWorkspaceController::class, 'evaluationSummary']);
    Route::get('student/journals', [StudentWorkspaceController::class, 'journals']);
    Route::post('student/journals', [StudentWorkspaceController::class, 'storeJournal']);
    Route::patch('student/journals/{journalEntry}', [StudentWorkspaceController::class, 'updateJournal']);
    Route::get('student/attendance', [StudentWorkspaceController::class, 'attendance']);
    Route::post('student/attendance', [StudentWorkspaceController::class, 'storeAttendance']);
    Route::patch('student/attendance/{attendanceLog}/timeout', [StudentWorkspaceController::class, 'timeoutAttendance']);
    Route::get('student/weekly-logs', [StudentWorkspaceController::class, 'weeklyLogs']);
    Route::post('student/weekly-logs', [StudentWorkspaceController::class, 'storeWeeklyLog']);
    Route::get('student/tasks', [StudentWorkspaceController::class, 'tasks']);
    Route::patch('student/tasks/{task}', [StudentWorkspaceController::class, 'updateTask']);
    Route::get('student/evaluations', [StudentWorkspaceController::class, 'evaluations']);
    Route::get('student/placements', [StudentWorkspaceController::class, 'placements']);
    Route::post('student/placements/{placement}/company-rating', [StudentWorkspaceController::class, 'storeCompanyRating']);
    Route::get('student/company-requests', [StudentWorkspaceController::class, 'companyRequests']);
    Route::post('student/company-requests', [StudentWorkspaceController::class, 'storeCompanyRequest']);
    Route::get('student/resume/download', [StudentWorkspaceController::class, 'resumeDownload']);
    Route::post('student/resume', [StudentWorkspaceController::class, 'uploadResume']);
    Route::get('student/performance', [StudentWorkspaceController::class, 'performance']);
    Route::get('student/skill-recommendations', [StudentWorkspaceController::class, 'skillRecommendations']);
    Route::get('student/placement-recommendations', [StudentWorkspaceController::class, 'placementRecommendations']);
    Route::get('student/completion-summary', [StudentWorkspaceController::class, 'completionSummary']);

    // Company intern management
    Route::get('company/interns', [CompanyInternController::class, 'interns']);
    Route::get('company/interns/{placement}', [CompanyInternController::class, 'intern']);
    Route::get('company/attendance-approvals', [CompanyInternController::class, 'attendanceApprovals']);
    Route::patch('company/attendance/{attendanceLog}/approve-time-in', [CompanyInternController::class, 'approveTimeIn']);
    Route::patch('company/attendance/{attendanceLog}/approve-time-out', [CompanyInternController::class, 'approveTimeOut']);
    Route::post('company/interns/{placement}/tasks', [CompanyInternController::class, 'storeTask']);
    Route::patch('company/tasks/{task}/feedback', [CompanyInternController::class, 'taskFeedback']);
    // Journal review removed - journals are private to students and coordinators only
    Route::get('company/evaluations', [CompanyInternController::class, 'evaluations']);
    Route::post('company/interns/{placement}/evaluations', [CompanyInternController::class, 'storeEvaluation']);
    Route::get('company/completion', [CompanyInternController::class, 'completion']);
    Route::patch('company/interns/{placement}/completion', [CompanyInternController::class, 'approveCompletion']);
    Route::get('company/match-scores', [CompanyInternController::class, 'matchScores']);

    // Coordinator monitoring: posting approvals, students, journals, reports
    Route::middleware('role:coordinator,admin')->group(function (): void {
        Route::get('coordinator/postings', [CoordinatorMonitoringController::class, 'postings']);
        Route::get('coordinator/postings/{posting}', [CoordinatorMonitoringController::class, 'posting']);
        Route::patch('coordinator/postings/{posting}/approve', [CoordinatorMonitoringController::class, 'approvePosting']);
        Route::patch('coordinator/postings/{posting}/reject', [CoordinatorMonitoringController::class, 'rejectPosting']);
        Route::get('coordinator/students', [CoordinatorMonitoringController::class, 'students']);
        Route::patch('coordinator/students/{studentProfile}/approve', [CoordinatorMonitoringController::class, 'approveStudent']);
        Route::get('coordinator/students/{studentProfile}', [CoordinatorMonitoringController::class, 'student']);
        Route::post('coordinator/students/{studentProfile}/transfer', [CoordinatorMonitoringController::class, 'transferStudent']);
        Route::get('coordinator/journals', [CoordinatorMonitoringController::class, 'journals']);
        Route::get('coordinator/journals/{journalEntry}', [CoordinatorMonitoringController::class, 'journal']);
        Route::patch('coordinator/journals/{journalEntry}/remarks', [CoordinatorMonitoringController::class, 'journalRemarks']);
        Route::get('coordinator/students/{studentProfile}/resume', [CoordinatorMonitoringController::class, 'studentResume']);
        Route::get('coordinator/reports', [CoordinatorMonitoringController::class, 'reports']);
        Route::get('coordinator/reports/items', [CoordinatorMonitoringController::class, 'reportItems']);

        // Coordinator: Journal Classification Monitoring (ML-powered quality assurance)
        Route::get('coordinator/journal-classification', [\App\Http\Controllers\Api\V1\JournalClassificationMonitorController::class, 'index']);
        Route::get('coordinator/journal-classification/{companyId}', [\App\Http\Controllers\Api\V1\JournalClassificationMonitorController::class, 'show']);
        Route::get('coordinator/companies/{companyId}/journal-stats', [\App\Http\Controllers\Api\V1\JournalClassificationMonitorController::class, 'companyJournalStats']);
    });
});

Route::post('/auth/refresh', [AuthController::class, 'refresh'])->middleware(['jwt:refresh', 'throttle:api']);
