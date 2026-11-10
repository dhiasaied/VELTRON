<?php

/**
 * Returns the importmap for this application.
 *
 * - "path" is a path inside the asset mapper system. Use the
 *     "debug:asset-map" command to see the full list of paths.
 *
 * - "entrypoint" (JavaScript only) set to true for any module that will
 *     be used as an "entrypoint" (and passed to the importmap() Twig function).
 *
 * The "importmap:require" command can be used to add new entries to this file.
 */
return [
    'app' => [
        'path' => './assets/app.js',
        'entrypoint' => true,
    ],
    'three' => [
        'version' => '0.187.0',
    ],
    'three/addons/environments/RoomEnvironment.js' => [
        'version' => '0.187.0',
    ],
    'three/addons/geometries/RoundedBoxGeometry.js' => [
        'version' => '0.187.0',
    ],
    'three/addons/utils/BufferGeometryUtils.js' => [
        'version' => '0.187.0',
    ],
    'gsap' => [
        'version' => '3.15.1',
    ],
    'gsap/ScrollTrigger.js' => [
        'version' => '3.15.1',
    ],
    'lenis' => [
        'version' => '1.3.27',
    ],
];
