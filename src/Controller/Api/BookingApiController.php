<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Booking\AvailabilityService;
use App\Booking\BookingRequest;
use App\Booking\BookingService;
use App\Booking\GiftCardRequest;
use App\Catalog\ShopCatalog;
use App\Entity\Booking;
use App\Repository\BookingRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api', name: 'api_')]
final class BookingApiController extends AbstractController
{
    public function __construct(
        private readonly ShopCatalog $catalog,
        private readonly AvailabilityService $availability,
        private readonly BookingService $bookingService,
    ) {
    }

    #[Route('/catalog', name: 'catalog', methods: ['GET'])]
    public function catalog(): JsonResponse
    {
        return $this->json($this->catalog->toClientPayload() + ['calendar' => $this->availability->calendar()]);
    }

    #[Route('/calendar', name: 'calendar', methods: ['GET'])]
    public function calendar(): JsonResponse
    {
        return $this->json(['days' => $this->availability->calendar()]);
    }

    #[Route('/availability', name: 'availability', methods: ['GET'])]
    public function availability(Request $request): JsonResponse
    {
        $slug = (string) $request->query->get('barber');
        $barberOk = ShopCatalog::ANY_BARBER === $slug || null !== $this->catalog->barber($slug);
        $service = $this->catalog->service((string) $request->query->get('service', 'skin-fade'));
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', (string) $request->query->get('date'));

        if (!$barberOk || !$service || !$date) {
            return $this->json(['error' => 'barber (slug or "any"), service and date (Y-m-d) are required.'], Response::HTTP_BAD_REQUEST);
        }

        $slots = $this->availability->slotsFor($slug, $service['minutes'], $date);

        return $this->json([
            'barber' => $slug,
            'service' => $service['id'],
            'date' => $date->format('Y-m-d'),
            'open' => $this->availability->isBookableDay($date),
            'slots' => $slots,
        ]);
    }

    #[Route('/next-free', name: 'next_free', methods: ['GET'])]
    public function nextFree(Request $request): JsonResponse
    {
        $barber = $request->query->get('barber');
        if (null !== $barber && !$this->catalog->barber((string) $barber)) {
            return $this->json(['error' => 'Unknown barber.'], Response::HTTP_BAD_REQUEST);
        }

        if ('all' === $request->query->get('scope')) {
            $out = [];
            foreach ($this->catalog->barbers() as $b) {
                $out[$b['slug']] = $this->availability->nextFree($b['slug']);
            }

            return $this->json(['barbers' => $out]);
        }

        return $this->json(['next' => $this->availability->nextFree($barber ? (string) $barber : null)]);
    }

    #[Route('/bookings', name: 'bookings_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $result = $this->bookingService->hold(BookingRequest::fromArray($this->payload($request)));

        if (\is_array($result)) {
            $status = isset($result['time']) && str_starts_with($result['time'], 'Someone') ? Response::HTTP_CONFLICT : Response::HTTP_UNPROCESSABLE_ENTITY;

            return $this->json(['errors' => $result], $status);
        }

        return $this->json(['booking' => $this->bookingService->serialize($result)], Response::HTTP_CREATED);
    }

    #[Route('/bookings/{reference}', name: 'bookings_show', methods: ['GET'], requirements: ['reference' => 'VT-[A-Za-z0-9]{6}'])]
    public function show(string $reference, BookingRepository $bookings): JsonResponse
    {
        $booking = $bookings->findOneByReference($reference);
        if (!$booking) {
            return $this->json(['error' => 'Booking not found.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json(['booking' => $this->bookingService->serialize($booking)]);
    }

    #[Route('/bookings/{reference}.ics', name: 'bookings_ics', methods: ['GET'], requirements: ['reference' => 'VT-[A-Za-z0-9]{6}'], priority: 1)]
    public function ics(string $reference, BookingRepository $bookings): Response
    {
        $booking = $bookings->findOneByReference($reference);
        if (!$booking || Booking::STATUS_HELD !== $booking->getStatus()) {
            throw $this->createNotFoundException();
        }

        $data = $this->bookingService->serialize($booking);
        $utc = new \DateTimeZone('UTC');
        $fmt = static fn (\DateTimeImmutable $d) => $d->setTimezone($utc)->format('Ymd\THis\Z');

        $ics = implode("\r\n", [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//VELTRON//Booking//EN',
            'BEGIN:VEVENT',
            'UID:'.$booking->getReference().'@veltron.local',
            'DTSTAMP:'.$fmt(new \DateTimeImmutable()),
            'DTSTART:'.$fmt($booking->getStartsAt()),
            'DTEND:'.$fmt($booking->getEndsAt()),
            'SUMMARY:'.$data['service'].' with '.$data['barber'].' — VELTRON',
            'DESCRIPTION:Chair '.$data['chair'].'. Ref '.$booking->getReference().'. $'.$data['deposit'].' deposit held.',
            'LOCATION:VELTRON, 214 Orchard St',
            'END:VEVENT',
            'END:VCALENDAR',
            '',
        ]);

        return new Response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="veltron-'.$booking->getReference().'.ics"',
        ]);
    }

    #[Route('/gift-cards', name: 'gift_cards_create', methods: ['POST'])]
    public function gift(Request $request): JsonResponse
    {
        $result = $this->bookingService->issueGiftCard(GiftCardRequest::fromArray($this->payload($request)));
        if (\is_array($result)) {
            return $this->json(['errors' => $result], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        return $this->json(['giftCard' => [
            'code' => $result->getCode(),
            'amount' => $result->getAmount(),
            'toName' => $result->getToName(),
            'toEmail' => $result->getToEmail(),
        ]], Response::HTTP_CREATED);
    }

    private function payload(Request $request): array
    {
        try {
            $data = $request->toArray();
        } catch (\Throwable) {
            $data = $request->request->all();
        }

        return \is_array($data) ? $data : [];
    }
}
