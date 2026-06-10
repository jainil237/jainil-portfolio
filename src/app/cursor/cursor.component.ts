import { Component, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-cursor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cursor.component.html',
  styleUrls: ['./cursor.component.scss']
})
export class CursorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cursor', { static: true }) cursorRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('trail') trailRefs!: QueryList<ElementRef<HTMLDivElement>>;
  
  trailCount = [0, 1, 2, 3, 4, 5, 6, 7];

  private quickToX!: gsap.QuickToFunc;
  private quickToY!: gsap.QuickToFunc;
  private boundMouseMove!: (e: MouseEvent) => void;
  private boundMouseOver!: (e: MouseEvent) => void;
  private boundMouseOut!: (e: MouseEvent) => void;
  
  private isHovering = false;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.ngZone.runOutsideAngular(() => {
      const el = this.cursorRef.nativeElement;
      const trails = this.trailRefs.map(ref => ref.nativeElement);
      
      gsap.set(el, { xPercent: -50, yPercent: -50 });
      gsap.set(trails, { xPercent: -50, yPercent: -50, scale: 0 });
      
      this.quickToX = gsap.quickTo(el, 'x', { duration: 0.15, ease: 'power3.out' });
      this.quickToY = gsap.quickTo(el, 'y', { duration: 0.15, ease: 'power3.out' });

      // Create quickTo for each trail
      const trailQuickTos = trails.map(t => ({
        x: gsap.quickTo(t, 'x', { duration: 0.3, ease: 'power3.out' }),
        y: gsap.quickTo(t, 'y', { duration: 0.3, ease: 'power3.out' })
      }));

      gsap.set(el, { x: -100, y: -100 });

      let trailTimeline: gsap.core.Tween | null = null;

      this.boundMouseMove = (e: MouseEvent) => {
        this.quickToX(e.clientX);
        this.quickToY(e.clientY);

        // Animate trails following the cursor with a stagger
        if (trailTimeline) trailTimeline.kill();
        trailTimeline = gsap.to(trails, {
          x: e.clientX,
          y: e.clientY,
          stagger: {
            each: 0.02,
            from: "start"
          },
          duration: 0.4,
          ease: "power3.out",
          overwrite: true
        });
        
        // Show trails once moved
        gsap.to(trails, { scale: 1, duration: 0.3, stagger: 0.02, overwrite: "auto" });
      };

      this.boundMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        
        let isArrowTarget = false;
        if (anchor) {
          const href = anchor.getAttribute('href') || '';
          if (href.startsWith('http://') || href.startsWith('https://')) {
            isArrowTarget = true;
          } else if (
            anchor.classList.contains('nav-link') ||
            anchor.classList.contains('nav-link--primary') ||
            anchor.classList.contains('mobile-link') ||
            anchor.classList.contains('mobile-link--primary')
          ) {
            isArrowTarget = true;
          }
        }
        
        if (isArrowTarget && !this.isHovering) {
          this.isHovering = true;
          el.classList.add('hover-state');
          gsap.to(el, {
            width: 80,
            height: 80,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.25)',
            duration: 0.3,
            ease: 'power3.out'
          });
          
          // Collapse trails
          gsap.to(trails, {
            scale: 0,
            duration: 0.2,
            stagger: 0.01
          });
        }
      };

      this.boundMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        
        let isArrowTarget = false;
        if (anchor) {
          const href = anchor.getAttribute('href') || '';
          if (href.startsWith('http://') || href.startsWith('https://')) {
            isArrowTarget = true;
          } else if (
            anchor.classList.contains('nav-link') ||
            anchor.classList.contains('nav-link--primary') ||
            anchor.classList.contains('mobile-link') ||
            anchor.classList.contains('mobile-link--primary')
          ) {
            isArrowTarget = true;
          }
        }
        
        if (isArrowTarget && this.isHovering) {
          this.isHovering = false;
          el.classList.remove('hover-state');
          gsap.to(el, {
            width: 16,
            height: 16,
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.6)',
            duration: 0.3,
            ease: 'power3.out'
          });
          
          gsap.to(trails, {
            scale: 1,
            duration: 0.3,
            stagger: 0.02
          });
        }
      };

      window.addEventListener('mousemove', this.boundMouseMove, { passive: true });
      window.addEventListener('mouseover', this.boundMouseOver, { passive: true });
      window.addEventListener('mouseout', this.boundMouseOut, { passive: true });
    });
  }

  ngOnDestroy() {
    if (this.boundMouseMove) window.removeEventListener('mousemove', this.boundMouseMove);
    if (this.boundMouseOver) window.removeEventListener('mouseover', this.boundMouseOver);
    if (this.boundMouseOut) window.removeEventListener('mouseout', this.boundMouseOut);
  }
}
