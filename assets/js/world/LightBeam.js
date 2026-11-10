import * as THREE from 'three';

/**
 * Fake volumetric light: an open cone drawn additively, fading along its length and
 * towards its silhouette, plus dust motes that only glow while inside the cone.
 */
export class LightBeam {
    constructor({ angle, length = 7, color = '#ffe9cc', dustCount = 500 }) {
        this.group = new THREE.Group();
        this.color = new THREE.Color(color);

        const radius = Math.tan(angle) * length;
        const geo = new THREE.ConeGeometry(radius, length, 64, 24, true);
        geo.translate(0, -length / 2, 0); // apex at the origin, opening towards -Y
        geo.rotateX(-Math.PI / 2); // now opening towards +Z, which is what lookAt() aims

        this.coneMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            side: THREE.DoubleSide,
            uniforms: {
                uColor: { value: this.color },
                uIntensity: { value: 0.0 },
                uLength: { value: length },
                uTime: { value: 0 },
            },
            vertexShader: /* glsl */`
                varying vec3 vNormalW;
                varying vec3 vPosW;
                varying float vAlong;
                uniform float uLength;
                void main() {
                    vAlong = clamp(position.z / uLength, 0.0, 1.0);
                    vec4 w = modelMatrix * vec4(position, 1.0);
                    vPosW = w.xyz;
                    vNormalW = normalize(mat3(modelMatrix) * normal);
                    gl_Position = projectionMatrix * viewMatrix * w;
                }
            `,
            fragmentShader: /* glsl */`
                varying vec3 vNormalW;
                varying vec3 vPosW;
                varying float vAlong;
                uniform vec3 uColor;
                uniform float uIntensity;
                uniform float uTime;
                void main() {
                    vec3 viewDir = normalize(cameraPosition - vPosW);
                    float facing = abs(dot(normalize(vNormalW), viewDir));
                    float edge = pow(facing, 2.2);
                    float fall = smoothstep(0.0, 0.08, vAlong) * pow(1.0 - vAlong, 1.6);
                    float flicker = 0.94 + 0.06 * sin(uTime * 1.7 + vAlong * 6.0);
                    float a = edge * fall * uIntensity * flicker * 0.32;
                    gl_FragColor = vec4(uColor * a, a);
                }
            `,
        });
        this.cone = new THREE.Mesh(geo, this.coneMaterial);
        this.cone.renderOrder = 10;
        this.cone.frustumCulled = false;
        this.group.add(this.cone);

        this.createDust(dustCount);
    }

    createDust(count) {
        const positions = new Float32Array(count * 3);
        const seeds = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 5.5;
            positions[i * 3 + 1] = Math.random() * 5.2 - 1.6;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 3.5;
            seeds[i] = Math.random();
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

        this.dustMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
                uTime: { value: 0 },
                uLightPos: { value: new THREE.Vector3() },
                uLightDir: { value: new THREE.Vector3(0, -1, 0) },
                uCosOuter: { value: Math.cos(0.5) },
                uIntensity: { value: 0 },
                uColor: { value: this.color },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            },
            vertexShader: /* glsl */`
                attribute float aSeed;
                uniform float uTime;
                uniform vec3 uLightPos;
                uniform vec3 uLightDir;
                uniform float uCosOuter;
                uniform float uPixelRatio;
                varying float vLit;
                void main() {
                    vec3 p = position;
                    float t = uTime * (0.05 + aSeed * 0.08);
                    p.y = mod(p.y + t + 1.6, 5.2) - 1.6;
                    p.x += sin(uTime * 0.3 + aSeed * 40.0) * 0.18;
                    p.z += cos(uTime * 0.25 + aSeed * 23.0) * 0.18;
                    vec4 w = modelMatrix * vec4(p, 1.0);
                    vec3 toP = normalize(w.xyz - uLightPos);
                    float c = dot(toP, uLightDir);
                    vLit = smoothstep(uCosOuter, mix(uCosOuter, 1.0, 0.55), c);
                    vec4 mv = viewMatrix * w;
                    gl_Position = projectionMatrix * mv;
                    gl_PointSize = (1.2 + aSeed * 2.6) * uPixelRatio * (8.0 / -mv.z);
                }
            `,
            fragmentShader: /* glsl */`
                uniform vec3 uColor;
                uniform float uIntensity;
                varying float vLit;
                void main() {
                    float d = length(gl_PointCoord - 0.5);
                    float a = smoothstep(0.5, 0.0, d) * vLit * uIntensity;
                    if (a < 0.01) discard;
                    gl_FragColor = vec4(uColor * a, a);
                }
            `,
        });
        this.dust = new THREE.Points(geo, this.dustMaterial);
        this.dust.frustumCulled = false;
        this.group.add(this.dust);
    }

    /** Aim the cone from the light to its target (both in the beam group's parent space). */
    update(lightWorld, targetWorld, intensity, time, cosOuter) {
        const parent = this.group.parent;
        const localLight = parent ? parent.worldToLocal(lightWorld.clone()) : lightWorld.clone();
        this.cone.position.copy(localLight);
        this.cone.lookAt(targetWorld);

        this.coneMaterial.uniforms.uIntensity.value = intensity;
        this.coneMaterial.uniforms.uTime.value = time;

        const u = this.dustMaterial.uniforms;
        u.uTime.value = time;
        u.uLightPos.value.copy(lightWorld);
        u.uLightDir.value.copy(targetWorld).sub(lightWorld).normalize();
        u.uCosOuter.value = cosOuter;
        u.uIntensity.value = intensity;
    }
}
