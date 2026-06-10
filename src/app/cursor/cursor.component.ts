import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
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
      
      // Center the transform origin
      gsap.set(el, { xPercent: -50, yPercent: -50 });
      
      this.quickToX = gsap.quickTo(el, 'x', { duration: 0.15, ease: 'power3.out' });
      this.quickToY = gsap.quickTo(el, 'y', { duration: 0.15, ease: 'power3.out' });

      // Initially place the cursor off-screen to prevent a flash at 0,0
      gsap.set(el, { x: -100, y: -100 });

      this.boundMouseMove = (e: MouseEvent) => {
        this.quickToX(e.clientX);
        this.quickToY(e.clientY);
      };

      this.boundMouseOver = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        
        let isLink = false;
        if (anchor) {
          const href = anchor.getAttribute('href');
          // Check if it's an actual navigation link
          if (href && href !== '#' && href.trim() !== '') {
            isLink = true;
          }
        }
        
        if (isLink && !this.isHovering) {
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
        }
      };

      this.boundMouseOut = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const anchor = target.closest('a');
        
        let isLink = false;
        if (anchor) {
          const href = anchor.getAttribute('href');
          if (href && href !== '#' && href.trim() !== '') {
            isLink = true;
          }
        }
        
        if (isLink && this.isHovering) {
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
