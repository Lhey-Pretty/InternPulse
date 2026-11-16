<?php

namespace App\Support;

class AcademicPrograms
{
    /**
     * OJT programs, keyed by the code stored in `skills.category`.
     * Listed from most specific to most generic so "Bachelor of Science in Information
     * Technology" matches BSIT before the generic "science" alias.
     */
    public const PROGRAMS = [
        'BSIT' => ['BS in Information Technology', 'Information Technology'],
        'BSCPE' => ['BS in Computer Engineering', 'Computer Engineering'],
        'BSHM' => ['BS in Hospitality Management', 'Hospitality Management'],
        'BSTM' => ['BS in Tourism Management', 'Tourism Management'],
        'BSCRIM' => ['BS in Criminology', 'Criminology'],
        'FISHERIES' => ['BS in Fisheries', 'Fisheries'],
        'POLSCI' => ['BA in Political Science', 'Political Science'],
        'BEED' => ['Bachelor of Elementary Education', 'Elementary Education'],
        'BSED_MATH' => ['BSED - Major in Mathematics', 'BSED Math', 'Mathematics', 'Math'],
        'BSED_SCIENCE' => ['BSED - Major in Science', 'BSED Science', 'Science'],
        'BSED_ENGLISH' => ['BSED - Major in English', 'BSED English', 'English'],
    ];

    /**
     * Resolve any free-text course/program value ("BS Information Technology",
     * "BSIT", "bsed math") to its canonical program code. Null when unknown.
     */
    public static function code(?string $value): ?string
    {
        $needle = self::loose($value);

        if ($needle === '') {
            return null;
        }

        $needleCore = self::core($needle);

        foreach (self::PROGRAMS as $code => $aliases) {
            $codeLoose = self::loose($code);

            if ($needle === $codeLoose || ($needleCore !== '' && $needleCore === self::core($codeLoose))) {
                return $code;
            }

            foreach ($aliases as $alias) {
                $aliasLoose = self::loose($alias);

                if ($aliasLoose === '' || strlen($aliasLoose) < 4) {
                    continue;
                }

                if ($needle === $aliasLoose) {
                    return $code;
                }

                if ($needleCore !== '' && $needleCore === self::core($aliasLoose)) {
                    return $code;
                }

                if (str_contains($needle, $aliasLoose)) {
                    return $code;
                }
            }
        }

        return null;
    }

    /** Letters and digits only, so "BSED - Major in Math" and "bsed math" compare cleanly. */
    private static function loose(?string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', strtolower((string) $value)) ?? '';
    }

    /** Loose form without filler words; may be empty when the value is all filler. */
    private static function core(string $loose): string
    {
        $words = preg_split('/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/', $loose) ?: [$loose];
        $stopWords = ['bachelor', 'of', 'science', 'arts', 'in', 'bs', 'ba', 'bsed', 'major', 'program', 'degree'];

        return implode('', array_diff($words, $stopWords));
    }
}
