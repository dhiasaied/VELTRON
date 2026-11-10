<?php

declare(strict_types=1);

namespace App\Catalog;

/**
 * Single source of truth for the shop's content: barbers, cuts, lookbook, memberships,
 * products, reviews, FAQ, opening hours and gift amounts. Kept in code (not the database)
 * because it changes rarely and is rendered on every page.
 */
final class ShopCatalog
{
    public const DEPOSIT = 10;
    public const SLOT_STEP_MINUTES = 20;
    public const MIN_LEAD_MINUTES = 30;
    public const BOOKING_HORIZON_DAYS = 14;
    public const GIFT_AMOUNTS = [50, 100, 150];
    /** Pseudo-barber: "first free chair" — the first barber (by chair) free at that time. */
    public const ANY_BARBER = 'any';

    /** @var array<int, array{open: string, close: string}|null> ISO day (1 = Monday) => hours */
    private const HOURS = [
        1 => null,
        2 => ['open' => '10:00', 'close' => '20:00'],
        3 => ['open' => '10:00', 'close' => '20:00'],
        4 => ['open' => '10:00', 'close' => '20:00'],
        5 => ['open' => '10:00', 'close' => '21:00'],
        6 => ['open' => '09:00', 'close' => '18:00'],
        7 => ['open' => '11:00', 'close' => '16:00'],
    ];

    private const BARBERS = [
        ['slug' => 'dre', 'name' => 'Dre', 'chair' => 1, 'role' => 'Owner · Fades', 'years' => 14, 'signature' => 'Skin fades, razor finish', 'tone' => '#c8a26b'],
        ['slug' => 'malik', 'name' => 'Malik', 'chair' => 2, 'role' => 'Curls & tapers', 'years' => 9, 'signature' => 'Curl tapers, textured tops', 'tone' => '#9fb4c7'],
        ['slug' => 'tomas', 'name' => 'Tomás', 'chair' => 3, 'role' => 'Scissors & beards', 'years' => 11, 'signature' => 'Crops, beard sculpts', 'tone' => '#c98b7a'],
        ['slug' => 'yusuf', 'name' => 'Yusuf', 'chair' => 4, 'role' => 'Line-ups & designs', 'years' => 7, 'signature' => 'Freehand parts, line-ups', 'tone' => '#a7c49a'],
    ];

    /** `tool` names the 3D model that follows the cursor over this row (assets/js/world/toolModels.js). */
    private const SERVICES = [
        ['id' => 'skin-fade', 'name' => 'Skin fade', 'minutes' => 45, 'price' => 55, 'tool' => 'clipper', 'blurb' => 'Bald to blended. Finished with a straight razor.'],
        ['id' => 'taper', 'name' => 'Taper', 'minutes' => 40, 'price' => 50, 'tool' => 'trimmer', 'blurb' => 'Clean neckline and sideburns, length kept on top.'],
        ['id' => 'scissor', 'name' => 'Scissor cut', 'minutes' => 50, 'price' => 60, 'tool' => 'scissors', 'blurb' => 'Shears only. Shape that grows out right.'],
        ['id' => 'line-up', 'name' => 'Line-up', 'minutes' => 20, 'price' => 25, 'tool' => 'razor', 'blurb' => 'Edges, hairline and beard line. In and out.'],
        ['id' => 'beard', 'name' => 'Beard sculpt', 'minutes' => 30, 'price' => 35, 'tool' => 'brush', 'blurb' => 'Shape, line and a hot towel to close.'],
        ['id' => 'hot-towel', 'name' => 'Hot-towel shave', 'minutes' => 40, 'price' => 50, 'tool' => 'towel', 'blurb' => 'Two towels, warm lather, single-blade shave.'],
    ];

    /** Lookbook — `style` drives the procedural hair on the 3D bust (assets/js/world/Bust.js). */
    private const LOOKBOOK = [
        ['id' => 'skin-fade-part', 'name' => 'Skin fade + part', 'service' => 'skin-fade', 'barber' => 'dre', 'price' => 55, 'style' => 'fadePart'],
        ['id' => 'curl-taper', 'name' => 'Curl taper', 'service' => 'taper', 'barber' => 'malik', 'price' => 50, 'style' => 'curlTaper'],
        ['id' => 'french-crop', 'name' => 'French crop', 'service' => 'scissor', 'barber' => 'tomas', 'price' => 60, 'style' => 'frenchCrop'],
        ['id' => 'buzz-lineup', 'name' => 'Buzz + line-up', 'service' => 'line-up', 'barber' => 'yusuf', 'price' => 35, 'style' => 'buzz'],
        ['id' => 'textured-quiff', 'name' => 'Textured quiff', 'service' => 'scissor', 'barber' => 'malik', 'price' => 60, 'style' => 'quiff'],
        ['id' => 'slick-taper', 'name' => 'Slick-back taper', 'service' => 'taper', 'barber' => 'dre', 'price' => 50, 'style' => 'slick'],
    ];

