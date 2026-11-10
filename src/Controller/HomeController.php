<?php

declare(strict_types=1);

namespace App\Controller;

use App\Booking\AvailabilityService;
use App\Catalog\ShopCatalog;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class HomeController extends AbstractController
{
    #[Route('/', name: 'home', methods: ['GET'])]
    public function index(ShopCatalog $catalog, AvailabilityService $availability): Response
    {
        // Real photos win over the rendered 3D busts whenever the files exist.
        $public = $this->getParameter('kernel.project_dir').'/public';
        $lookPhotos = [];
        foreach ($catalog->lookbook() as $look) {
            $lookPhotos[$look['id']] = is_file("$public/lookbook/{$look['id']}-front.jpg") && is_file("$public/lookbook/{$look['id']}-back.jpg");
        }
        $barberPhotos = [];
        foreach ($catalog->barbers() as $barber) {
            $barberPhotos[$barber['slug']] = is_file("$public/barbers/{$barber['slug']}.jpg");
        }

        $now = $availability->now();
        $todayHours = $catalog->hoursFor($now);
        $openNow = $todayHours && $now->format('H:i') >= $todayHours['open'] && $now->format('H:i') < $todayHours['close'];

        return $this->render('home/index.html.twig', [
            'barbers' => $catalog->barbers(),
            'services' => $catalog->services(),
            'lookbook' => $catalog->lookbook(),
            'lookPhotos' => $lookPhotos,
            'barberPhotos' => $barberPhotos,
            'photoCredits' => $catalog->photoCredits(),
            'plans' => $catalog->plans(),
            'products' => $catalog->products(),
            'reviews' => $catalog->reviews(),
            'faq' => $catalog->faq(),
            'hours' => $catalog->weeklyHours(),
            'todayHours' => $todayHours,
            'openNow' => $openNow,
            'giftAmounts' => ShopCatalog::GIFT_AMOUNTS,
            'deposit' => ShopCatalog::DEPOSIT,
            'nextFree' => $availability->nextFree(),
            'clientConfig' => $catalog->toClientPayload(),
            'structuredData' => $catalog->structuredData(),
        ]);
    }
}
