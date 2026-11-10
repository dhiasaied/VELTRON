<?php

declare(strict_types=1);

namespace App\Booking;

use App\Catalog\ShopCatalog;
use App\Entity\Booking;
use App\Entity\GiftCard;
use App\Repository\BookingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Validates and stores bookings and gift cards.
 * Returns either the persisted entity or a field => message error map.
 */
final class BookingService
{
    public function __construct(
        private readonly ShopCatalog $catalog,
        private readonly AvailabilityService $availability,
        private readonly BookingRepository $bookings,
        private readonly EntityManagerInterface $em,
        private readonly ValidatorInterface $validator,
        private readonly ReferenceGenerator $references,
    ) {
    }

    /** @return Booking|array<string, string> */
    public function hold(BookingRequest $request): Booking|array
    {
        $errors = $this->violations($request);
        if ($errors) {
            return $errors;
        }

        $service = $this->catalog->service($request->service);
        $anyBarber = ShopCatalog::ANY_BARBER === $request->barber;
        $barber = $anyBarber ? null : $this->catalog->barber($request->barber);
        if (!$service) {
            return ['service' => 'Unknown cut.'];
        }
        if (!$barber && !$anyBarber) {
            return ['barber' => 'Unknown barber.'];
        }

        $start = \DateTimeImmutable::createFromFormat('!Y-m-d H:i', $request->date.' '.$request->time);
        if (!$start) {
            return ['time' => 'Invalid date or time.'];
        }
        $end = $start->modify('+'.$service['minutes'].' minutes');

        return $this->em->wrapInTransaction(function () use ($request, $service, $barber, $start, $end): Booking|array {
            // "First free chair" resolves to a real barber inside the transaction.
            $slug = $barber['slug'] ?? $this->availability->firstFreeBarber($service['minutes'], $start);
            if (null === $slug || !$this->availability->isSlotFree($slug, $service['minutes'], $start)) {
                return ['time' => 'Someone just took that chair. Pick another time.'];
            }
            $barber = $this->catalog->barber($slug);

            $booking = new Booking(
                $this->uniqueReference(),
                $barber['slug'],
                $service['id'],
                $start,
                $end,
                $request->name,
                $request->phone,
                $service['price'],
                ShopCatalog::DEPOSIT,
            );
            $booking->setEmail($request->email)->setNotes($request->notes);

            $this->em->persist($booking);
            $this->em->flush();

            return $booking;
        });
    }

    /** @return GiftCard|array<string, string> */
    public function issueGiftCard(GiftCardRequest $request): GiftCard|array
    {
        $errors = $this->violations($request);
        if ($errors) {
            return $errors;
        }

        $card = new GiftCard(
            $this->references->generate('GIFT', 8),
            $request->amount,
            $request->fromName,
            $request->toName,
            $request->toEmail,
            $request->message,
        );
        $this->em->persist($card);
        $this->em->flush();

        return $card;
    }

    public function serialize(Booking $b): array
    {
        $service = $this->catalog->service($b->getService());
        $barber = $this->catalog->barber($b->getBarber());

        return [
            'reference' => $b->getReference(),
            'status' => $b->getStatus(),
            'service' => $service['name'] ?? $b->getService(),
            'barber' => $barber['name'] ?? $b->getBarber(),
            'chair' => $barber['chair'] ?? null,
            'date' => $b->getStartsAt()->format('Y-m-d'),
            'dateLabel' => $b->getStartsAt()->format('l, M j'),
            'time' => $b->getStartsAt()->format('H:i'),
            'timeLabel' => $b->getStartsAt()->format('g:i A'),
            'endsLabel' => $b->getEndsAt()->format('g:i A'),
            'price' => $b->getPrice(),
            'deposit' => $b->getDeposit(),
            'reminder' => $b->getStartsAt()->modify('-1 day')->format('l').' at 6:00 PM',
            'name' => $b->getCustomerName(),
        ];
    }

    /** @return array<string, string> */
    private function violations(object $request): array
    {
        $errors = [];
        foreach ($this->validator->validate($request) as $violation) {
            $errors[$violation->getPropertyPath()] ??= (string) $violation->getMessage();
        }

        return $errors;
    }

    private function uniqueReference(): string
    {
        do {
            $ref = $this->references->generate('VT');
        } while ($this->bookings->findOneByReference($ref));

        return $ref;
    }
}
