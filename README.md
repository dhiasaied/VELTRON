# VELTRON

> A cinematic, real-time 3D barbershop website with live online booking, built on Symfony 7.4 LTS and Three.js.

![PHP](https://img.shields.io/badge/PHP-%E2%89%A5%208.2-777BB4?logo=php&logoColor=white)
![Symfony](https://img.shields.io/badge/Symfony-7.4%20LTS-000000?logo=symfony&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-0.187-000000?logo=three.js&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.15-88CE02?logo=greensock&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-Doctrine%20ORM-003B57?logo=sqlite&logoColor=white)

---

## Table of Contents

- [Overview](#overview)
- [Project Objectives](#project-objectives)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [UI/UX Design](#uiux-design)
- [Project Architecture](#project-architecture)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Screenshots & Preview](#screenshots--preview)
- [Video Presentation](#video-presentation)
- [Performance & Optimization](#performance--optimization)
- [Responsive Design](#responsive-design)
- [Security](#security)
- [Future Improvements](#future-improvements)
- [Author](#author)
- [License](#license)

---

## Overview

**VELTRON** is a single-page website for a fictional Brooklyn barbershop. It pairs an
immersive, scroll-driven 3D experience with a fully working booking system.

Visitors are greeted by a hair-textured opening sequence in which a clipper "shaves" a lane to reveal
a real-time 3D barber chair lit by a spotlight that follows the cursor. They can then browse the price
list, the barbers and a front/back lookbook, explore memberships and products, and book a chair in
under a minute. The client picks the cut, the barber (or the first free chair) and the time, then holds
the slot with a $10 deposit.

Every 3D object (chair, barber tools, products, gift card) is built procedurally in code. The
textures are generated in the browser at start-up, so the experience downloads no 3D models.

---

## Project Objectives

- **Remove friction from booking.** Replace late-night DMs and phone calls with a self-service flow
  showing real availability per barber.
- **Deliver a premium, memorable brand experience.** Use real-time 3D, cinematic lighting and smooth,
  scroll-linked motion to set the shop apart.
- **Stay fast on every device.** Adapt rendering quality to the device and pause work that isn't on screen.
- **Keep the stack lean and maintainable.** No Node.js build step: front-end modules are served
  through Symfony AssetMapper and an import map.
- **Keep content in one place.** Barbers, services, prices, hours, plans, products, reviews and FAQ
  all come from a single catalog class.

---

## Features

### Immersive 3D experience

| Section | What happens |
|---|---|
| **Intro** | A full-screen hair texture (2D canvas) with the wordmark. A clipper trailing a glowing cord sweeps across, shaves a lane that reveals the live 3D scene, the hair falls away and the words fly into the hero. |
| **Hero** | A procedural hydraulic barber chair with diamond-tufted leather and chrome, lit by a spotlight that tracks the pointer. Includes a volumetric light beam, floating dust motes and soft shadows. Drag to rotate the chair. The giant wordmark is lit from wherever the beam lands. |
| **Price list** | Hovering a service row brings up a matching 3D tool (clipper, trimmer, scissors, straight razor, shaving brush, hot towel) that follows the cursor. |
| **Manifesto** | An alarm clock, a pomade tin and a spray bottle orbit the headline; a stat pill cycles through key numbers. |
| **Shop** | Each product (pomade, beard oil, hair tonic, comb) is a live 3D model on a spotlit plinth that turns slowly and can be dragged. |
| **Gift card** | A brushed-metal card that tilts toward the pointer and flips when the amount changes. |

### Booking & business features

- **Four-step booking drawer:** service → barber or *First free chair* → day and time → contact
  details → confirmation.
- **Live availability** computed from opening hours, slot length, lead time and existing bookings.
- **"First free chair"** automatically assigns the lowest-numbered barber who is free at the chosen time.
- **Double-booking protection:** the overlap check runs inside a database transaction and returns
  `409 Conflict` when a slot was just taken.
- **Calendar export:** each confirmed booking can be downloaded as an `.ics` file.
- **Gift cards:** amounts of $50, $100 or $150, sent to a recipient and stored with a unique code.
- **Pick-up bag:** shop products added by the visitor are attached to the notes of their next booking.
- **Live "next free chair" indicators** in the hero, on each barber card and in the footer.

### Content sections

Barbers ("Four mirrors"), lookbook with barber filter and front/back views, membership plans,
reviews deck with an animated rating, a stylised map with an animated walking route, FAQ accordion,
hiring strip and footer.

### Developer tooling

- `app:seed-demo` console command that fills the coming days with realistic demo bookings.
- Functional API tests with PHPUnit (`tests/Api/BookingApiTest.php`).
- schema.org `BarberShop` structured data (hours, address, rating, prices) for search engines.

---

## Technologies Used

### Back end

| Technology | Version | Role |
|---|---|---|
| PHP | ≥ 8.2 | Runtime |
| Symfony Framework | 7.4 LTS | HTTP kernel, routing, DI, console |
| Twig | 3.x | Server-side templates (one partial per section) |
| Doctrine ORM + Migrations | ORM 3.x | Persistence for bookings and gift cards |
| SQLite | — | Default database (`var/data_<env>.db`) |
| Symfony Validator | 7.4 | Request validation (booking & gift card DTOs) |
| Symfony Clock | 7.4 | Testable "now" for availability |
| Symfony AssetMapper | 7.4 | Serves ES modules and CSS via an import map (no bundler) |

### Front end

| Technology | Version | Role |
|---|---|---|
| Three.js | 0.187.0 | WebGL rendering, PBR materials, lights, shadows |
| GSAP + ScrollTrigger | 3.15.1 | Timelines, scroll-linked animation, micro-interactions |
| Lenis | 1.3.27 | Smooth scrolling, driven by the GSAP ticker |
| Canvas 2D | — | Intro hair field, clipper and procedural textures |
| Google Fonts | — | Sora, Inter, JetBrains Mono |

### Testing

| Tool | Role |
|---|---|
| PHPUnit 11 + Symfony PHPUnit Bridge | Test runner |
| Symfony BrowserKit / CssSelector | Functional HTTP tests |

---

## UI/UX Design

- **Visual language:** a dark, cinematic palette (`#0a0a0b` ink, `#ebeae6` paper, `#ece9e2` bone)
  that alternates dark and light sections, with black-and-white photography and chrome accents.
- **Typography:** *Sora* for display (light/bold pairing), *Inter* for body text and *JetBrains Mono*
  for small uppercase labels.
- **Motion:** expo-out easing, staggered reveals, scrubbed scroll timelines, magnetic buttons, and a
  custom cursor that grows into contextual labels (*Book*, *Turn*, *Tilt*, *Spin*).
- **Interaction feedback:** the active price row inverts its *Book* pill, lookbook cards tilt and
  catch a moving key light, and confirmation screens animate a signature stroke.
- **Accessibility:**
  - semantic sections with headings and ARIA labels
  - `role="dialog"` drawers with focus trapping and *Escape* to close
  - keyboard-reachable cards
  - visible focus styles
  - `prefers-reduced-motion` support (native scrolling, simplified intro, no CSS motion)

---

## Project Architecture

```
┌──────────────────────────── Browser ────────────────────────────┐
│  Twig-rendered HTML  ──►  app.js (ES modules via import map)     │
│                                                                  │
│  Experience (Three.js) ◄── anchors ── DOM sections               │
│     ├─ ChairStage   ├─ CursorTool   ├─ Tools                     │
│     ├─ ProductShelf └─ GiftCard                                  │
│  SmoothScroll (Lenis) + choreography (GSAP ScrollTrigger)        │
│  UI: Intro · BookingDrawer · GiftModal · sections · Cursor       │
│            │ fetch (JSON)                                        │
└────────────┼─────────────────────────────────────────────────────┘
             ▼
┌──────────────────────────── Symfony ────────────────────────────┐
│  HomeController ──► Twig templates                               │
│  BookingApiController (/api/*)                                   │
│     ├─ AvailabilityService ──► BookingRepository                 │
│     ├─ BookingService (validation + transaction)                 │
│     └─ ShopCatalog (barbers, services, hours, plans, …)          │
│  Doctrine ORM ──► SQLite                                         │
└──────────────────────────────────────────────────────────────────┘
```

**DOM-anchored 3D.** A single fixed, transparent WebGL canvas sits above the section backgrounds.
Every 3D group is anchored to a DOM element: each frame, its world position is derived from that
element's `getBoundingClientRect()`. Objects therefore scroll exactly with their sections, and CSS
(`position: sticky`) decides when the chair holds still. One GSAP ticker drives Lenis, ScrollTrigger
and the WebGL frame together, so they never drift apart.

### HTTP API

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | The website |
| `GET` | `/api/catalog` | Barbers, services, lookbook, products, deposit and 14-day calendar |
| `GET` | `/api/calendar` | The next 14 days with open/closed flags |
| `GET` | `/api/availability?barber=&service=&date=` | Slots for a barber (or `any`) on a date (`Y-m-d`) |
| `GET` | `/api/next-free[?barber=][&scope=all]` | Next open chair overall, per barber, or for all barbers |
| `POST` | `/api/bookings` | Create a booking: `201`, `409` if the slot was taken, `422` on validation errors |
| `GET` | `/api/bookings/{reference}` | Booking details |
| `GET` | `/api/bookings/{reference}.ics` | Calendar file for a held booking |
| `POST` | `/api/gift-cards` | Issue a gift card: `201` or `422` |

Example booking request:

```json
POST /api/bookings
{
  "service": "skin-fade",
  "barber": "any",
  "date": "2026-11-10",
  "time": "14:40",
  "name": "Jordan Doe",
  "phone": "+1 555 010 2030",
  "email": "jordan@example.com",
  "notes": "Low fade, keep length on top"
}
```

---

## Installation

### Prerequisites

- PHP **8.2 or higher** with the `pdo_sqlite`, `ctype` and `iconv` extensions
- [Composer](https://getcomposer.org/) 2
- Optional: [Symfony CLI](https://symfony.com/download) for the local web server
- No Node.js or npm required

### Steps

```bash
# 1. Install PHP dependencies
composer install

# 2. Download the front-end packages declared in importmap.php (three, gsap, lenis)
php bin/console importmap:install

# 3. Create the SQLite database schema
php bin/console doctrine:migrations:migrate --no-interaction

# 4. (Optional) Fill the next 7 days with demo bookings
php bin/console app:seed-demo
```

---

## Getting Started

Start a local web server with **either** option:

```bash
# Symfony CLI (serves on https://127.0.0.1:8000 by default)
symfony server:start
```

```bash
# PHP built-in server
php -S 127.0.0.1:8010 -t public public/index.php
```

Then open the URL shown in your terminal (for the built-in server: `http://127.0.0.1:8010`).

### Useful commands

| Command | Purpose |
|---|---|
| `php bin/phpunit` | Run the functional API test suite |
| `php bin/console app:seed-demo --days=7 --density=0.45` | Seed demo bookings (density 0–0.9) |
| `php bin/console debug:router` | List all routes |
| `php bin/console lint:twig templates` | Validate Twig templates |
| `php bin/console asset-map:compile` | Compile versioned assets for production |
| `composer audit` | Check dependencies for known vulnerabilities |

### Production build

```bash
composer install --no-dev --optimize-autoloader
APP_ENV=prod php bin/console importmap:install
APP_ENV=prod php bin/console asset-map:compile
APP_ENV=prod php bin/console doctrine:migrations:migrate --no-interaction
```

Set a strong `APP_SECRET` and `APP_ENV=prod` in `.env.local` (or real environment variables) first.

---

## Project Structure

```
veltron/
├── assets/
│   ├── app.js                    # Entry point (imported through the import map)
│   ├── styles/
│   │   ├── app.css               # Tokens, base, buttons, nav, drawer, modal
│   │   ├── sections.css          # Every page section + responsive rules
│   │   └── intro.css             # Opening sequence
│   └── js/
│       ├── App.js                # Boot: intro → WebGL world → UI → reveal
│       ├── api.js                # JSON client for /api/*
│       ├── core/                 # Experience (renderer, anchors), Quality tiers, Pointer
│       ├── world/                # BarberChair, ChairStage, LightBeam, CursorTool, Tools,
│       │                         # ProductShelf, GiftCard, Bust, toolModels, materials, textures
│       ├── scroll/               # SmoothScroll (Lenis), choreography (ScrollTrigger)
│       └── ui/                   # Intro, BookingDrawer, GiftModal, sections, Cursor, Magnetic…
├── config/                       # Symfony configuration (Doctrine, AssetMapper, services…)
├── migrations/                   # Doctrine migrations
├── public/
│   ├── index.php                 # Front controller
│   ├── lookbook/                 # Lookbook photos ({cut-id}-front.jpg / -back.jpg)
│   └── barbers/                  # Barber station photos ({slug}.jpg)
├── src/
│   ├── Booking/                  # AvailabilityService, BookingService, request DTOs, ReferenceGenerator
│   ├── Catalog/ShopCatalog.php   # Single source of truth for shop content
│   ├── Command/                  # app:seed-demo
│   ├── Controller/               # HomeController, Api/BookingApiController
│   ├── Entity/                   # Booking, GiftCard
│   └── Repository/               # BookingRepository, GiftCardRepository
├── templates/
│   ├── base.html.twig
│   ├── home/index.html.twig
│   ├── components/               # nav, intro, cursor, booking drawer, gift modal, structured data
│   └── sections/                 # hero, services, manifesto, barbers, lookbook, club, shop,
│                                 # gift, reviews, visit, faq, footer
├── tests/Api/BookingApiTest.php
├── importmap.php                 # Front-end dependencies (three, gsap, lenis)
└── composer.json
```

---

## Configuration

### Environment variables

| Variable | Default (`.env`) | Description |
|---|---|---|
| `APP_ENV` | `dev` | Symfony environment (`dev`, `test`, `prod`) |
| `APP_SECRET` | `change_me_in_env_local` | **Must** be replaced with a random secret outside development |
| `DATABASE_URL` | `sqlite:///%kernel.project_dir%/var/data_%kernel.environment%.db` | Doctrine connection (one SQLite file per environment) |
| `SHOP_TIMEZONE` | `America/New_York` | Time zone used for hours, slots, reminders and calendar files |
| `DEFAULT_URI` | `http://localhost` | Base URI for URLs generated outside HTTP requests |

Override values locally in `.env.local`, which is git-ignored.

### Shop content

All business content lives in **`src/Catalog/ShopCatalog.php`**:

| Setting | Current value |
|---|---|
| Barbers | Dre, Malik, Tomás, Yusuf (chairs 1–4) |
| Services | Skin fade, Taper, Scissor cut, Line-up, Beard sculpt, Hot-towel shave |
| Opening hours | Tue–Thu 10:00–20:00 · Fri 10:00–21:00 · Sat 09:00–18:00 · Sun 11:00–16:00 · Mon closed |
| Deposit | $10 |
| Slot step / minimum lead time | 20 minutes / 30 minutes |
| Booking horizon | 14 days |
| Gift card amounts | $50, $100, $150 |

It also defines the lookbook, membership plans, products, reviews, FAQ and photo credits.

### Photos

- **Lookbook:** `public/lookbook/{cut-id}-front.jpg` and `{cut-id}-back.jpg` (4:5). If a pair is
  missing, that card falls back to a 3D bust rendered in the browser.
- **Barbers:** `public/barbers/{slug}.jpg`. If missing, the mirror shows a rendered bust instead.

---

## Screenshots & Preview

No screenshots are included in the repository yet. To preview the project, run it locally (see
[Getting Started](#getting-started)).

To add screenshots to this README, place images in a `docs/screenshots/` folder and reference them:

```markdown
![Hero — 3D chair under the spotlight](docs/screenshots/hero.png)
```

---

## Video Presentation

No video presentation of this project is included in the repository.

The structure, pacing and visual concept were inspired by an Instagram reel by web designer
**aimen.webs**: <https://www.instagram.com/reel/DfWto51AVp0/>. The implementation, brand, copy
and 3D assets in this project are original.

---

## Performance & Optimization

- **Device quality tiers** (`assets/js/core/Quality.js`) adapt pixel ratio, shadow-map size and
  particle and hair-strand counts:

  | Tier | Max pixel ratio | Shadow map | Dust particles |
  |---|---|---|---|
  | High | 1.75 | 2048 | 700 |
  | Mid | 1.5 | 1024 | 380 |
  | Low | 1.25 | 512 | 180 |

- **Adaptive resolution:** the renderer lowers its pixel ratio if average frame time stays above ~24 ms.
- **Render on demand:** WebGL rendering pauses when no 3D section is on screen or the tab is hidden.
- **Zero model downloads:** all geometry and textures are procedural and generated once at start-up.
- **Shader warm-up:** `renderer.compile()` runs during the intro to avoid first-frame stutters.
- **Lazy media:** lookbook back photos load only as their cards approach the viewport. Images use
  `loading="lazy"` and `decoding="async"`, and the 3D bust renderer is loaded on demand only for
  missing photos.
- **No bundler overhead:** native ES modules through the import map, with versioned file names in
  production (`asset-map:compile`).
- **Stable mobile layout:** mobile toolbar height changes are ignored to avoid canvas resize jitter.

---

## Responsive Design

| Breakpoint | Adjustments |
|---|---|
| **> 1100 px** | Full desktop layout: centred navigation, 4-column product grid, detailed service rows |
| **≤ 1100 px** | Service descriptions hidden, 2-column product grid |
| **≤ 860 px** | Mobile navigation (logo + *Book*), re-composed hero, swipeable barber mirrors, 2-column lookbook, stacked plans, full-width booking drawer |
| **≤ 520 px** | Compact lookbook cards, trimmed footer |

The 3D scene recomposes itself by aspect ratio: the chair is scaled and re-positioned, and the
manifesto orbit tightens. On touch devices the spotlight drifts automatically after a few seconds of
inactivity. On phones the price-list tool follows the row in the middle of the screen. Layouts were
tested at 1440 × 900 and 390 × 844 with no horizontal overflow.

---

## Security

- **Input validation:** all booking and gift-card payloads are validated server-side with Symfony
  Validator constraints (formats, lengths, allowed amounts). Errors return `422` with per-field messages.
- **Race-condition safety:** slot availability is re-checked inside a database transaction before
  each insert, so a taken slot returns `409`.
- **Output escaping:** Twig auto-escaping for templates, an explicit HTML escaper for
  client-rendered drawer content, and `JSON_HEX_TAG` encoding for embedded JSON-LD.
- **No sensitive payment data:** the demo flow collects no card details. The deposit is displayed,
  not charged.
- **Secrets:** `APP_SECRET` in `.env` is a placeholder. Production secrets belong in `.env.local`,
  real environment variables or Symfony secrets.
- **Dependencies:** Symfony is pinned to the 7.4 LTS line, and `composer audit` reports no known
  advisories at the time of writing.

> **Note:** The public JSON API has no authentication or rate limiting. Add both, plus CSRF
> protection for forms, before any production deployment.

---

## Future Improvements

- Payment-provider integration for real deposits and gift-card purchases
- Real SMS reminders and email delivery for confirmations and gift cards
- Self-service rescheduling and cancellation via a secure booking link
- Admin dashboard for barbers to manage schedules, breaks and bookings
- API rate limiting and bot protection
- Matching front/back lookbook photography of the same models
- Internationalisation of the interface
- Automated end-to-end browser tests for the booking flow

---

## Author

**Dhia Saied**

---

## License

This project is **proprietary** (`"license": "proprietary"` in `composer.json`). All rights reserved.
No part of it may be copied, modified or distributed without the author's permission.

Third-party assets keep their own licences:

- **Photography** in `public/lookbook/` and `public/barbers/` is used under the
  [Unsplash License](https://unsplash.com/license). The photographers are credited in the website footer.
- **Libraries:** Three.js (MIT), Lenis (MIT), GSAP ([GreenSock Standard License](https://gsap.com/standard-license/)),
  Symfony and Doctrine (MIT).
- **Fonts:** Sora, Inter and JetBrains Mono are served by Google Fonts under the SIL Open Font License.
