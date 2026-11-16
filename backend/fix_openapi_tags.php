<?php

$filePath = __DIR__ . '/storage/app/private/scribe/openapi.yaml';
if (!file_exists($filePath)) {
    echo "File not found: $filePath\n";
    exit(1);
}

$content = file_get_contents($filePath);
$lines = explode("\n", $content);
$currentPath = '';
$newLines = [];
$tagsAdded = [];

foreach ($lines as $line) {
    if (preg_match('/^  [\'"]?(\/api\/v1\/[^\'":]+)[\'"]?:/', $line, $m)) {
        $currentPath = $m[1];
    }
    if (preg_match('/^        - (Endpoints|\'Internship postings\'|Authentication)/', $line)) {
        $tag = 'General Endpoints';
        if (str_starts_with($currentPath, '/api/v1/auth')) $tag = 'Authentication';
        elseif (str_starts_with($currentPath, '/api/v1/student')) $tag = 'Student Portal';
        elseif (str_starts_with($currentPath, '/api/v1/company')) $tag = 'Company Portal';
        elseif (str_starts_with($currentPath, '/api/v1/coordinator')) $tag = 'Coordinator Portal';
        elseif (str_starts_with($currentPath, '/api/v1/admin')) $tag = 'Admin Management';
        elseif (str_starts_with($currentPath, '/api/v1/internships')) $tag = 'Internship Postings';
        elseif (str_starts_with($currentPath, '/api/v1/applications')) $tag = 'Applications';
        elseif (str_starts_with($currentPath, '/api/v1/notifications')) $tag = 'Notifications';
        elseif (str_starts_with($currentPath, '/api/v1/users')) $tag = 'User Accounts';
        elseif (str_starts_with($currentPath, '/api/v1/skills')) $tag = 'Skills Taxonomy';
        elseif (str_starts_with($currentPath, '/api/v1/placements')) $tag = 'Placements';
        elseif (str_starts_with($currentPath, '/api/v1/journal-classification')) $tag = 'ML Journal Classification';
        
        $newLines[] = "        - '$tag'";
        $tagsAdded[$tag] = true;
        continue;
    }
    $newLines[] = $line;
}

// Also update top tags definition
$result = implode("\n", $newLines);

// Build tags list YAML
$tagsYaml = "tags:\n";
foreach (array_keys($tagsAdded) as $tag) {
    $tagsYaml .= "  -\n    name: '$tag'\n    description: ''\n";
}

// Replace the top tags section
$result = preg_replace('/tags:\n(  -\n    name:[^\n]+\n    description:[^\n]*\n)+/', $tagsYaml, $result, 1);

file_put_contents($filePath, $result);
echo "Successfully updated tags in openapi.yaml:\n";
foreach (array_keys($tagsAdded) as $tag) {
    echo " - $tag\n";
}
