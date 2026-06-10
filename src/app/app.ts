import { Component, signal, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FluidBackgroundComponent } from './fluid-background/fluid-background.component';
import { CursorComponent } from './cursor/cursor.component';
import { RESUME_DATA } from '../shared/resume.data';
import gsap from 'gsap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FluidBackgroundComponent, CursorComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class App implements AfterViewInit {
  @ViewChild('mobileMenu') mobileMenu!: ElementRef;
  private menuTl: gsap.core.Timeline | null = null;
  protected readonly title = signal('jainil-portfolio');
  data = RESUME_DATA;
  activeModalData: any = null;
  isMenuOpen = false;
  showScrollTop = false;

  ngAfterViewInit() {
    this.menuTl = gsap.timeline({ paused: true, reversed: true });
    
    if (this.mobileMenu) {
      this.menuTl.to(this.mobileMenu.nativeElement, {
        display: 'block',
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: 'power3.out'
      });
      
      const links = this.mobileMenu.nativeElement.querySelectorAll('.mobile-link, .mobile-link--primary');
      if (links.length) {
        this.menuTl.from(links, {
          opacity: 0,
          y: -10,
          stagger: 0.05,
          duration: 0.2,
          ease: 'power3.out'
        }, "-=0.15");
      }
    }
  }

  scrollTo(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
    if (this.isMenuOpen) {
      this.toggleMenu(false);
    }
  }

  openModal(item: any) {
    this.activeModalData = item;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.activeModalData = null;
    document.body.style.overflow = '';
  }

  toggleMenu(forceState?: boolean) {
    const targetState = forceState ?? !this.isMenuOpen;
    if (targetState !== this.isMenuOpen) {
      this.isMenuOpen = targetState;
      if (this.isMenuOpen) {
        this.menuTl?.play();
      } else {
        this.menuTl?.reverse();
      }
    }
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showScrollTop = window.scrollY > 400;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent | Event) {
    if (event instanceof KeyboardEvent && this.activeModalData) {
      this.closeModal();
    }
  }
}
