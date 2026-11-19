<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Skill;
use Illuminate\Http\JsonResponse;

class SkillController extends Controller
{
    /**
     * Display a listing of all available skills.
     */
    public function index(): JsonResponse
    {
        $skills = Skill::where('is_active', true)
            ->where('is_matchable', true)
            ->orderBy('category')->orderBy('name')->get();

        return $this->ok('Skills retrieved successfully.', $skills);
    }
}
