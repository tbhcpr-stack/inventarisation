import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import { TranslationService } from '../services/translation.service';

import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-storage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="h-full flex flex-col bg-transparent overflow-hidden relative print:h-auto print:overflow-visible print:block"
    >
      <!-- Controls Bar -->
      <div class="p-3 border-b border-slate-200/50 bg-white/40 flex items-center justify-between text-xs shrink-0 sticky top-0 z-50 flex-wrap gap-3 no-print backdrop-blur-sm">
         <div class="flex items-center gap-4 text-slate-500 font-medium">
            <span class="bg-blue-50/80 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">{{ ts.t('storage_auto_calculated') }}</span>
         </div>
         
         <div class="flex items-center gap-4 flex-wrap justify-end">
            <!-- Settings & History & Import -->
            <button (click)="openSettings()" class="text-slate-500 hover:text-blue-600 transition-colors p-1.5 hover:bg-white/60 rounded-full" [title]="ts.t('product_settings')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            
            <button (click)="openHistory()" class="text-slate-500 hover:text-blue-600 transition-colors p-1.5 hover:bg-white/60 rounded-full" [title]="ts.t('import_history')">
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </button>

            <!-- Regular Import -->
            <label class="px-4 py-1.5 bg-white/80 border border-slate-200 shadow-sm rounded-full hover:bg-white hover:shadow-md cursor-pointer flex items-center gap-2 text-xs font-medium text-slate-700 transition-all">
                <input type="file" accept=".xlsx, .xlsm, .xls, .csv" class="hidden" (change)="handleInvoiceImport($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                {{ ts.t('import_invoice') }}
            </label>

            <!-- RS.GE Import (Automated Process Shortcut) -->
            <label class="px-4 py-1.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 shadow-sm rounded-full hover:from-indigo-100 hover:to-blue-100 cursor-pointer flex items-center gap-2 text-xs font-semibold text-indigo-700 transition-all hover:shadow-md" [title]="ts.t('import_rs_tooltip')">
                <input type="file" accept=".xlsx, .xlsm, .xls, .csv" class="hidden" (change)="handleInvoiceImport($event)">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                {{ ts.t('import_rs') }}
            </label>

            <div class="h-5 w-px bg-slate-200 mx-1"></div>

            <button (click)="printStorage()" class="px-3 py-1.5 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-all hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center gap-2 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              {{ ts.t('print') }}
            </button>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-1.5 ml-2">
                <span class="text-xs font-semibold text-slate-600 uppercase tracking-wider mr-1">{{ ts.t('zoom') }}</span>
                <button (click)="zoomOut()" class="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">-</button>
                <button (click)="resetZoom()" class="text-xs w-14 font-semibold text-slate-700 hover:text-blue-600 transition-colors text-center">{{ zoomLevel() * 100 | number:'1.0-0' }}%</button>
                <button (click)="zoomIn()" class="w-7 h-7 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">+</button>
            </div>
         
            <!-- Confirm Orders Button -->
            <div class="h-5 w-px bg-slate-200 mx-1"></div>
            
            <button 
              (click)="confirmOrders()" 
              class="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full hover:from-emerald-600 hover:to-green-700 transition-all hover:shadow-lg shadow-md font-medium flex items-center gap-2 text-xs"
              [disabled]="!hasOrders()"
              [class.opacity-50]="!hasOrders()"
              [class.hover:scale-105]="hasOrders()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {{ ts.t('confirm_orders') }}
            </button>
         </div>
      </div>

      <!-- Scrollable Grid Container -->
      <div class="flex-1 overflow-auto relative z-0 printable-area print:overflow-visible print:h-auto print:block" (wheel)="onWheel($event)" [style.zoom]="zoomLevel()">
        <table class="w-full border-collapse table-auto">
          <thead class="sticky top-0 z-20 bg-slate-100/90 backdrop-blur-md shadow-sm">
            <tr>
              <th class="p-3 text-left border-b border-r border-slate-200 bg-slate-100/90 backdrop-blur-md font-bold text-slate-700 sticky left-0 z-30 text-xs uppercase tracking-wider w-1/3">
                {{ ts.t('product') }}
              </th>
              <!-- Storage Input Column -->
              <th class="p-3 border-b border-r border-slate-200 text-xs font-bold text-slate-800 uppercase tracking-wider w-1/4">
                 {{ ts.t('storage_quantity') }}
              </th>
              <!-- Ordered Input Column -->
              <th class="p-3 border-b border-slate-200 text-xs font-bold text-indigo-700 uppercase tracking-wider w-1/4">
                 {{ ts.t('ordered') }}
              </th>
              <!-- Spacer -->
              <th class="p-3 border-b border-slate-200 bg-slate-50/50 text-xs"></th>
            </tr>
          </thead>
          <tbody>
            @for (prod of projectService.products(); track prod.id) {
              <tr class="hover:bg-blue-50/40 transition-colors group">
                <!-- Product Name -->
                <td class="p-3 border-b border-r border-slate-200 bg-slate-50/80 font-semibold text-sm text-slate-700 sticky left-0 z-10">
                  {{ prod.name }}
                </td>

                <!-- Storage Input -->
                <td 
                  class="p-1.5 border-b border-r border-slate-200 text-center relative group-hover:border-blue-100 transition-colors"
                  [class.bg-red-500]="isOverLimit(prod.id)"
                >
                  <input 
                    type="number" 
                    min="0"
                    class="w-full h-full p-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 rounded-lg transition-all no-print-input"
                    [class.bg-transparent]="!isOverLimit(prod.id)"
                    [class.bg-red-500]="isOverLimit(prod.id)"
                    [class.text-white]="isOverLimit(prod.id)"
                    [class.text-slate-800]="!isOverLimit(prod.id)"
                    [class.focus:bg-red-500]="isOverLimit(prod.id)"
                    [class.focus:bg-white]="!isOverLimit(prod.id)"
                    [class.focus:ring-red-400]="isOverLimit(prod.id)"
                    [class.focus:ring-blue-400]="!isOverLimit(prod.id)"
                    [value]="getStorage(prod.id)"
                    (change)="updateStorage($event, prod.id)"
                    placeholder="0"
                  />
                  <span class="print-only-value hidden print:inline-block w-full text-center">
                    {{ getStorage(prod.id) }}
                  </span>
                </td>

                <!-- Ordered Input -->
                <td class="p-1.5 border-b border-slate-200 text-center relative bg-indigo-50/30 group-hover:border-indigo-200 transition-colors">
                  <input 
                    type="number" 
                    min="0"
                    class="w-full h-full p-2 text-center text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-indigo-50 bg-transparent rounded-lg transition-all placeholder-indigo-300 no-print-input"
                    [value]="getOrder(prod.id)"
                    (input)="updateOrder($event, prod.id)"
                    (keyup.enter)="confirmOrders()"
                    placeholder="0"
                  />
                  <span class="print-only-value hidden print:inline-block w-full text-center text-indigo-700 font-bold">
                    {{ getOrder(prod.id) }}
                  </span>
                </td>

                <td class="border-b border-slate-200 bg-slate-50/50"></td>
              </tr>
            }
            @if (projectService.products().length === 0) {
               <tr>
                 <td colspan="4" class="p-12 text-center text-slate-400 text-sm font-medium">
                    {{ ts.t('no_products_found') }}
                 </td>
               </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Settings Modal -->
      @if (showSettings()) {
          <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-gray-200">
               <!-- Header -->
               <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                  <h3 class="font-bold text-lg text-gray-800">{{ ts.t('product_settings') }}</h3>
                  <button (click)="closeSettings()" class="text-gray-500 hover:text-gray-700 transition-colors rounded-full p-1 hover:bg-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               
               <!-- Content -->
               <div class="flex-1 overflow-auto p-4">
                  <table class="w-full text-sm text-left border-collapse">
                     <thead class="bg-gray-100 text-xs text-gray-700 uppercase sticky top-0">
                        <tr>
                           <th class="px-4 py-3 border-b">{{ ts.t('product') }}</th>
                           <th class="px-4 py-3 border-b w-24">{{ ts.t('pack_size') }}</th>
                           <th class="px-4 py-3 border-b">{{ ts.t('keywords') }}</th>
                        </tr>
                     </thead>
                     <tbody class="divide-y divide-gray-100">
                        @for (prod of projectService.products(); track prod.id) {
                           <tr class="hover:bg-gray-50">
                              <td class="px-4 py-2 font-medium text-gray-900">{{ prod.name }}</td>
                              <td class="px-4 py-2">
                                 <input 
                                    type="number" 
                                    min="1" 
                                    class="w-full border border-gray-300 rounded px-2 py-1 text-center" 
                                    [value]="prod.packSize || 1"
                                    (change)="updateProdSettings($event, prod.id, 'packSize')"
                                 />
                              </td>
                              <td class="px-4 py-2">
                                 <input 
                                    type="text" 
                                    class="w-full border border-gray-300 rounded px-2 py-1" 
                                    [value]="(prod.keywords || []).join(', ')"
                                    (change)="updateProdSettings($event, prod.id, 'keywords')"
                                    [placeholder]="ts.t('keywords_ph')"
                                 />
                              </td>
                           </tr>
                        }
                     </tbody>
                  </table>
               </div>

               <!-- Footer -->
               <div class="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
                   <button (click)="closeSettings()" class="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                      {{ ts.t('confirm') }}
                   </button>
               </div>
            </div>
          </div>
      }

      <!-- History Modal -->
      @if (showHistory()) {
          <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div class="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh] border border-gray-200">
               <!-- Header -->
               <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
                  <h3 class="font-bold text-lg text-gray-800">{{ ts.t('import_history') }}</h3>
                  <button (click)="closeHistory()" class="text-gray-500 hover:text-gray-700 transition-colors rounded-full p-1 hover:bg-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
               </div>
               
               <!-- Content -->
               <div class="flex-1 overflow-auto p-4">
                  @if (groupedHistory().length > 0) {
                      <table class="w-full text-sm text-left border-collapse">
                         <thead class="bg-gray-100 text-xs text-gray-700 uppercase sticky top-0">
                            <tr>
                               <th class="px-4 py-3 border-b">{{ ts.t('waybill') }}</th>
                               <th class="px-4 py-3 border-b">{{ ts.t('load_saved_date') }}</th>
                               <th class="px-4 py-3 border-b text-center">{{ ts.t('items') }}</th>
                               <th class="px-4 py-3 border-b text-right"></th>
                            </tr>
                         </thead>
                         <tbody class="divide-y divide-gray-100">
                            @for (item of groupedHistory(); track item.waybill) {
                               <tr class="hover:bg-gray-50">
                                  <td class="px-4 py-2 font-medium text-gray-900 font-mono">{{ item.waybill }}</td>
                                  <td class="px-4 py-2 text-gray-600">{{ item.date }}</td>
                                  <td class="px-4 py-2 text-center text-gray-600">{{ item.count }}</td>
                                  <td class="px-4 py-2 text-right">
                                      <button (click)="deleteHistoryItem(item.waybill)" class="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded" [title]="ts.t('delete_import')">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                      </button>
                                  </td>
                               </tr>
                            }
                         </tbody>
                      </table>
                  } @else {
                      <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                         <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                         <span class="text-sm">{{ ts.t('no_imports') }}</span>
                      </div>
                  }
               </div>

               <!-- Footer -->
               <div class="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg flex justify-end">
                   <button (click)="closeHistory()" class="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm font-medium hover:bg-gray-300 transition-colors">
                      {{ ts.t('cancel') }}
                   </button>
               </div>
            </div>
          </div>
      }
    </div>
  `
})
export class StorageComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);
  printService = inject(PrintService);

  zoomLevel = signal(1);

  printStorage() {
    this.printService.promptPrint();
  }
  showSettings = signal(false);
  showHistory = signal(false);

  // Local state for ordered amounts before confirmation
  orderedMap = signal<Map<string, number>>(new Map());

  // Tracks source waybill and original names for pending items to save history on confirm
  // Key: productId -> { waybill: string, names: string[] }
  pendingImports = signal<Map<string, { waybill: string, names: string[] }>>(new Map());

  // Grouped History for Display
  groupedHistory = computed(() => {
    const history = this.projectService.importHistory();
    const groups = new Map<string, { waybill: string, date: string, count: number }>();

    history.forEach(item => {
      if (!groups.has(item.waybillNumber)) {
        groups.set(item.waybillNumber, { waybill: item.waybillNumber, date: item.date, count: 0 });
      }
      groups.get(item.waybillNumber)!.count++;
    });

    return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
  });

  getStorage(prodId: string): string {
    const val = this.projectService.currentStorageMap().get(prodId);
    return val !== undefined ? val.toString() : '';
  }

  updateStorage(event: Event, prodId: string) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.projectService.updateStorage(prodId, val);
  }

  // --- Ordered Logic ---

  getOrder(prodId: string): string {
    const val = this.orderedMap().get(prodId);
    return val && val > 0 ? val.toString() : '';
  }

  updateOrder(event: Event, prodId: string) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;

    this.orderedMap.update(map => {
      const newMap = new Map(map);
      if (val > 0) newMap.set(prodId, val);
      else newMap.delete(prodId);
      return newMap;
    });
  }

  hasOrders(): boolean {
    return this.orderedMap().size > 0;
  }

  confirmOrders() {
    const orders = this.orderedMap();
    if (orders.size === 0) return;

    const currentStorage = this.projectService.currentStorageMap();
    const pendingSources = this.pendingImports();

    orders.forEach((orderAmount, prodId) => {
      const currentAmount = currentStorage.get(prodId) || 0;
      this.projectService.updateStorage(prodId, currentAmount + orderAmount);

      // Save Import History if this product came from a waybill
      const pending = pendingSources.get(prodId);
      if (pending) {
        this.projectService.recordImport(pending.waybill, prodId, orderAmount, pending.names);
      }
    });

    // Clear orders and pending sources
    this.orderedMap.set(new Map());
    this.pendingImports.set(new Map());
  }

  // --- Invoice Logic ---

  async handleInvoiceImport(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      try {
        const result = await this.projectService.parseInvoice(input.files[0]);
        if (result.orders.size > 0) {
          this.orderedMap.update(map => {
            const newMap = new Map(map);
            result.orders.forEach((qty, id) => {
              const existing = newMap.get(id) || 0;
              newMap.set(id, existing + qty);
            });
            return newMap;
          });

          // If a waybill number was found, track it and names for history saving later
          if (result.waybillNumber) {
            this.pendingImports.update(map => {
              const newMap = new Map(map);
              result.orders.forEach((_, id) => {
                newMap.set(id, {
                  waybill: result.waybillNumber!,
                  names: result.productNames.get(id) || []
                });
              });
              return newMap;
            });
          }

          alert(`${this.ts.t('invoice_imported')}: ${result.orders.size} ${this.ts.t('products_matched')}`);
        } else {
          alert("No matching products found or all items were duplicates (already imported).");
        }
      } catch (e: any) {
        alert("Error parsing invoice: " + e.message);
      }
    }
    // Reset input
    input.value = '';
  }

  // --- Settings Logic ---

  openSettings() {
    this.showSettings.set(true);
  }

  closeSettings() {
    this.showSettings.set(false);
  }

  // --- History Logic ---

  openHistory() {
    this.showHistory.set(true);
  }

  closeHistory() {
    this.showHistory.set(false);
  }

  deleteHistoryItem(waybill: string) {
    if (confirm(`${this.ts.t('delete_import')} ${waybill}?`)) {
      this.projectService.deleteImport(waybill);
    }
  }

  updateProdSettings(event: Event, prodId: string, type: 'keywords' | 'packSize') {
    const input = event.target as HTMLInputElement;
    if (type === 'packSize') {
      const val = parseFloat(input.value);
      const currentProd = this.projectService.products().find(p => p.id === prodId);
      if (currentProd) {
        this.projectService.updateProductSettings(prodId, currentProd.keywords || [], val);
      }
    } else {
      // Keywords
      const val = input.value;
      const keywords = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      const currentProd = this.projectService.products().find(p => p.id === prodId);
      if (currentProd) {
        this.projectService.updateProductSettings(prodId, keywords, currentProd.packSize || 1);
      }
    }
  }


  // --- Limit Logic ---
  isOverLimit(prodId: string): boolean {
    const map = this.projectService.currentGridMap();
    let totalUsage = 0;
    this.projectService.departments().forEach(d => {
      totalUsage += (map.get(`${prodId}_${d.id}`) || 0);
    });

    const storage = this.projectService.currentStorageMap().get(prodId) || 0;
    return totalUsage > storage;
  }

  // --- Zoom Logic ---
  zoomIn() { this.zoomLevel.update(z => Math.min(2.5, z + 0.1)); }
  zoomOut() { this.zoomLevel.update(z => Math.max(0.5, z - 0.1)); }
  resetZoom() { this.zoomLevel.set(1); }

  onWheel(event: WheelEvent) {
    if (event.ctrlKey) {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      this.zoomLevel.update(z => {
        const newZoom = z + direction * 0.1;
        return Math.max(0.5, Math.min(2.5, newZoom));
      });
    }
  }
}