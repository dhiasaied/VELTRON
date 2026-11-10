<?php

declare(strict_types=1);

namespace App\Tests\Api;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class BookingApiTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
    }

    public function testHomePageRendersTheStage(): void
    {
        $this->client->request('GET', '/');
        self::assertResponseIsSuccessful();
        self::assertSelectorExists('canvas[data-webgl]');
        self::assertSelectorExists('[data-anchor="chair"]');
        self::assertSelectorCount(4, '[data-mirror]');
        self::assertSelectorCount(6, '[data-service-row]');
    }

    public function testBookingHappyPathThenConflict(): void
    {
        [$date, $time] = $this->firstFreeSlot('malik', 'skin-fade');
        $payload = ['service' => 'skin-fade', 'barber' => 'malik', 'date' => $date, 'time' => $time, 'name' => 'Sam Test', 'phone' => '+1 555 010 2030'];

        $first = $this->postJson('/api/bookings', $payload);
        self::assertResponseStatusCodeSame(201);
        self::assertMatchesRegularExpression('/^VT-[A-Z0-9]{6}$/', $first['booking']['reference']);
        self::assertSame(10, $first['booking']['deposit']);

        $this->postJson('/api/bookings', ['name' => 'Someone Else'] + $payload);
        self::assertResponseStatusCodeSame(409);

        $this->client->request('GET', '/api/bookings/'.$first['booking']['reference'].'.ics');
        self::assertResponseIsSuccessful();
        self::assertStringContainsString('BEGIN:VEVENT', (string) $this->client->getResponse()->getContent());

        // The taken slot is no longer offered.
        $this->client->request('GET', '/api/availability?'.http_build_query(['barber' => 'malik', 'service' => 'skin-fade', 'date' => $date]));
        $slots = json_decode((string) $this->client->getResponse()->getContent(), true)['slots'];
        $taken = array_values(array_filter($slots, fn ($s) => $s['time'] === $time));
        self::assertFalse($taken[0]['available']);
    }

    public function testFirstFreeChairAssignsARealBarber(): void
    {
        [$date, $time] = $this->firstFreeSlot('any', 'line-up');
        $body = $this->postJson('/api/bookings', ['service' => 'line-up', 'barber' => 'any', 'date' => $date, 'time' => $time, 'name' => 'Any Chair', 'phone' => '+1 555 010 9999']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame('Dre', $body['booking']['barber']); // chair 01 is first when everyone is free
        self::assertSame(1, $body['booking']['chair']);

        // Next "any" booking at the same time goes to chair 02.
        $second = $this->postJson('/api/bookings', ['service' => 'line-up', 'barber' => 'any', 'date' => $date, 'time' => $time, 'name' => 'Second', 'phone' => '+1 555 010 8888']);
        self::assertResponseStatusCodeSame(201);
        self::assertSame(2, $second['booking']['chair']);
    }

    public function testValidationErrors(): void
    {
        $body = $this->postJson('/api/bookings', ['service' => 'skin-fade', 'barber' => 'nobody', 'date' => 'x', 'time' => '99:99', 'phone' => 'abc']);
        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('time', $body['errors']);
        self::assertArrayHasKey('name', $body['errors']);
        self::assertArrayHasKey('phone', $body['errors']);
    }

    public function testGiftCard(): void
    {
        $ok = $this->postJson('/api/gift-cards', ['amount' => 150, 'fromName' => 'A', 'toName' => 'B', 'toEmail' => 'b@example.test']);
        self::assertResponseStatusCodeSame(201);
        self::assertStringStartsWith('GIFT-', $ok['giftCard']['code']);

        $bad = $this->postJson('/api/gift-cards', ['amount' => 42, 'fromName' => 'A', 'toName' => 'B', 'toEmail' => 'nope']);
        self::assertResponseStatusCodeSame(422);
        self::assertArrayHasKey('amount', $bad['errors']);
    }

    /** @return array{0: string, 1: string} */
    private function firstFreeSlot(string $barber, string $service): array
    {
        $this->client->request('GET', '/api/calendar');
        foreach (json_decode((string) $this->client->getResponse()->getContent(), true)['days'] as $day) {
            if (!$day['open']) {
                continue;
            }
            $this->client->request('GET', '/api/availability?'.http_build_query(['barber' => $barber, 'service' => $service, 'date' => $day['date']]));
            foreach (json_decode((string) $this->client->getResponse()->getContent(), true)['slots'] as $slot) {
                if ($slot['available']) {
                    return [$day['date'], $slot['time']];
                }
            }
        }
        self::fail('No free slot found in the booking horizon.');
    }

    private function postJson(string $url, array $payload): array
    {
        $this->client->request('POST', $url, server: ['CONTENT_TYPE' => 'application/json'], content: json_encode($payload));

        return json_decode((string) $this->client->getResponse()->getContent(), true) ?? [];
    }
}
