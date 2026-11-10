<?php

declare(strict_types=1);

namespace App\Booking;

use Symfony\Component\Validator\Constraints as Assert;

/** Incoming payload for POST /api/bookings. */
final class BookingRequest
{
    #[Assert\NotBlank(message: 'Pick a cut.')]
    public ?string $service = null;

    #[Assert\NotBlank(message: 'Pick a barber.')]
    public ?string $barber = null;

    #[Assert\NotBlank(message: 'Pick a day.')]
    #[Assert\Date]
    public ?string $date = null;

    #[Assert\NotBlank(message: 'Pick a time.')]
    #[Assert\Regex(pattern: '/^([01]\d|2[0-3]):[0-5]\d$/', message: 'Invalid time.')]
    public ?string $time = null;

    #[Assert\NotBlank(message: 'We need a name for the chair.')]
    #[Assert\Length(min: 2, max: 80)]
    public ?string $name = null;

    #[Assert\NotBlank(message: 'We text the day before — add a number.')]
    #[Assert\Regex(pattern: '/^\+?[0-9 ().-]{7,20}$/', message: 'That phone number looks off.')]
    public ?string $phone = null;

    #[Assert\Email(message: 'That email looks off.')]
    #[Assert\Length(max: 180)]
    public ?string $email = null;

    #[Assert\Length(max: 280)]
    public ?string $notes = null;

    public static function fromArray(array $data): self
    {
        $r = new self();
        foreach (['service', 'barber', 'date', 'time', 'name', 'phone', 'email', 'notes'] as $field) {
            $value = $data[$field] ?? null;
            $r->{$field} = \is_scalar($value) && '' !== trim((string) $value) ? trim((string) $value) : null;
        }

        return $r;
    }
}
