import * as THREE from 'three';
import { createChannelLeatherNormal, createDiamondLeatherNormal, createRibNormal } from './textures.js';

export const LEATHER_COLORS = {
    onyx: new THREE.Color('#141414'),
    oxblood: new THREE.Color('#4d1013'),
    cognac: new THREE.Color('#7a4421'),
    bottle: new THREE.Color('#163322'),
};

/** Shared PBR materials. Leather colours are tweened together when the swatch changes. */
export function createMaterials() {
    const diamondNormal = createDiamondLeatherNormal();
    const channelNormal = createChannelLeatherNormal();
    const ribNormal = createRibNormal();

    const leatherBase = {
        color: LEATHER_COLORS.onyx.clone(),
        roughness: 0.48,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        sheen: 0.5,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color('#3a3530'),
    };

    const leatherDiamond = new THREE.MeshPhysicalMaterial({ ...leatherBase, normalMap: diamondNormal, normalScale: new THREE.Vector2(1.1, 1.1) });
    const leatherChannel = new THREE.MeshPhysicalMaterial({ ...leatherBase, normalMap: channelNormal, normalScale: new THREE.Vector2(1, 1) });
    leatherChannel.color = leatherDiamond.color; // share the colour object so one tween drives both

    return {
        leatherDiamond,
        leatherChannel,
        leatherColor: leatherDiamond.color,
        chrome: new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.08 }),
        chromeRibbed: new THREE.MeshStandardMaterial({ color: '#d9d9d9', metalness: 1, roughness: 0.2, normalMap: ribNormal, normalScale: new THREE.Vector2(0.8, 0.8) }),
        enamel: new THREE.MeshPhysicalMaterial({ color: '#0d0d0e', metalness: 0.3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
        rubber: new THREE.MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.82, metalness: 0 }),
        satinBlack: new THREE.MeshStandardMaterial({ color: '#121213', roughness: 0.42, metalness: 0.25 }),
        gold: new THREE.MeshStandardMaterial({ color: '#d5b27a', metalness: 1, roughness: 0.22 }),
        steel: new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 1, roughness: 0.18 }),
        tortoise: new THREE.MeshPhysicalMaterial({ color: '#2b1a10', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 }),
        walnut: new THREE.MeshPhysicalMaterial({ color: '#3a2416', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.3 }),
    };
}
