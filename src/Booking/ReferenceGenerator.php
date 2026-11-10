<?php

declare(strict_types=1);

namespace App\Booking;

/** Short, human-readable codes without ambiguous characters (no 0/O, 1/I). */
final class ReferenceGenerator
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public function generate(string $prefix, int $length = 6): string
    {
        $code = '';
        for ($i = 0; $i < $length; ++$i) {
            $code .= self::ALPHABET[random_int(0, \strlen(self::ALPHABET) - 1)];
        }

        return $prefix.'-'.$code;
    }
}
