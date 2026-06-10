import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { gsap } from 'gsap';

// --- Configuration ---
const CONFIG = {
  SIM_RESOLUTION: 256,
  DYE_RESOLUTION: 1024,
  CAPTURE_RESOLUTION: 512,
  DENSITY_DISSIPATION: 0.995, // Lasts longer
  VELOCITY_DISSIPATION: 0.98,
  PRESSURE: 0.8,
  PRESSURE_ITERATIONS: 20,
  CURL: 50, // Larger, more elegant swirls
  SPLAT_RADIUS: 0.05, // Huge billowy clouds
  SPLAT_FORCE: 6000,
  SHADING: true,
  COLOR_UPDATE_SPEED: 10,
  PAUSED: false,
  BACK_COLOR: { r: 0.0196, g: 0.0196, b: 0.0196 }, // #050505
  TRANSPARENT: false,
};

// --- Shaders ---
const baseVertexShader = `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  varying vec2 vL;
  varying vec2 vR;
  varying vec2 vT;
  varying vec2 vB;
  uniform vec2 texelSize;
  void main () {
      vUv = aPosition * 0.5 + 0.5;
      vL = vUv - vec2(texelSize.x, 0.0);
      vR = vUv + vec2(texelSize.x, 0.0);
      vT = vUv + vec2(0.0, texelSize.y);
      vB = vUv - vec2(0.0, texelSize.y);
      gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const clearShader = `
  precision mediump float;
  precision mediump sampler2D;
  varying highp vec2 vUv;
  uniform sampler2D uTexture;
  uniform float value;
  void main () {
      gl_FragColor = value * texture2D(uTexture, vUv);
  }
`;

const displayShaderSource = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main () {
      vec3 c = texture2D(uTexture, vUv).rgb;
      // Add the fluid color to the dark background #050505
      vec3 bgColor = vec3(0.0196, 0.0196, 0.0196);
      gl_FragColor = vec4(bgColor + c, 1.0);
  }
`;

const splatShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uTarget;
  uniform float aspectRatio;
  uniform vec3 color;
  uniform vec2 point;
  uniform float radius;
  uniform float isDye;
  void main () {
      vec2 p = vUv - point.xy;
      p.x *= aspectRatio;
      vec3 base = texture2D(uTarget, vUv).xyz;
      float splat = exp(-dot(p, p) / radius);
      
      if (isDye > 0.5) {
          // Mix towards the color for dye to prevent blowing out to white
          gl_FragColor = vec4(mix(base, color, splat), 1.0);
      } else {
          // Additive blending for velocity
          gl_FragColor = vec4(base + splat * color, 1.0);
      }
  }
`;

const advectionShader = `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 texelSize;
  uniform vec2 dyeTexelSize;
  uniform float dt;
  uniform float dissipation;
  void main () {
      vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
      gl_FragColor = dissipation * texture2D(uSource, coord);
      gl_FragColor.a = 1.0;
  }
`;

const divergenceShader = `
  precision highp float;
  precision highp sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uVelocity, vL).x;
      float R = texture2D(uVelocity, vR).x;
      float T = texture2D(uVelocity, vT).y;
      float B = texture2D(uVelocity, vB).y;
      vec2 C = texture2D(uVelocity, vUv).xy;
      if (vL.x < 0.0) { L = -C.x; }
      if (vR.x > 1.0) { R = -C.x; }
      if (vT.y > 1.0) { T = -C.y; }
      if (vB.y < 0.0) { B = -C.y; }
      float div = 0.5 * (R - L + T - B);
      gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

const curlShader = `
  precision highp float;
  precision highp sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uVelocity, vL).y;
      float R = texture2D(uVelocity, vR).y;
      float T = texture2D(uVelocity, vT).x;
      float B = texture2D(uVelocity, vB).x;
      float vorticity = R - L - T + B;
      gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
  }
`;

