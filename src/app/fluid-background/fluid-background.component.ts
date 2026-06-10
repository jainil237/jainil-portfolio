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

interface InkParticle {
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

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

  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  
  private offscreenCanvas!: HTMLCanvasElement;
  private offscreenCtx!: CanvasRenderingContext2D;

  private logicalWidth = 0;
  private logicalHeight = 0;

  private particles: InkParticle[] = [];
  
  private mouse = { x: -1000, y: -1000, vx: 0, vy: 0 };
  private boundPointerMove: ((e: PointerEvent) => void) | null = null;
  private boundResize: (() => void) | null = null;
  private isDestroyed = false;

  private colors = [
    'rgba(255, 62, 165, 0.25)',   // Pink
    'rgba(217, 70, 239, 0.25)',   // Purple
    'rgba(236, 72, 153, 0.25)',   // Magenta
    'rgba(192, 38, 211, 0.25)',   // Deep Purple
    'rgba(0, 240, 255, 0.25)',    // Cyan
    'rgba(255, 170, 0, 0.25)',    // Orange
    'rgba(64, 112, 244, 0.25)'    // Blue
  ];

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => {
      this.initCanvas();
      this.initListeners();
      
      gsap.ticker.add(this.update);
      gsap.ticker.fps(60);
    });
  }

  private initCanvas() {
    this.canvas = this.canvasRef.nativeElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    
    // Create offscreen buffer for persistent trails
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { alpha: false, willReadFrequently: false })!;
    
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement!;
    
    // Retina Rendering Strategy
    const dpr = window.devicePixelRatio || 1;
    this.logicalWidth = parent.clientWidth || window.innerWidth;
    this.logicalHeight = parent.clientHeight || window.innerHeight;

    // Scale Main Canvas
    this.canvas.width = this.logicalWidth * dpr;
    this.canvas.height = this.logicalHeight * dpr;
    this.canvas.style.width = this.logicalWidth + 'px';
    this.canvas.style.height = this.logicalHeight + 'px';
    
    // Scale Offscreen Canvas
    this.offscreenCanvas.width = this.logicalWidth * dpr;
    this.offscreenCanvas.height = this.logicalHeight * dpr;

    this.ctx.scale(dpr, dpr);
    this.offscreenCtx.scale(dpr, dpr);

    // Ensure pristine high-fidelity blending
    this.ctx.imageSmoothingEnabled = true;
    this.offscreenCtx.imageSmoothingEnabled = true;

    // Initialize offscreen buffer to pure black
    this.offscreenCtx.fillStyle = '#000000';
    this.offscreenCtx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);
  }

  private initListeners() {
    let lastX = this.mouse.x;
    let lastY = this.mouse.y;

    this.boundPointerMove = (e: PointerEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      
      this.mouse.vx = x - lastX;
      this.mouse.vy = y - lastY;
      this.mouse.x = x;
      this.mouse.y = y;
      
      this.spawnInk(x, y, this.mouse.vx, this.mouse.vy);
      
      lastX = x;
      lastY = y;
    };

    this.boundResize = () => {
      this.resizeCanvas();
    };

    window.addEventListener('pointermove', this.boundPointerMove, { passive: true });
    window.addEventListener('resize', this.boundResize);
  }

  private spawnInk(x: number, y: number, vx: number, vy: number) {
    const numParticles = 12;
    for (let i = 0; i < numParticles; i++) {
      const spreadX = (Math.random() - 0.5) * 15;
      const spreadY = (Math.random() - 0.5) * 15;
      
      const explodeV = Math.random() * 1.2;
      const angle = Math.random() * Math.PI * 2;

      this.particles.push({
        x: x + spreadX,
        y: y + spreadY,
        lastX: x + spreadX,
        lastY: y + spreadY,
        vx: vx * 0.1 + Math.cos(angle) * explodeV,
        vy: vy * 0.1 + Math.sin(angle) * explodeV,
        life: 0,
        maxLife: Math.random() * 100 + 40,
        size: Math.random() * 8 + 4,
        color: this.colors[Math.floor(Math.random() * this.colors.length)]
      });
    }

    if (this.particles.length > 2000) {
      this.particles.splice(0, this.particles.length - 2000);
    }
  }

  private update = () => {
    if (this.isDestroyed || !this.ctx || !this.offscreenCtx) return;

    const time = performance.now() * 0.0005;
    
    // --- OFFSCREEN BUFFER RENDER ---
    
    // 1. Gently fade the offscreen trail to pure black
    this.offscreenCtx.globalCompositeOperation = 'source-over';
    this.offscreenCtx.fillStyle = 'rgba(0, 0, 0, 0.06)'; 
    this.offscreenCtx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // 2. Additive blending for gorgeous light emission
    this.offscreenCtx.globalCompositeOperation = 'screen';
    this.offscreenCtx.lineCap = 'round';
    this.offscreenCtx.lineJoin = 'round';

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life++;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        i--;
        continue;
      }

      p.lastX = p.x;
      p.lastY = p.y;

      // Smooth flowing lines (organic vector field)
      const fieldScale = 0.004;
      const flowAngle = Math.sin(p.x * fieldScale + time) * 2.0 + 
                        Math.cos(p.y * fieldScale - time) * 2.0;
      
      const flowForceX = Math.cos(flowAngle) * 0.6;
      const flowForceY = Math.sin(flowAngle) * 0.6;

      p.vx += flowForceX;
      p.vy += flowForceY;
      
      p.vx *= 0.88;
      p.vy *= 0.88;

      p.x += p.vx;
      p.y += p.vy;

      const lifeRatio = p.life / p.maxLife;
      // Spline thickens dramatically to simulate diffusion
      const currentSize = p.size * (1 + lifeRatio * 8); 
      const opacity = Math.max(0, 1 - Math.pow(lifeRatio, 2));

      // Draw continuous gapless ribbon segments instead of discrete dots
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(p.lastX, p.lastY);
      this.offscreenCtx.lineTo(p.x, p.y);
      
      this.offscreenCtx.lineWidth = currentSize;
      this.offscreenCtx.strokeStyle = p.color.replace('0.25)', `${opacity * 0.25})`);
      this.offscreenCtx.stroke();
    }

    // --- MAIN CANVAS POST-PROCESSING (BLOOM & GLOW) ---

    // 1. Clear main canvas to pure black
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    // 2. Screen blending for all passes
    this.ctx.globalCompositeOperation = 'screen';
    
    // Pass 1: Massive Bloom (Soft Ambient Glow)
    this.ctx.filter = 'blur(16px)';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.logicalWidth, this.logicalHeight);

    // Pass 2: Medium Bloom (Halo Effect)
    this.ctx.filter = 'blur(6px)';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.logicalWidth, this.logicalHeight);

    // Pass 3: Core (Crisp details with no artifacts)
    this.ctx.filter = 'none';
    this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.logicalWidth, this.logicalHeight);
  };

  ngOnDestroy(): void {
    this.isDestroyed = true;
    gsap.ticker.remove(this.update);

    if (this.boundPointerMove) {
      window.removeEventListener('pointermove', this.boundPointerMove);
    }
    if (this.boundResize) {
      window.removeEventListener('resize', this.boundResize);
    }
  }
}

