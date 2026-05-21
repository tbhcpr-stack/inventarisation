import { Injectable, signal } from '@angular/core';

export type PrintMode = 'fit' | 'multi';

@Injectable({
  providedIn: 'root'
})
export class PrintService {
  isModalOpen = signal(false);
  printMode = signal<PrintMode>('fit');

  promptPrint() {
    this.isModalOpen.set(true);
  }

  confirmPrint(mode: PrintMode) {
    this.printMode.set(mode);

    // Wait for change detection to update classes
    setTimeout(() => {
      console.log('Printing with mode:', mode);
      window.print();
      this.isModalOpen.set(false);
    }, 100);
  }

  cancelPrint() {
    this.isModalOpen.set(false);
  }
}
