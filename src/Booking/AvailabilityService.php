<?php

declare(strict_types=1);

namespace App\Booking;

use App\Catalog\ShopCatalog;
use App\Repository\BookingRepository;
use Psr\Clock\ClockInterface;

/**
 * Turns opening hours + existing bookings into bookable start times.
 * All times are in the shop's timezone (the app's default timezone, see Kernel::boot()).
 */
final class AvailabilityService
{
    public function __construct(
        private readonly ShopCatalog $catalog,
        private readonly BookingRepository $bookings,
        private readonly ClockInterface $clock,
    ) {
    }

    public function now(): \DateTimeImmutable
    {
        return $this->clock->now()->setTimezone(new \DateTimeZone(date_default_timezone_get()));
    }

    /** Whether $day is within the booking horizon and the shop is open that day. */
    public function isBookableDay(\DateTimeImmutable $day): bool
    {
        $today = $this->now()->setTime(0, 0);
        $day = $day->setTime(0, 0);
        $horizon = $today->modify('+'.ShopCatalog::BOOKING_HORIZON_DAYS.' days');

        return $day >= $today && $day < $horizon && null !== $this->catalog->hoursFor($day);
    }

    /**
     * @return list<array{time: string, label: string, available: bool}>
     */
    public function slotsFor(string $barber, int $minutes, \DateTimeImmutable $day): array
    {
        if (ShopCatalog::ANY_BARBER === $barber) {
            return $this->slotsForAnyBarber($minutes, $day);
        }

        $hours = $this->catalog->hoursFor($day);
        if (null === $hours || !$this->isBookableDay($day)) {
            return [];
        }

        [$oh, $om] = array_map('intval', explode(':', $hours['open']));
        [$ch, $cm] = array_map('intval', explode(':', $hours['close']));
        $open = $day->setTime($oh, $om);
        $close = $day->setTime($ch, $cm);
        $earliest = $this->now()->modify('+'.ShopCatalog::MIN_LEAD_MINUTES.' minutes');

        $busy = $this->bookings->findActiveBetween($barber, $open, $close);

        $slots = [];
        for ($t = $open; $t->modify("+{$minutes} minutes") <= $close; $t = $t->modify('+'.ShopCatalog::SLOT_STEP_MINUTES.' minutes')) {
            $end = $t->modify("+{$minutes} minutes");
            $free = $t >= $earliest;
            if ($free) {
                foreach ($busy as $b) {
                    if ($b->getStartsAt() < $end && $b->getEndsAt() > $t) {
                        $free = false;
                        break;
                    }
                }
            }
            $slots[] = ['time' => $t->format('H:i'), 'label' => $t->format('g:i A'), 'available' => $free];
        }

        return $slots;
    }

    /**
     * "First free chair": a time is available when any barber is free; the slot carries
     * the barber (lowest chair number) who would take it.
     *
     * @return list<array{time: string, label: string, available: bool, barber?: string}>
     */
    private function slotsForAnyBarber(int $minutes, \DateTimeImmutable $day): array
    {
        $merged = [];
        foreach ($this->catalog->barberSlugs() as $slug) {
            foreach ($this->slotsFor($slug, $minutes, $day) as $slot) {
                $t = $slot['time'];
                if (!isset($merged[$t])) {
                    $merged[$t] = ['time' => $t, 'label' => $slot['label'], 'available' => false];
                }
                if ($slot['available'] && !$merged[$t]['available']) {
                    $merged[$t]['available'] = true;
                    $merged[$t]['barber'] = $slug;
                }
            }
        }
        ksort($merged);

        return array_values($merged);
    }

    /** Barber who will take $start for a "first free chair" booking, or null when nobody is free. */
    public function firstFreeBarber(int $minutes, \DateTimeImmutable $start): ?string
    {
        foreach ($this->catalog->barberSlugs() as $slug) {
            if ($this->isSlotFree($slug, $minutes, $start)) {
                return $slug;
            }
        }

        return null;
    }

    public function isSlotFree(string $barber, int $minutes, \DateTimeImmutable $start): bool
    {
        foreach ($this->slotsFor($barber, $minutes, $start) as $slot) {
            if ($slot['time'] === $start->format('H:i')) {
                return $slot['available'];
            }
        }

        return false;
    }

    /**
     * Next open chair across the shop (or for one barber), searched over the coming days.
     *
     * @return array{barber: string, date: string, time: string, label: string, dayLabel: string}|null
     */
    public function nextFree(?string $barber = null, int $minutes = 30): ?array
    {
        $barbers = $barber ? [$barber] : array_column($this->catalog->barbers(), 'slug');
        $today = $this->now()->setTime(0, 0);

        for ($d = 0; $d < ShopCatalog::BOOKING_HORIZON_DAYS; ++$d) {
            $day = $today->modify("+{$d} days");
            $best = null;
            foreach ($barbers as $slug) {
                foreach ($this->slotsFor($slug, $minutes, $day) as $slot) {
                    if ($slot['available']) {
                        if (null === $best || $slot['time'] < $best['time']) {
                            $best = $slot + ['barber' => $slug];
                        }
                        break;
                    }
                }
            }
            if ($best) {
                return [
                    'barber' => $best['barber'],
                    'date' => $day->format('Y-m-d'),
                    'time' => $best['time'],
                    'label' => $best['label'],
                    'dayLabel' => 0 === $d ? 'today' : (1 === $d ? 'tomorrow' : $day->format('l')),
                ];
            }
        }

        return null;
    }

    /** @return list<array{date: string, weekday: string, day: string, month: string, open: bool}> */
    public function calendar(): array
    {
        $today = $this->now()->setTime(0, 0);
        $out = [];
        for ($d = 0; $d < ShopCatalog::BOOKING_HORIZON_DAYS; ++$d) {
            $day = $today->modify("+{$d} days");
            $out[] = [
                'date' => $day->format('Y-m-d'),
                'weekday' => 0 === $d ? 'Today' : $day->format('D'),
                'day' => $day->format('j'),
                'month' => $day->format('M'),
                'open' => null !== $this->catalog->hoursFor($day),
            ];
        }

        return $out;
    }
}
