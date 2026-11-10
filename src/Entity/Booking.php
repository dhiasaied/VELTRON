<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\BookingRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookingRepository::class)]
#[ORM\Table(name: 'booking')]
#[ORM\Index(name: 'idx_booking_barber_start', columns: ['barber', 'starts_at'])]
class Booking
{
    public const STATUS_HELD = 'held';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 12, unique: true)]
    private string $reference;

    #[ORM\Column(length: 32)]
    private string $barber;

    #[ORM\Column(length: 32)]
    private string $service;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $startsAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $endsAt;

    #[ORM\Column(length: 80)]
    private string $customerName;

    #[ORM\Column(length: 32)]
    private string $phone;

    #[ORM\Column(length: 180, nullable: true)]
    private ?string $email = null;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $notes = null;

    #[ORM\Column]
    private int $price;

    #[ORM\Column]
    private int $deposit;

    #[ORM\Column(length: 16)]
    private string $status = self::STATUS_HELD;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(
        string $reference,
        string $barber,
        string $service,
        \DateTimeImmutable $startsAt,
        \DateTimeImmutable $endsAt,
        string $customerName,
        string $phone,
        int $price,
        int $deposit,
    ) {
        $this->reference = $reference;
        $this->barber = $barber;
        $this->service = $service;
        $this->startsAt = $startsAt;
        $this->endsAt = $endsAt;
        $this->customerName = $customerName;
        $this->phone = $phone;
        $this->price = $price;
        $this->deposit = $deposit;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getReference(): string { return $this->reference; }
    public function getBarber(): string { return $this->barber; }
    public function getService(): string { return $this->service; }
    public function getStartsAt(): \DateTimeImmutable { return $this->startsAt; }
    public function getEndsAt(): \DateTimeImmutable { return $this->endsAt; }
    public function getCustomerName(): string { return $this->customerName; }
    public function getPhone(): string { return $this->phone; }
    public function getEmail(): ?string { return $this->email; }
    public function getNotes(): ?string { return $this->notes; }
    public function getPrice(): int { return $this->price; }
    public function getDeposit(): int { return $this->deposit; }
    public function getStatus(): string { return $this->status; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }

    public function setEmail(?string $email): self { $this->email = $email; return $this; }
    public function setNotes(?string $notes): self { $this->notes = $notes; return $this; }
    public function cancel(): self { $this->status = self::STATUS_CANCELLED; return $this; }
}