const vorticityShader = `
  precision highp float;
  precision highp sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uVelocity;
  uniform sampler2D uCurl;
  uniform float curl;
  uniform float dt;
  void main () {
      float L = texture2D(uCurl, vL).x;
      float R = texture2D(uCurl, vR).x;
      float T = texture2D(uCurl, vT).x;
      float B = texture2D(uCurl, vB).x;
      float C = texture2D(uCurl, vUv).x;
      vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
      force /= length(force) + 0.0001;
      force *= curl * C;
      force.y *= -1.0;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity += force * dt;
      velocity = min(max(velocity, -1000.0), 1000.0);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

const pressureShader = `
  precision highp float;
  precision highp sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;
  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      float C = texture2D(uPressure, vUv).x;
      float divergence = texture2D(uDivergence, vUv).x;
      float pressure = (L + R + B + T - divergence) * 0.25;
      gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
  }
`;

const gradientSubtractShader = `
  precision highp float;
  precision highp sampler2D;
  varying highp vec2 vUv;
  varying highp vec2 vL;
  varying highp vec2 vR;
  varying highp vec2 vT;
  varying highp vec2 vB;
  uniform sampler2D uPressure;
  uniform sampler2D uVelocity;
  void main () {
      float L = texture2D(uPressure, vL).x;
      float R = texture2D(uPressure, vR).x;
      float T = texture2D(uPressure, vT).x;
      float B = texture2D(uPressure, vB).x;
      vec2 velocity = texture2D(uVelocity, vUv).xy;
      velocity.xy -= vec2(R - L, T - B);
      gl_FragColor = vec4(velocity, 0.0, 1.0);
  }
