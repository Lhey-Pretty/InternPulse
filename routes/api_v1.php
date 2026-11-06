<?php

use App\Http\Controllers\Api\V1\ApplicationController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AuthorsController;
use App\Http\Controllers\Api\V1\CompanyProfileController;
use App\Http\Controllers\Api\V1\CompanyWorkspaceController;
use App\Http\Controllers\Api\V1\CoordinatorWorkspaceController;
use App\Http\Controllers\Api\V1\AdminWorkspaceController;
use App\Http\Controllers\Api\V1\InternshipPlacementController;
use App\Http\Controllers\Api\V1\InternshipPostingController;
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
Route::prefix('auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::apiResource('internships', InternshipPostingController::class)->only(['index', 'show']);
Route::get('skills', [SkillController::class, 'index']);

// Protected routes (Sanctum)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

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
    Route::get('company/applicants', [CompanyWorkspaceController::class, 'applicants']);
    Route::patch('company/applicants/{application}/status', [CompanyWorkspaceController::class, 'updateApplicantStatus']);
    Route::get('coordinator/applications', [CoordinatorWorkspaceController::class, 'applications']);
    Route::patch('coordinator/applications/{application}/status', [CoordinatorWorkspaceController::class, 'updateApplication']);
    Route::get('coordinator/companies', [CoordinatorWorkspaceController::class, 'companies']);
    Route::patch('coordinator/companies/{companyProfile}/verification', [CoordinatorWorkspaceController::class, 'updateCompany']);
    Route::get('coordinator/placements', [CoordinatorWorkspaceController::class, 'placements']);
    Route::get('coordinator/recommendations', [CoordinatorWorkspaceController::class, 'recommendations']);
    Route::post('coordinator/recommendations', [CoordinatorWorkspaceController::class, 'storeRecommendation']);
    Route::post('coordinator/recommendations/{recommendation}/confirm', [CoordinatorWorkspaceController::class, 'confirmRecommendation']);
    Route::get('admin/users', [AdminWorkspaceController::class, 'users']);
    Route::patch('admin/users/{user}', [AdminWorkspaceController::class, 'updateUser']);
    Route::get('admin/companies', [AdminWorkspaceController::class, 'companies']);
    Route::patch('admin/companies/{companyProfile}/verification', [AdminWorkspaceController::class, 'updateCompanyVerification']);
    Route::get('admin/audit-logs', [AdminWorkspaceController::class, 'auditLogs']);
    Route::get('admin/reports', [AdminWorkspaceController::class, 'reports']);
    Route::get('admin/settings', [AdminWorkspaceController::class, 'settings']);
    Route::put('admin/settings', [AdminWorkspaceController::class, 'updateSettings']);
    Route::get('admin/skills', [AdminWorkspaceController::class, 'skills']);
    Route::post('admin/skills', [AdminWorkspaceController::class, 'storeSkill']);
    Route::patch('admin/skills/{skill}', [AdminWorkspaceController::class, 'updateSkill']);
    Route::delete('admin/skills/{skill}', [AdminWorkspaceController::class, 'deleteSkill']);

    // Applications & Placements
    Route::get('applications', [ApplicationController::class, 'index']);
    Route::post('applications', [ApplicationController::class, 'store']);
    Route::get('applications/{application}', [ApplicationController::class, 'show']);
    Route::patch('applications/{application}/withdraw', [ApplicationController::class, 'withdraw']);
    Route::apiResource('placements', InternshipPlacementController::class);

    // Journal Classification (ML service callback)
    Route::post('journal-classification', [JournalClassificationController::class, 'store'])
        ->name('api.journal-classification.store');
    Route::get('journal-classification/statistics', [JournalClassificationController::class, 'statistics']);
});