    private const PLANS = [
        ['id' => 'line-up-club', 'name' => 'Line-up club', 'price' => 39, 'visits' => 2, 'perks' => ['Two line-ups a month', '10% off products', 'Book 14 days out'], 'featured' => false],
        ['id' => 'fade-club', 'name' => 'Fade club', 'price' => 89, 'visits' => 2, 'perks' => ['Two fades a month', 'Unlimited line-ups', 'Your barber’s Friday chair held'], 'featured' => true],
        ['id' => 'full-chair', 'name' => 'Full chair', 'price' => 159, 'visits' => 4, 'perks' => ['A cut every week', 'Beard + hot towel monthly', 'One guest pass a month'], 'featured' => false],
    ];

    /** `model` names the 3D product on the pedestal (assets/js/world/ProductShelf.js). */
    private const PRODUCTS = [
        ['id' => 'matte-pomade', 'name' => 'Matte pomade', 'size' => '85 g', 'price' => 24, 'model' => 'pomade'],
        ['id' => 'beard-oil', 'name' => 'Beard oil', 'size' => '30 ml', 'price' => 28, 'model' => 'oil'],
        ['id' => 'hair-tonic', 'name' => 'Hair tonic', 'size' => '200 ml', 'price' => 22, 'model' => 'tonic'],
        ['id' => 'chrome-comb', 'name' => 'Chrome-spine comb', 'size' => 'Steel + acetate', 'price' => 18, 'model' => 'comb'],
    ];

    private const REVIEWS = [
        ['quote' => 'Dre fixed a fade another shop wrecked. Booked my next one before I stood up.', 'author' => 'Marcus T.', 'meta' => 'Skin fade · Google'],
        ['quote' => 'Booked at 1 am from my couch, chair was ready at 2:40 the next day. No DMs, no waiting.', 'author' => 'Leo K.', 'meta' => 'Taper · Google'],
        ['quote' => 'Tomás took his time with the beard. Hot towel, straight razor, the whole thing.', 'author' => 'Sami B.', 'meta' => 'Beard sculpt · Google'],
        ['quote' => 'Brought my son for his first real cut. Patient hands, and a text the day before.', 'author' => 'Andre P.', 'meta' => 'Scissor cut · Google'],
    ];

    private const FAQ = [
        ['q' => 'Why a $10 deposit?', 'a' => 'It holds the chair for you and keeps no-shows off the book. It comes off your bill at the chair, every time.'],
        ['q' => 'How do I pay?', 'a' => 'The $10 deposit when you book, the rest at the chair — card, Apple Pay or cash.'],
        ['q' => 'Can I change my time?', 'a' => 'Free up to 12 hours before. Reply to the reminder text or use the link in it.'],
        ['q' => 'Do you take walk-ins?', 'a' => 'When a chair is free, yes. The site shows the next free chair in real time.'],
        ['q' => 'Do you cut kids’ hair?', 'a' => 'Yes — any cut on the menu, any age. Ask for the booster seat.'],
    ];

    /** Photographers of the stock images in public/lookbook and public/barbers (Unsplash License). */
    private const PHOTO_CREDITS = [
        ['name' => 'Marwan Abdalah', 'url' => 'https://unsplash.com/photos/LcUSEG1vnqc'],
        ['name' => 'Amritpal Singh', 'url' => 'https://unsplash.com/photos/wE-GAKR9WaY'],
        ['name' => 'Jorge Salvador', 'url' => 'https://unsplash.com/photos/bBtQtAYes9o'],
        ['name' => 'Megan Bagshaw', 'url' => 'https://unsplash.com/photos/YmaaUNbHHtw'],
        ['name' => 'abdullah ali', 'url' => 'https://unsplash.com/photos/K14HUJmlaWQ'],
        ['name' => 'José Pinto', 'url' => 'https://unsplash.com/photos/yG0Z9OwXWks'],
        ['name' => 'Alyona Grishina', 'url' => 'https://unsplash.com/photos/BBmi4nJjKk8'],
        ['name' => 'Eduardo Cano Photo Co.', 'url' => 'https://unsplash.com/photos/7OO7KJpzlHM'],
        ['name' => 'Himanshu Dewangan', 'url' => 'https://unsplash.com/photos/9SCStDBTjhs'],
        ['name' => 'John. T', 'url' => 'https://unsplash.com/photos/CEdNPh0Fxg8'],
        ['name' => 'Albert Dera', 'url' => 'https://unsplash.com/photos/ILip77SbmOE'],
        ['name' => 'Amir Javadzadeh', 'url' => 'https://unsplash.com/photos/OmlPIy03PGk'],
        ['name' => 'Jeppe Mønster', 'url' => 'https://unsplash.com/photos/T_gTN3Po9RQ'],
        ['name' => 'Chris Knight', 'url' => 'https://unsplash.com/photos/-ucnC7PMDqE'],
        ['name' => 'Mitchell Orr', 'url' => 'https://unsplash.com/photos/X03HwElKqfM'],
        ['name' => 'Ato Aikins', 'url' => 'https://unsplash.com/photos/9ORXOd7g01s'],
    ];

