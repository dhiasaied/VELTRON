<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;

    public function boot(): void
    {
        parent::boot();

        // Every booking time is expressed in the shop's local time.
        date_default_timezone_set((string) $this->getContainer()->getParameter('app.shop_timezone'));
    }
}
