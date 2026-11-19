<?php

namespace App\Support;

class PersonName
{
    /**
     * Lower-case name particles that stay lower-case inside a name.
     *
     * @var list<string>
     */
    private const PARTICLES = ['de', 'del', 'dela', 'las', 'los', 'la', 'le', 'van', 'von', 'da', 'das', 'dos', 'ng'];

    /**
     * Renders a name in Title Case so legacy ALL-CAPS records display like
     * "Angelie Ando Selda" instead of "ANGELIE ANDO SELDA".
     *
     * Words that already use mixed case (e.g. "McDonald", "de la Cruz") are kept
     * as typed; only fully upper-case or fully lower-case words are normalised.
     */
    public static function format(?string $name): string
    {
        $name = trim(preg_replace('/\s+/u', ' ', (string) $name));

        if ($name === '') {
            return '';
        }

        $words = explode(' ', $name);

        foreach ($words as $index => $word) {
            $words[$index] = self::formatWord($word, $index === 0);
        }

        return implode(' ', $words);
    }

    private static function formatWord(string $word, bool $isFirst): string
    {
        if ($word === '') {
            return $word;
        }

        $lower = mb_strtolower($word);

        if (! $isFirst && in_array(trim($lower, '.'), self::PARTICLES, true)) {
            return $lower;
        }

        $isAllCaps = $word === mb_strtoupper($word);
        $isAllLower = $word === $lower;

        if (! $isAllCaps && ! $isAllLower) {
            return $word;
        }

        // Split on hyphens and apostrophes so "O'BRIEN-DELA CRUZ" becomes "O'Brien-Dela Cruz".
        return preg_replace_callback("/(^|[-'’])([a-z])/u", function (array $match): string {
            return $match[1].mb_strtoupper($match[2]);
        }, $lower);
    }
}