    public function photoCredits(): array { return self::PHOTO_CREDITS; }

    public function barbers(): array { return self::BARBERS; }
    public function services(): array { return self::SERVICES; }
    public function lookbook(): array { return self::LOOKBOOK; }
    public function plans(): array { return self::PLANS; }
    public function products(): array { return self::PRODUCTS; }
    public function reviews(): array { return self::REVIEWS; }
    public function faq(): array { return self::FAQ; }

    public function barber(string $slug): ?array
    {
        foreach (self::BARBERS as $barber) {
            if ($barber['slug'] === $slug) {
                return $barber;
            }
        }

        return null;
    }

    public function service(string $id): ?array
    {
        foreach (self::SERVICES as $service) {
            if ($service['id'] === $id) {
                return $service;
            }
        }

        return null;
    }

    /** @return list<string> barber slugs in chair order */
    public function barberSlugs(): array
    {
        return array_column(self::BARBERS, 'slug');
    }

    /** @return array{open: string, close: string}|null */
    public function hoursFor(\DateTimeInterface $day): ?array
    {
        return self::HOURS[(int) $day->format('N')];
    }

    /** @return list<array{day: string, hours: string, iso: string, open: ?string, close: ?string}> */
    public function weeklyHours(): array
    {
        $labels = [1 => 'Mon', 2 => 'Tue', 3 => 'Wed', 4 => 'Thu', 5 => 'Fri', 6 => 'Sat', 7 => 'Sun'];
        $iso = [1 => 'Monday', 2 => 'Tuesday', 3 => 'Wednesday', 4 => 'Thursday', 5 => 'Friday', 6 => 'Saturday', 7 => 'Sunday'];
        $out = [];
        foreach (self::HOURS as $n => $h) {
            $out[] = [
                'day' => $labels[$n],
                'iso' => $iso[$n],
                'hours' => $h ? $h['open'].' – '.$h['close'] : 'Closed',
                'open' => $h['open'] ?? null,
                'close' => $h['close'] ?? null,
            ];
        }

        return $out;
    }

    /** schema.org BarberShop data so search engines can show hours, address, rating and prices. */
    public function structuredData(): array
    {
        $hours = array_values(array_filter($this->weeklyHours(), static fn (array $h) => null !== $h['open']));

        return [
            '@context' => 'https://schema.org',
            '@type' => 'BarberShop',
            'name' => 'VELTRON',
            'telephone' => '+1-718-555-0142',
            'priceRange' => '$$',
            'address' => [
                '@type' => 'PostalAddress',
                'streetAddress' => '214 Bedford Ave',
                'addressLocality' => 'Brooklyn',
                'addressRegion' => 'NY',
                'postalCode' => '11249',
                'addressCountry' => 'US',
            ],
            'geo' => ['@type' => 'GeoCoordinates', 'latitude' => 40.7175, 'longitude' => -73.9571],
            'aggregateRating' => ['@type' => 'AggregateRating', 'ratingValue' => '4.9', 'reviewCount' => '312'],
            'openingHoursSpecification' => array_map(static fn (array $h) => [
                '@type' => 'OpeningHoursSpecification', 'dayOfWeek' => $h['iso'], 'opens' => $h['open'], 'closes' => $h['close'],
            ], $hours),
            'makesOffer' => array_map(static fn (array $s) => [
                '@type' => 'Offer', 'name' => $s['name'], 'price' => $s['price'], 'priceCurrency' => 'USD',
            ], self::SERVICES),
        ];
    }

    /** Payload shared with the front-end (booking drawer, menu, lookbook, shop). */
    public function toClientPayload(): array
    {
        return [
            'barbers' => self::BARBERS,
            'services' => self::SERVICES,
            'lookbook' => self::LOOKBOOK,
            'products' => self::PRODUCTS,
            'deposit' => self::DEPOSIT,
            'giftAmounts' => self::GIFT_AMOUNTS,
            'horizonDays' => self::BOOKING_HORIZON_DAYS,
        ];
    }
}
