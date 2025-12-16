import { Component, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RESUME_DATA } from '../shared/resume.data';




@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('jainil-portfolio');
  data = RESUME_DATA;
  activeModalData: any = null;
  isMenuOpen = false;
  showScrollTop = false;

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
    this.isMenuOpen = forceState ?? !this.isMenuOpen;
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
