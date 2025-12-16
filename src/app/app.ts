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

  scrollTo(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth' });
  }

  openModal(item: any) {
    this.activeModalData = item;
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.activeModalData = null;
    document.body.style.overflow = '';
  }

  @HostListener('document:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent | Event) {
    if (event instanceof KeyboardEvent && this.activeModalData) {
      this.closeModal();
    }
  }
}
