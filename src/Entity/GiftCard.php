<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\GiftCardRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GiftCardRepository::class)]
#[ORM\Table(name: 'gift_card')]
class GiftCard
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 16, unique: true)]
    private string $code;

    #[ORM\Column]
    private int $amount;

    #[ORM\Column(length: 80)]
    private string $fromName;

    #[ORM\Column(length: 80)]
    private string $toName;

    #[ORM\Column(length: 180)]
    private string $toEmail;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $message = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $code, int $amount, string $fromName, string $toName, string $toEmail, ?string $message)
    {
        $this->code = $code;
        $this->amount = $amount;
        $this->fromName = $fromName;
        $this->toName = $toName;
        $this->toEmail = $toEmail;
        $this->message = $message;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int { return $this->id; }
    public function getCode(): string { return $this->code; }
    public function getAmount(): int { return $this->amount; }
    public function getFromName(): string { return $this->fromName; }
    public function getToName(): string { return $this->toName; }
    public function getToEmail(): string { return $this->toEmail; }
    public function getMessage(): ?string { return $this->message; }
    public function getCreatedAt(): \DateTimeImmutable { return $this->createdAt; }
}
