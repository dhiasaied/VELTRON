<?php

declare(strict_types=1);

namespace App\Command;

use App\Booking\AvailabilityService;
use App\Booking\ReferenceGenerator;
use App\Catalog\ShopCatalog;
use App\Entity\Booking;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(name: 'app:seed-demo', description: 'Fill the coming days with realistic demo bookings so the calendar looks lived-in.')]
final class SeedDemoBookingsCommand extends Command
{
    private const NAMES = ['Jay R.', 'Marcus T.', 'Leo K.', 'Sami B.', 'Andre P.', 'Chris W.', 'Omar H.', 'Ben L.', 'Theo M.', 'Karim A.'];

    public function __construct(
        private readonly ShopCatalog $catalog,
        private readonly AvailabilityService $availability,
        private readonly EntityManagerInterface $em,
        private readonly ReferenceGenerator $references,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('days', null, InputOption::VALUE_REQUIRED, 'How many days ahead to fill', '7')
            ->addOption('density', null, InputOption::VALUE_REQUIRED, 'Share of slots to book (0-1)', '0.45');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $days = max(1, (int) $input->getOption('days'));
        $density = min(0.9, max(0.0, (float) $input->getOption('density')));
        $services = $this->catalog->services();
        $today = $this->availability->now()->setTime(0, 0);
        $count = 0;

        for ($d = 0; $d < $days; ++$d) {
            $day = $today->modify("+{$d} days");
            foreach ($this->catalog->barbers() as $barber) {
                $service = $services[array_rand($services)];
                foreach ($this->availability->slotsFor($barber['slug'], $service['minutes'], $day) as $slot) {
                    if (!$slot['available'] || mt_rand() / mt_getrandmax() > $density / 2) {
                        continue;
                    }
                    $start = \DateTimeImmutable::createFromFormat('!Y-m-d H:i', $day->format('Y-m-d').' '.$slot['time']);
                    if (!$this->availability->isSlotFree($barber['slug'], $service['minutes'], $start)) {
                        continue;
                    }
                    $this->em->persist(new Booking(
                        $this->references->generate('VT'),
                        $barber['slug'],
                        $service['id'],
                        $start,
                        $start->modify('+'.$service['minutes'].' minutes'),
                        self::NAMES[array_rand(self::NAMES)],
                        '+1 555 0'.random_int(100, 199).' '.random_int(1000, 9999),
                        $service['price'],
                        ShopCatalog::DEPOSIT,
                    ));
                    $this->em->flush();
                    ++$count;
                    $service = $services[array_rand($services)];
                }
            }
        }

        $io->success(sprintf('Seeded %d demo bookings over %d days.', $count, $days));

        return Command::SUCCESS;
    }
}
