import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrintService } from '../services/print.service';
import { TranslationService } from '../services/translation.service';

@Component({
  selector: 'app-print-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (printService.isModalOpen()) {
      <div class="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm print:hidden">
        <div class="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-200">
          <h3 class="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            {{ ts.t('print_options') }}
          </h3>
          
          <div class="space-y-3 mb-6">
            <button (click)="printService.confirmPrint('fit')" class="w-full text-left p-4 rounded border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group">
               <div class="font-bold text-gray-800 group-hover:text-blue-700">{{ ts.t('smart_fit') }}</div>
               <div class="text-sm text-gray-500">{{ ts.t('smart_fit_desc') }}</div>
            </button>
            
            <button (click)="printService.confirmPrint('multi')" class="w-full text-left p-4 rounded border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group">
               <div class="font-bold text-gray-800 group-hover:text-blue-700">{{ ts.t('multi_page') }}</div>
               <div class="text-sm text-gray-500">{{ ts.t('multi_page_desc') }}</div>
            </button>
          </div>
          
          <div class="flex justify-end">
            <button (click)="printService.cancelPrint()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
               {{ ts.t('cancel') }}
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class PrintModalComponent {
  printService = inject(PrintService);
  ts = inject(TranslationService);
}
