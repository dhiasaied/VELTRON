<?php

declare(strict_types=1);

namespace App\Booking;

use App\Catalog\ShopCatalog;
use Symfony\Component\Validator\Constraints as Assert;

/** Incoming payload for POST /api/gift-cards. */
final class GiftCardRequest
{
    #[Assert\NotNull(message: 'Pick an amount.')]
    #[Assert\Choice(choices: ShopCatalog::GIFT_AMOUNTS, message: 'Pick one of the listed amounts.')]
    public ?int $amount = null;

    #[Assert\NotBlank(message: 'Who is it from?')]
    #[Assert\Length(max: 80)]
    public ?string $fromName = null;

    #[Assert\NotBlank(message: 'Who is it for?')]
    #[Assert\Length(max: 80)]
    public ?string $toName = null;

    #[Assert\NotBlank(message: 'Where do we send it?')]
    #[Assert\Email(message: 'That email looks off.')]
    public ?string $toEmail = null;

    #[Assert\Length(max: 280)]
    public ?string $message = null;

    public static function fromArray(array $data): self
    {
        $r = new self();
        $r->amount = isset($data['amount']) && is_numeric($data['amount']) ? (int) $data['amount'] : null;
        foreach (['fromName', 'toName', 'toEmail', 'message'] as $field) {
            $value = $data[$field] ?? null;
            $r->{$field} = \is_scalar($value) && '' !== trim((string) $value) ? trim((string) $value) : null;
        }

        return $r;
    }
}