`;

// --- WebGL Helper Classes ---

class Program {
  program: WebGLProgram;
  uniforms: Record<string, WebGLUniformLocation> = {};
  
  constructor(private gl: WebGL2RenderingContext | WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader) {
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);
    
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(this.program);
    }
    
    const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < uniformCount; i++) {
      const uniformName = gl.getActiveUniform(this.program, i)?.name;
      if (uniformName) {
        this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName)!;
      }
    }
  }

  bind() {
    this.gl.useProgram(this.program);
  }
}

interface FBO {
  texture: WebGLTexture;
  fbo: WebGLFramebuffer;
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  attach(id: number): number;
}

interface DoubleFBO {
  width: number;
  height: number;
  texelSizeX: number;
  texelSizeY: number;
  read: FBO;
  write: FBO;
  swap(): void;
}

// --- Component ---

@Component({
  selector: 'app-fluid-background',
  standalone: true,
  templateUrl: './fluid-background.component.html',
  styleUrls: ['./fluid-background.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FluidBackgroundComponent implements AfterViewInit, OnDestroy {
  @ViewChild('fluidCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private gl!: WebGL2RenderingContext | WebGLRenderingContext;
  private ext!: any;
  private programs: Record<string, Program> = {};
  private fbos: {
    velocity?: DoubleFBO;
    dye?: DoubleFBO;
    pressure?: DoubleFBO;
    curl?: FBO;
    divergence?: FBO;
  } = {};
  
  private isDestroyed = false;
  private pointer = {
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    down: false,
    moved: false,
    color: [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2]
  };
  
  private lastTime = 0;
  private boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundPointerDown: ((e: PointerEvent) => void) | null = null;
  private boundPointerUp: ((e: PointerEvent) => void) | null = null;
  private boundResize: (() => void) | null = null;
  private blit!: (target: FBO | null) => void;

  // Base colors to cycle through (cyan, magenta, floral pink, purple)
  private baseColors = [
    [0.1, 0.8, 0.9],   // Cyan
    [1.0, 0.24, 0.65], // Vibrant Pink
    [0.85, 0.27, 0.93], // Purple/Magenta
    [0.92, 0.28, 0.60], // Floral Pink
  ];

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initWebGL();
      if (!this.gl) return;
      this.initListeners();
      this.initFluid();
      
      this.lastTime = Date.now();
      gsap.ticker.add(this.update);
      gsap.ticker.fps(60);
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    gsap.ticker.remove(this.update);
    if (this.boundPointerMove) window.removeEventListener('pointermove', this.boundPointerMove);
    if (this.boundPointerDown) window.removeEventListener('pointerdown', this.boundPointerDown);
    if (this.boundPointerUp) window.removeEventListener('pointerup', this.boundPointerUp);
    if (this.boundResize) window.removeEventListener('resize', this.boundResize);
    
    // Also remove any generic touch listeners
    window.removeEventListener('touchstart', this.boundPointerDown as any);
    window.removeEventListener('touchmove', this.boundPointerMove as any);
  }

  private isWebGL2 = false;

  private initWebGL() {
    const canvas = this.canvasRef.nativeElement;
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
    this.isWebGL2 = !!gl;
    this.gl = (gl || canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false })) as WebGLRenderingContext | WebGL2RenderingContext;
    
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    let halfFloat;
    let supportLinearFiltering;
    
    if (this.isWebGL2) {
      this.gl.getExtension('EXT_color_buffer_float');
      supportLinearFiltering = this.gl.getExtension('OES_texture_float_linear');
    } else {
      halfFloat = this.gl.getExtension('OES_texture_half_float');
      supportLinearFiltering = this.gl.getExtension('OES_texture_half_float_linear');
    }

    this.ext = {
      halfFloatTexType: this.isWebGL2 ? (this.gl as WebGL2RenderingContext).HALF_FLOAT : halfFloat?.HALF_FLOAT_OES,
      supportLinearFiltering
    };

    // Vertex Buffer Object
    const vao = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vao);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), this.gl.STATIC_DRAW);
    
    // Blit helper
    this.blit = (target: FBO | null) => {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vao);
      const aPosition = 0; // It's always 0 in our shaders
      this.gl.enableVertexAttribArray(aPosition);
      this.gl.vertexAttribPointer(aPosition, 2, this.gl.FLOAT, false, 0, 0);

      if (target == null) {
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
      } else {
        this.gl.viewport(0, 0, target.width, target.height);
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, target.fbo);
      }
      this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, 4);
      this.gl.disableVertexAttribArray(aPosition);
    };
  }

  private getFormats() {
    let internalRGBA, formatRGBA, internalRG, formatRG, internalR, formatR;
    if (this.isWebGL2) {
      const gl2 = this.gl as WebGL2RenderingContext;
      internalRGBA = gl2.RGBA16F;
      formatRGBA = gl2.RGBA;
      internalRG = gl2.RG16F;
      formatRG = gl2.RG;
      internalR = gl2.R16F;
      formatR = gl2.RED;
    } else {
      internalRGBA = this.gl.RGBA;
      formatRGBA = this.gl.RGBA;
      internalRG = this.gl.RGBA;
      formatRG = this.gl.RGBA;
      internalR = this.gl.RGBA;
      formatR = this.gl.RGBA;
    }
    return { internalRGBA, formatRGBA, internalRG, formatRG, internalR, formatR };
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw this.gl.getShaderInfoLog(shader);
    }
    return shader;
  }

  private initFluid() {
    const baseVertex = this.compileShader(this.gl.VERTEX_SHADER, baseVertexShader);
    this.programs['clear'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, clearShader));
    this.programs['display'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, displayShaderSource));
    this.programs['splat'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, splatShader));
    this.programs['advection'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, advectionShader));
    this.programs['divergence'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, divergenceShader));
    this.programs['curl'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, curlShader));
    this.programs['vorticity'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, vorticityShader));
    this.programs['pressure'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, pressureShader));
    this.programs['gradientSubtract'] = new Program(this.gl, baseVertex, this.compileShader(this.gl.FRAGMENT_SHADER, gradientSubtractShader));

    this.initFramebuffers();
  }

  private createFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): FBO {
    this.gl.activeTexture(this.gl.TEXTURE0);
    const texture = this.gl.createTexture()!;
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, param);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = this.gl.createFramebuffer()!;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
    this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
    this.gl.viewport(0, 0, w, h);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      texelSizeX: 1.0 / w,
      texelSizeY: 1.0 / h,
      attach: (id: number) => {
        this.gl.activeTexture(this.gl.TEXTURE0 + id);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        return id;
      }
    };
  }

  private createDoubleFBO(w: number, h: number, internalFormat: number, format: number, type: number, param: number): DoubleFBO {
    let fbo1 = this.createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = this.createFBO(w, h, internalFormat, format, type, param);
    return {
      width: w,
      height: h,
      texelSizeX: fbo1.texelSizeX,
      texelSizeY: fbo1.texelSizeY,
      get read() { return fbo1; },
      set read(value) { fbo1 = value; },
      get write() { return fbo2; },
      set write(value) { fbo2 = value; },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      }
    };
  }

  private initFramebuffers() {
    const simRes = this.getResolution(CONFIG.SIM_RESOLUTION);
    const dyeRes = this.getResolution(CONFIG.DYE_RESOLUTION);

    const texType = this.ext.halfFloatTexType;
    const formats = this.getFormats();
    const filtering = this.ext.supportLinearFiltering ? this.gl.LINEAR : this.gl.NEAREST;

    this.fbos.velocity = this.createDoubleFBO(simRes.width, simRes.height, formats.internalRG, formats.formatRG, texType, filtering);
    this.fbos.dye = this.createDoubleFBO(dyeRes.width, dyeRes.height, formats.internalRGBA, formats.formatRGBA, texType, filtering);
    this.fbos.pressure = this.createDoubleFBO(simRes.width, simRes.height, formats.internalR, formats.formatR, texType, this.gl.NEAREST);
    this.fbos.curl = this.createFBO(simRes.width, simRes.height, formats.internalR, formats.formatR, texType, this.gl.NEAREST);
    this.fbos.divergence = this.createFBO(simRes.width, simRes.height, formats.internalR, formats.formatR, texType, this.gl.NEAREST);
  }

  private getResolution(resolution: number) {
    let aspectRatio = this.gl.canvas.width / this.gl.canvas.height;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;
    const min = Math.round(resolution);
    const max = Math.round(resolution * aspectRatio);
    return this.gl.canvas.width > this.gl.canvas.height 
      ? { width: max, height: min } 
      : { width: min, height: max };
  }

  private initListeners() {
    const parent = this.canvasRef.nativeElement.parentElement!;
    
    this.boundResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth || window.innerWidth;
      const height = parent.clientHeight || window.innerHeight;
      this.gl.canvas.width = width * dpr;
      this.gl.canvas.height = height * dpr;
      (this.gl.canvas as HTMLCanvasElement).style.width = width + 'px';
      (this.gl.canvas as HTMLCanvasElement).style.height = height + 'px';
      this.initFramebuffers();
    };
    
    this.boundResize();
    window.addEventListener('resize', this.boundResize);

    const handleInput = (clientX: number, clientY: number, target: EventTarget | null, isDown = false) => {
      const rect = (this.gl.canvas as HTMLCanvasElement).getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const y = 1.0 - (clientY - rect.top) / rect.height;
      
      this.pointer.dx = (x - this.pointer.x) * 10.0;
      this.pointer.dy = (y - this.pointer.y) * 10.0;
      
      // If tapping/touching without moving, create a synthetic force to ensure a splash
      if (isDown && Math.abs(this.pointer.dx) < 0.1 && Math.abs(this.pointer.dy) < 0.1) {
        this.pointer.dx = (Math.random() - 0.5) * 2.0;
        this.pointer.dy = (Math.random() - 0.5) * 2.0;
      }
      
      this.pointer.x = x;
      this.pointer.y = y;

      const htmlTarget = target as HTMLElement;
      const isOverForeground = htmlTarget?.closest?.('.glass-card, nav, .modal-enter') !== null;
      
      if (!isOverForeground) {
        this.pointer.moved = true;
      }
    };

    this.boundPointerMove = (e: PointerEvent) => handleInput(e.clientX, e.clientY, e.target);
    this.boundPointerDown = (e: PointerEvent) => handleInput(e.clientX, e.clientY, e.target, true);

    window.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    window.addEventListener('pointerdown', this.boundPointerDown, { passive: true });
    
    // Explicit touch events for older mobiles
    window.addEventListener('touchstart', (e: TouchEvent) => {
      if (e.touches.length > 0) handleInput(e.touches[0].clientX, e.touches[0].clientY, e.target, true);
    }, { passive: true });
    
    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) handleInput(e.touches[0].clientX, e.touches[0].clientY, e.target);
    }, { passive: true });
  }

  private update = () => {
    if (this.isDestroyed || !this.gl) return;
    
    const now = Date.now();
    let dt = (now - this.lastTime) / 1000;
    dt = Math.min(dt, 0.016666);
    this.lastTime = now;

    // Dynamically calculate smooth color over time for the cursor
    const timeSec = now * 0.001;
    const colorSpeed = 0.5; // Speed of color transition
    const c1 = this.baseColors[Math.floor(timeSec * colorSpeed) % this.baseColors.length];
    const c2 = this.baseColors[(Math.floor(timeSec * colorSpeed) + 1) % this.baseColors.length];
    const mix = (timeSec * colorSpeed) % 1;
    this.pointer.color = [
      c1[0] * (1 - mix) + c2[0] * mix,
      c1[1] * (1 - mix) + c2[1] * mix,
      c1[2] * (1 - mix) + c2[2] * mix
    ];

    // Cursor injection (injects into velocity and dye)
    if (this.pointer.moved) {
      this.pointer.moved = false;
      this.splatPointer(this.pointer.dx, this.pointer.dy);
    }

    const { velocity, dye, pressure, curl, divergence } = this.fbos;
    if (!velocity || !dye || !pressure || !curl || !divergence) return;

    this.gl.disable(this.gl.BLEND);

    // --- Curl ---
    this.programs['curl'].bind();
    this.gl.uniform2f(this.programs['curl'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    this.gl.uniform1i(this.programs['curl'].uniforms['uVelocity'], velocity.read.attach(0));
    this.blit(curl);

    // --- Vorticity ---
    this.programs['vorticity'].bind();
    this.gl.uniform2f(this.programs['vorticity'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    this.gl.uniform1i(this.programs['vorticity'].uniforms['uVelocity'], velocity.read.attach(0));
    this.gl.uniform1i(this.programs['vorticity'].uniforms['uCurl'], curl.attach(1));
    this.gl.uniform1f(this.programs['vorticity'].uniforms['curl'], CONFIG.CURL);
    this.gl.uniform1f(this.programs['vorticity'].uniforms['dt'], dt);
    this.blit(velocity.write);
    velocity.swap();

    // --- Divergence ---
    this.programs['divergence'].bind();
    this.gl.uniform2f(this.programs['divergence'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    this.gl.uniform1i(this.programs['divergence'].uniforms['uVelocity'], velocity.read.attach(0));
    this.blit(divergence);

    // --- Clear Pressure ---
    this.programs['clear'].bind();
    this.gl.uniform1i(this.programs['clear'].uniforms['uTexture'], pressure.read.attach(0));
    this.gl.uniform1f(this.programs['clear'].uniforms['value'], CONFIG.PRESSURE);
    this.blit(pressure.write);
    pressure.swap();

    // --- Pressure ---
    this.programs['pressure'].bind();
    this.gl.uniform2f(this.programs['pressure'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    this.gl.uniform1i(this.programs['pressure'].uniforms['uDivergence'], divergence.attach(1));
    for (let i = 0; i < CONFIG.PRESSURE_ITERATIONS; i++) {
      this.gl.uniform1i(this.programs['pressure'].uniforms['uPressure'], pressure.read.attach(0));
      this.blit(pressure.write);
      pressure.swap();
    }

    // --- Gradient Subtract ---
    this.programs['gradientSubtract'].bind();
    this.gl.uniform2f(this.programs['gradientSubtract'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    this.gl.uniform1i(this.programs['gradientSubtract'].uniforms['uPressure'], pressure.read.attach(0));
    this.gl.uniform1i(this.programs['gradientSubtract'].uniforms['uVelocity'], velocity.read.attach(1));
    this.blit(velocity.write);
    velocity.swap();

    // --- Advection (Velocity) ---
    this.programs['advection'].bind();
    this.gl.uniform2f(this.programs['advection'].uniforms['texelSize'], velocity.texelSizeX, velocity.texelSizeY);
    if (!this.ext.supportLinearFiltering) {
      this.gl.uniform2f(this.programs['advection'].uniforms['dyeTexelSize'], velocity.texelSizeX, velocity.texelSizeY);
    }
    const velocityId = velocity.read.attach(0);
    this.gl.uniform1i(this.programs['advection'].uniforms['uVelocity'], velocityId);
    this.gl.uniform1i(this.programs['advection'].uniforms['uSource'], velocityId);
    this.gl.uniform1f(this.programs['advection'].uniforms['dt'], dt);
    this.gl.uniform1f(this.programs['advection'].uniforms['dissipation'], CONFIG.VELOCITY_DISSIPATION);
    this.blit(velocity.write);
    velocity.swap();

    // --- Advection (Dye) ---
    this.gl.uniform1i(this.programs['advection'].uniforms['uVelocity'], velocity.read.attach(0));
    this.gl.uniform1i(this.programs['advection'].uniforms['uSource'], dye.read.attach(1));
    this.gl.uniform1f(this.programs['advection'].uniforms['dissipation'], CONFIG.DENSITY_DISSIPATION);
    this.blit(dye.write);
    dye.swap();

    // --- Display ---
    this.programs['display'].bind();
    this.gl.uniform1i(this.programs['display'].uniforms['uTexture'], dye.read.attach(0));
    this.blit(null);
  };

  private splatPointer(dx: number, dy: number) {
    this.splat(this.pointer.x, this.pointer.y, dx * CONFIG.SPLAT_FORCE, dy * CONFIG.SPLAT_FORCE, this.pointer.color);
  }

  private splat(x: number, y: number, dx: number, dy: number, color: number[]) {
    const { velocity, dye } = this.fbos;
    if (!velocity || !dye) return;

    this.programs['splat'].bind();
    this.gl.uniform1i(this.programs['splat'].uniforms['uTarget'], velocity.read.attach(0));
    this.gl.uniform1f(this.programs['splat'].uniforms['aspectRatio'], this.gl.canvas.width / this.gl.canvas.height);
    this.gl.uniform2f(this.programs['splat'].uniforms['point'], x, y);
    this.gl.uniform3f(this.programs['splat'].uniforms['color'], dx, dy, 0.0);
    this.gl.uniform1f(this.programs['splat'].uniforms['radius'], CONFIG.SPLAT_RADIUS / 100.0);
    this.gl.uniform1f(this.programs['splat'].uniforms['isDye'], 0.0);
    this.blit(velocity.write);
    velocity.swap();

    this.gl.uniform1i(this.programs['splat'].uniforms['uTarget'], dye.read.attach(0));
    this.gl.uniform3f(this.programs['splat'].uniforms['color'], color[0], color[1], color[2]);
    this.gl.uniform1f(this.programs['splat'].uniforms['isDye'], 1.0);
    this.blit(dye.write);
    dye.swap();
  }
}
