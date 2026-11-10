<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Booking;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/** @extends ServiceEntityRepository<Booking> */
class BookingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Booking::class);
    }

    /** @return list<Booking> Active bookings for a barber that intersect [$from, $to). */
    public function findActiveBetween(string $barber, \DateTimeImmutable $from, \DateTimeImmutable $to): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.barber = :barber')
            ->andWhere('b.status = :status')
            ->andWhere('b.startsAt < :to')
            ->andWhere('b.endsAt > :from')
            ->setParameter('barber', $barber)
            ->setParameter('status', Booking::STATUS_HELD)
            ->setParameter('from', $from)
            ->setParameter('to', $to)
            ->orderBy('b.startsAt', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function hasOverlap(string $barber, \DateTimeImmutable $start, \DateTimeImmutable $end): bool
    {
        return [] !== $this->findActiveBetween($barber, $start, $end);
    }

    public function findOneByReference(string $reference): ?Booking
    {
        return $this->findOneBy(['reference' => strtoupper($reference)]);
    }
}
