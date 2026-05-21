import { Component, inject, signal, computed, ElementRef, ViewChild, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import { TranslationService } from '../services/translation.service';
import { Product, Department } from '../types';

interface ModalState {
  visible: boolean;
  type: 'INPUT' | 'CONFIRM';
  title: string;
  message?: string;
  inputValue: string;
  onConfirm: (val?: string) => void;
}

import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="h-full flex flex-col bg-transparent overflow-hidden relative print:h-auto print:overflow-visible print:block"
    >
      <!-- Grid Controls -->
      <div class="p-3 border-b border-slate-200/50 bg-white/40 flex items-center justify-between text-sm shrink-0 flex-wrap gap-3 no-print backdrop-blur-sm">
        <div class="flex items-center gap-3 sm:gap-4 flex-wrap w-full lg:w-auto justify-center lg:justify-start">
            <span class="font-semibold text-xs text-slate-600 uppercase tracking-wider">{{ ts.t('grid_layout') }}</span>
            <div class="flex items-center gap-1 bg-white/60 rounded-full p-1 shadow-sm border border-white/40">
                <button 
                  (click)="toggleFitContent()" 
                  [title]="isFitContent() ? 'Click to enable manual resizing' : 'Click to auto-fit content'" 
                  [class.bg-blue-600]="isFitContent()" 
                  [class.text-white]="isFitContent()"
                  [class.shadow-md]="isFitContent()" 
                  [class.hover:bg-blue-700]="isFitContent()"
                  [class.bg-white/50]="!isFitContent()"
                  [class.text-slate-600]="!isFitContent()"
                  [class.hover:bg-white]="!isFitContent()"
                  class="px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs transition-all font-medium flex items-center gap-1.5 sm:gap-2"
                >
                  <div class="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-colors" [class.bg-white]="isFitContent()" [class.bg-slate-400]="!isFitContent()"></div>
                  {{ ts.t('fit_content') }}
                </button>
            </div>
            <div class="h-5 w-px bg-slate-300 hidden sm:block"></div>
            <div class="flex items-center gap-1 sm:gap-1.5">
                <span class="text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider mr-1">{{ ts.t('zoom') }}</span>
                <button (click)="zoomOut()" class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105 text-xs" title="Zoom Out (Ctrl + Mouse Wheel)">-</button>
                <button (click)="resetZoom()" class="text-[11px] sm:text-xs w-11 sm:w-14 font-semibold text-slate-700 hover:text-blue-600 transition-colors text-center" title="Reset Zoom">{{ zoomLevel() * 100 | number:'1.0-0' }}%</button>
                <button (click)="zoomIn()" class="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105 text-xs" title="Zoom In (Ctrl + Mouse Wheel)">+</button>
            </div>
        </div>

        <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap justify-between w-full lg:w-auto lg:justify-end">
            <button (click)="printGrid()" class="flex-1 lg:flex-none px-3 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              {{ ts.t('print') }}
            </button>
            <button 
              (click)="confirmUsage()" 
              class="flex-1 lg:flex-none px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all hover:scale-105 shadow-md hover:shadow-lg font-medium flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs"
              [disabled]="!projectService.hasUnconfirmedChanges()"
              [class.opacity-50]="!projectService.hasUnconfirmedChanges()"
              [class.cursor-not-allowed]="!projectService.hasUnconfirmedChanges()"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {{ ts.t('confirm_usage') }}
            </button>
        </div>
      </div>

      <!-- Scrollable Grid Container -->
      <div 
        class="flex-1 overflow-auto relative z-0 printable-area print:overflow-visible print:h-auto print:block"
        (wheel)="onWheel($event)"
        [style.zoom]="zoomLevel()"
      >
        <table 
          class="border-collapse min-w-full" 
          [class.w-full]="!isFitContent()"
          [class.table-auto]="isFitContent()"
          [class.table-fixed]="!isFitContent()"
        >
          <thead class="sticky top-0 z-20 bg-slate-100 shadow-sm">
            <tr>
              <th 
                #prodHeader
                class="p-3 text-left border-b border-slate-200 bg-slate-100 font-bold text-slate-700 sticky left-0 z-30 text-xs uppercase tracking-wider whitespace-nowrap min-w-[150px]"
                [style.resize]="isFitContent() ? 'none' : 'horizontal'"
                [style.overflow]="isFitContent() ? 'visible' : 'hidden'"
                [style.width]="isFitContent() ? 'auto' : savedProdWidth"
              >
                {{ ts.t('prod_dept') }}
              </th>
              @for (dept of projectService.departments(); track dept.id; let idx = $index) {
                <th 
                  #deptHeader
                  [attr.data-id]="dept.id"
                  draggable="true"
                  (dragstart)="onDeptDragStart($event, idx)"
                  (dragover)="onDeptDragOver($event, idx)"
                  (drop)="onDeptDrop($event, idx)"
                  (dragend)="onDeptDragEnd()"
                  [class.opacity-40]="draggedDeptIndex === idx"
                  class="p-3 border-b border-r border-slate-200 text-xs font-bold text-slate-700 cursor-grab active:cursor-grabbing hover:bg-slate-200/50 transition-colors whitespace-nowrap min-w-[80px] print:p-1 print:min-w-0 print:w-10 print:align-bottom"
                  [style.resize]="isFitContent() ? 'none' : 'horizontal'"
                  [style.overflow]="isFitContent() ? 'visible' : 'hidden'"
                  [style.width]="isFitContent() ? 'auto' : (savedWidths[dept.id] || '120px')"
                  (contextmenu)="onDeptContextMenu($event, dept)"
                >
                  <div class="print:[writing-mode:vertical-rl] print:rotate-180 print:max-h-32 print:overflow-hidden print:text-left print:pl-2">
                    {{ dept.name }}
                  </div>
                </th>
              }
              <!-- Add Department Button Column -->
              <th class="p-3 w-14 min-w-[56px] max-w-[56px] border-b border-slate-200 bg-slate-50 no-print">
                 <button (click)="promptAddDept()" class="w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5" [title]="ts.t('add_new_dept')">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                 </button>
              </th>
              <!-- Total Column -->
              <th class="p-3 w-28 min-w-[112px] max-w-[112px] border-b border-l border-slate-200 bg-slate-100 text-slate-800 font-extrabold sticky right-[112px] z-20 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] text-xs uppercase tracking-wider">
                {{ ts.t('total') }}
              </th>
              <!-- Storage Column -->
              <th class="p-3 w-28 min-w-[112px] max-w-[112px] border-b border-l border-slate-200 bg-slate-100 text-slate-800 font-extrabold sticky right-0 z-20 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] text-xs uppercase tracking-wider">
                {{ ts.t('storage_quantity') }}
              </th>
            </tr>
          </thead>
          <tbody>
            @for (prod of projectService.products(); track prod.id; let idx = $index) {
              <tr 
                class="hover:bg-blue-50/40 transition-colors group"
                [class.opacity-40]="draggedProductIndex === idx"
              >
                <!-- Product Header -->
                <td 
                  draggable="true"
                  (dragstart)="onProductDragStart($event, idx)"
                  (dragover)="onProductDragOver($event, idx)"
                  (drop)="onProductDrop($event, idx)"
                  (dragend)="onProductDragEnd()"
                  class="p-3 border-b border-r border-slate-200 bg-slate-50 font-semibold text-sm text-slate-700 sticky left-0 z-10 cursor-grab active:cursor-grabbing hover:bg-slate-200 transition-colors whitespace-nowrap"
                  (contextmenu)="onProdContextMenu($event, prod)"
                >
                  <span class="inline-flex items-center gap-1.5">
                    <span class="text-slate-400 no-print font-normal select-none">⋮⋮</span>
                    {{ prod.name }}
                  </span>
                </td>

                <!-- Data Cells -->
                @for (dept of projectService.departments(); track dept.id) {
                  <td 
                    class="p-1.5 border-b border-r border-slate-100 text-center relative group-hover:border-blue-100 transition-colors"
                  >
                    <input 
                      type="number" 
                      min="0"
                      class="w-full h-full p-2 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white bg-transparent text-slate-800 rounded-lg transition-all no-print-input"
                      [value]="getQuantity(prod.id, dept.id)"
                      (change)="updateQuantity($event, prod.id, dept.id)"
                    />
                    <span class="print-only-value hidden print:inline-block w-full text-center">
                      {{ getQuantity(prod.id, dept.id) }}
                    </span>
                  </td>
                }

                <!-- Spacer for Add Dept Column -->
                <td class="w-14 min-w-[56px] max-w-[56px] border-b border-slate-200 bg-slate-50 no-print"></td>

                <!-- Row Total -->
                <td 
                  class="p-3 w-28 min-w-[112px] max-w-[112px] border-b border-l border-slate-200 font-bold text-center sticky right-[112px] z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] text-sm transition-colors"
                  [class.bg-slate-50]="!isOverLimit(prod.id)"
                  [class.text-blue-700]="!isOverLimit(prod.id)"
                  [class.text-white]="isOverLimit(prod.id)"
                  [class.bg-red-500]="isOverLimit(prod.id)"
                >
                  {{ getRowTotal(prod.id) }}
                </td>

                <!-- Row Storage -->
                <td 
                  class="p-3 w-28 min-w-[112px] max-w-[112px] border-b border-l border-slate-200 bg-slate-50 font-bold text-center sticky right-0 z-10 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] text-sm transition-colors text-slate-700"
                >
                  {{ getStorageAmount(prod.id) }}
                </td>
              </tr>
            }
            
            <!-- Add Product Row -->
            <tr class="no-print">
              <td class="p-3 border-t border-slate-200 sticky left-0 bg-white z-10">
                 <button (click)="promptAddProd()" class="w-full py-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition-all hover:scale-[1.02] text-sm font-medium">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                   {{ ts.t('add_product') }}
                 </button>
              </td>
              <td [attr.colspan]="projectService.departments().length + 3" class="bg-slate-50/50 border-t border-slate-200"></td>
            </tr>
          </tbody>
        </table>
        <!-- Date footer for printing -->
        <div class="hidden print:block text-center text-xs mt-4 font-semibold">
            Date: {{ projectService.currentDate() }}
        </div>
      </div>

      <!-- Context Menu -->
      @if (menuVisible()) {
        <div 
          class="absolute bg-white border border-gray-200 shadow-xl rounded-md z-[60] py-1 w-40 text-sm"
          [style.top.px]="menuPosition.y"
          [style.left.px]="menuPosition.x"
        >
          <div class="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50 mb-1">
            {{ menuTargetName() }}
          </div>
          <button (click)="handleRename()" class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            {{ ts.t('rename') }}
          </button>
          <button (click)="handleDelete()" class="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            {{ ts.t('delete') }}
          </button>
          <div class="border-t border-gray-100 mt-1 pt-1">
             <button (click)="closeMenu()" class="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-500">{{ ts.t('cancel') }}</button>
          </div>
        </div>
        <!-- Overlay to close menu -->
        <div class="fixed inset-0 z-[55] bg-transparent" (click)="closeMenu()"></div>
      }

      <!-- Custom Modal Overlay -->
      @if (modalState().visible) {
        <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all">
            <h3 class="text-lg font-bold text-gray-900 mb-2">{{ modalState().title }}</h3>
            
            @if (modalState().message) {
              <p class="text-sm text-gray-600 mb-4">{{ modalState().message }}</p>
            }

            @if (modalState().type === 'INPUT') {
              <input 
                #modalInput
                type="text" 
                class="w-full border border-gray-300 rounded px-3 py-2 mb-6 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                [value]="modalState().inputValue"
                (input)="updateModalInput($event)"
                (keyup.enter)="confirmModal()"
                [placeholder]="ts.t('enter_value')"
              >
            }

            <div class="flex justify-end gap-3">
              <button 
                (click)="closeModal()" 
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                {{ ts.t('cancel') }}
              </button>
              <button 
                (click)="confirmModal()" 
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                [class.bg-red-600]="modalState().type === 'CONFIRM'"
                [class.hover:bg-red-700]="modalState().type === 'CONFIRM'"
              >
                {{ modalState().type === 'INPUT' ? ts.t('save') : ts.t('confirm') }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class GridComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);

  printService = inject(PrintService);

  // Layout & Zoom State
  zoomLevel = signal(1); // CSS zoom factor
  isFitContent = signal(true); // Toggle state

  // Width Persistence
  @ViewChild('prodHeader') prodHeader!: ElementRef;
  @ViewChildren('deptHeader') deptHeaders!: QueryList<ElementRef>;
  savedProdWidth = '200px';
  savedWidths: Record<string, string> = {};

  // Context Menu State
  menuVisible = signal(false);
  menuPosition = { x: 0, y: 0 };
  menuContext: { type: 'product' | 'department', id: string, name: string } | null = null;
  menuTargetName = signal('');

  // Modal State
  modalState = signal<ModalState>({
    visible: false,
    type: 'INPUT',
    title: '',
    inputValue: '',
    onConfirm: () => { }
  });

  getQuantity(prodId: string, deptId: string): string {
    const val = this.projectService.currentGridMap().get(`${prodId}_${deptId}`);
    return val !== undefined ? val.toString() : '';
  }

  updateQuantity(event: Event, prodId: string, deptId: string) {
    const input = event.target as HTMLInputElement;
    let val = parseFloat(input.value);
    if (isNaN(val) || val < 0) val = 0;
    this.projectService.updateUsage(prodId, deptId, val);
  }

  confirmUsage() {
    this.projectService.confirmGridUsage();
  }

  getRowTotal(prodId: string): number {
    const map = this.projectService.currentGridMap();
    let total = 0;
    this.projectService.departments().forEach(d => {
      total += (map.get(`${prodId}_${d.id}`) || 0);
    });
    return total;
  }

  getStorageAmount(prodId: string): number {
    return this.projectService.currentStorageMap().get(prodId) || 0;
  }

  isOverLimit(prodId: string): boolean {
    const total = this.getRowTotal(prodId);
    const storage = this.getStorageAmount(prodId);
    return total > storage;
  }

  // --- Drag and Drop Logic ---
  draggedProductIndex: number | null = null;
  draggedDeptIndex: number | null = null;

  onProductDragStart(event: DragEvent, index: number) {
    this.draggedProductIndex = index;
    event.dataTransfer?.setData('text/plain', index.toString());
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onProductDragOver(event: DragEvent, index: number) {
    event.preventDefault();
  }

  onProductDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedProductIndex !== null && this.draggedProductIndex !== index) {
      this.projectService.reorderProducts(this.draggedProductIndex, index);
    }
    this.draggedProductIndex = null;
  }

  onProductDragEnd() {
    this.draggedProductIndex = null;
  }

  onDeptDragStart(event: DragEvent, index: number) {
    this.draggedDeptIndex = index;
    event.dataTransfer?.setData('text/plain', index.toString());
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDeptDragOver(event: DragEvent, index: number) {
    event.preventDefault();
  }

  onDeptDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedDeptIndex !== null && this.draggedDeptIndex !== index) {
      this.projectService.reorderDepartments(this.draggedDeptIndex, index);
    }
    this.draggedDeptIndex = null;
  }

  onDeptDragEnd() {
    this.draggedDeptIndex = null;
  }

  printGrid() {
    this.printService.promptPrint();
  }

  // --- Layout & Zoom Logic ---
  zoomIn() { this.zoomLevel.update(z => Math.min(2.5, z + 0.1)); }
  zoomOut() { this.zoomLevel.update(z => Math.max(0.5, z - 0.1)); }
  resetZoom() { this.zoomLevel.set(1); }

  toggleFitContent() {
    if (!this.isFitContent()) {
      // Switching FROM Manual TO Auto. Save widths first.
      if (this.prodHeader) {
        // Use style width if set, or calculated width
        const w = this.prodHeader.nativeElement.style.width;
        if (w && w !== 'auto') {
          this.savedProdWidth = w;
        } else {
          this.savedProdWidth = this.prodHeader.nativeElement.getBoundingClientRect().width + 'px';
        }
      }

      if (this.deptHeaders) {
        this.deptHeaders.forEach(header => {
          const id = header.nativeElement.getAttribute('data-id');
          const w = header.nativeElement.style.width;
          if (id) {
            if (w && w !== 'auto') {
              this.savedWidths[id] = w;
            } else {
              this.savedWidths[id] = header.nativeElement.getBoundingClientRect().width + 'px';
            }
          }
        });
      }
    }

    this.isFitContent.update(v => !v);
  }

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

  // --- Modal Logic ---

  openInputModal(title: string, initialValue: string, onConfirm: (val: string) => void) {
    this.modalState.set({
      visible: true,
      type: 'INPUT',
      title,
      inputValue: initialValue,
      onConfirm: (val) => onConfirm(val || '')
    });
    // Focus hack
    setTimeout(() => {
      const input = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (input) input.focus();
    }, 50);
  }

  openConfirmModal(title: string, message: string, onConfirm: () => void) {
    this.modalState.set({
      visible: true,
      type: 'CONFIRM',
      title,
      message,
      inputValue: '',
      onConfirm: () => onConfirm()
    });
  }

  closeModal() {
    this.modalState.update(s => ({ ...s, visible: false }));
  }

  updateModalInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.modalState.update(s => ({ ...s, inputValue: val }));
  }

  confirmModal() {
    const state = this.modalState();
    if (state.type === 'INPUT') {
      state.onConfirm(state.inputValue);
    } else {
      state.onConfirm();
    }
    this.closeModal();
  }

  // --- Feature Logic using Modals ---

  promptAddProd() {
    this.openInputModal(this.ts.t('add_new_product'), '', (name) => {
      if (name) this.projectService.addProduct(name);
    });
  }

  promptAddDept() {
    this.openInputModal(this.ts.t('add_new_dept'), '', (name) => {
      if (name) this.projectService.addDepartment(name);
    });
  }

  // --- Context Menu Logic ---

  onProdContextMenu(event: MouseEvent, prod: Product) {
    event.preventDefault();
    event.stopPropagation();
    this.openMenu(event, 'product', prod.id, prod.name);
  }

  onDeptContextMenu(event: MouseEvent, dept: Department) {
    event.preventDefault();
    event.stopPropagation();
    this.openMenu(event, 'department', dept.id, dept.name);
  }

  el = inject(ElementRef);

  openMenu(event: MouseEvent, type: 'product' | 'department', id: string, name: string) {
    const menuWidth = 160; // w-40 is 10rem = 160px
    const menuHeight = 110; // Approx height

    const zoom = this.zoomLevel();
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();

    let viewportX = rect.left + (event.offsetX * zoom);
    let viewportY = rect.top + (event.offsetY * zoom);

    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    if (viewportX + menuWidth > winWidth) {
      viewportX = viewportX - menuWidth;
    }
    if (viewportY + menuHeight > winHeight) {
      viewportY = viewportY - menuHeight;
    }

    const containerRect = this.el.nativeElement.getBoundingClientRect();
    let x = viewportX - containerRect.left;
    let y = viewportY - containerRect.top;

    this.menuPosition = { x, y };
    this.menuContext = { type, id, name };
    this.menuTargetName.set(name);
    this.menuVisible.set(true);
  }

  closeMenu() {
    this.menuVisible.set(false);
    this.menuContext = null;
  }

  handleRename() {
    if (!this.menuContext) return;
    const { type, id, name } = this.menuContext;
    this.closeMenu(); // Close menu first

    this.openInputModal(`${this.ts.t('rename')} ${name}`, name, (newName) => {
      if (newName && newName !== name) {
        if (type === 'product') {
          this.projectService.renameProduct(id, newName);
        } else {
          this.projectService.renameDepartment(id, newName);
        }
      }
    });
  }

  handleDelete() {
    if (!this.menuContext) return;
    const { type, id, name } = this.menuContext;
    this.closeMenu();

    this.openConfirmModal(
      this.ts.t('confirm_deletion_title'),
      `${this.ts.t('confirm_deletion_msg')} ${name}?`,
      () => {
        if (type === 'product') {
          this.projectService.deleteProduct(id);
        } else {
          this.projectService.deleteDepartment(id);
        }
      }
    );
  }
}