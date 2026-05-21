import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import { TranslationService } from '../services/translation.service';
import { Product } from '../types';
import { DateUtils } from '../services/date.utils';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface MonthlyData {
  [productAndMonthKey: string]: {
    sum: number;
    datesWithEntries: Set<string>;
  };
}

import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-monthly-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div 
      class="h-full flex flex-col gap-5 p-5 bg-transparent outline-none printable-area print:h-auto print:overflow-visible print:block"
    >
      <!-- Controls -->
      <div class="bg-white/40 p-5 rounded-2xl shadow-sm border border-slate-200/50 flex flex-wrap gap-5 items-center justify-between no-print backdrop-blur-md">
        <div class="flex flex-wrap gap-5 items-end">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('start_date') }}</label>
              <input 
                type="date" 
                [ngModel]="projectService.analysisStartDate()" 
                (ngModelChange)="projectService.analysisStartDate.set($event)"
                class="px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white"
              />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('end_date') }}</label>
              <input 
                type="date" 
                [ngModel]="projectService.analysisEndDate()" 
                (ngModelChange)="projectService.analysisEndDate.set($event)"
                class="px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white"
              />
            </div>
            <div>
               <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('method') }}</label>
                <select [ngModel]="method()" (ngModelChange)="method.set($event)" class="w-full text-sm font-medium bg-white/80 border border-slate-200 shadow-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white">
                  <option value="sum">{{ ts.t('total_per_month') }}</option>
                  <option value="avg">{{ ts.t('avg_per_day') }}</option>
                </select>
            </div>
        </div>

        <div class="flex items-center gap-4">
            <button (click)="printGrid()" class="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              {{ ts.t('print') }}
            </button>
            <button (click)="exportToExcel()" class="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
              {{ ts.t('export_excel') }}
            </button>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-1.5 ml-2">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-widest mr-1">{{ ts.t('zoom') }}</span>
              <button (click)="zoomOut()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">-</button>
              <button (click)="resetZoom()" class="text-sm w-14 font-semibold text-slate-700 hover:text-blue-600 transition-colors text-center">{{ zoomLevel() * 100 | number:'1.0-0' }}%</button>
              <button (click)="zoomIn()" class="w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">+</button>
            </div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/50 overflow-auto flex flex-col print:overflow-visible print:border-none print:shadow-none print:bg-transparent print:h-auto print:block" (wheel)="onWheel($event)" [style.zoom]="zoomLevel()">
          <div class="p-4 border-b border-slate-200/50 flex justify-between items-center bg-slate-100/50 sticky top-0 z-10 no-print">
            <h3 class="font-bold text-slate-700 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {{ ts.t('analysis_results') }}
            </h3>
          </div>
          <table class="w-full text-sm text-left border-collapse">
            <thead class="bg-slate-50/90 backdrop-blur-md text-xs text-slate-600 uppercase tracking-wider font-bold sticky top-0 z-10">
              <tr>
                <th class="px-5 py-4 border-b border-r border-slate-200/60 sticky left-0 bg-slate-50/90 z-20">{{ ts.t('product') }}</th>
                @for (month of monthsInRange(); track month) {
                  <th class="px-5 py-4 border-b border-r border-slate-200/60 text-center">{{ formatMonthHeader(month) }}</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (prod of projectService.products(); track prod.id) {
                <tr class="hover:bg-blue-50/40 border-b border-slate-100/50 transition-colors group">
                  <td class="px-5 py-3 font-semibold text-slate-800 sticky left-0 bg-white/90 group-hover:bg-blue-50/40 border-r border-slate-200/60">{{ prod.name }}</td>
                  @for (month of monthsInRange(); track month) {
                    <td class="px-5 py-3 text-right border-r border-slate-100/50 font-medium text-slate-600 group-hover:text-blue-700 transition-colors">
                      {{ formatValue(getDisplayValue(prod.id, month)) }}
                    </td>
                  }
                </tr>
              }
            </tbody>
            <tfoot class="sticky bottom-0 bg-slate-100/90 backdrop-blur-md shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <tr>
                  <td class="px-5 py-3 font-bold text-slate-800 sticky left-0 bg-slate-100/90 border-r border-slate-200/60 uppercase tracking-wider text-xs">{{ ts.t('total_patient_visits') }}</td>
                  @for (month of monthsInRange(); track month) {
                    <td class="p-2 border-r border-slate-200/60">
                      <input 
                        type="number"
                        min="0"
                        class="w-full h-full p-2 text-right text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white rounded-lg transition-all bg-transparent text-slate-700 placeholder-slate-400 no-print-input"
                        [ngModel]="getPatientVisits(month)"
                        (ngModelChange)="updatePatientVisits(month, $event)"
                        placeholder="N/A"
                      />
                      <span class="print-only-value hidden print:inline-block w-full text-right text-slate-700 font-bold">
                        {{ getPatientVisits(month) || 'N/A' }}
                      </span>
                    </td>
                  }
               </tr>
            </tfoot>
          </table>
          @if (projectService.products().length === 0) {
            <div class="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
               <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
               <span class="font-medium text-sm">{{ ts.t('no_products_found') }}</span>
            </div>
          }
      </div>
    </div>
  `
})
export class MonthlyAnalysisComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);
  printService = inject(PrintService);

  method = signal<'sum' | 'avg'>('sum');
  zoomLevel = signal(1);

  monthsInRange = computed(() => {
    const start = new Date(this.projectService.analysisStartDate());
    const end = new Date(this.projectService.analysisEndDate());
    const months: string[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      months.push(`${current.getFullYear()}-${(current.getMonth() + 1).toString().padStart(2, '0')}`);
      current.setMonth(current.getMonth() + 1);
    }
    return months;
  });

  analysisData = computed<MonthlyData>(() => {
    const start = new Date(this.projectService.analysisStartDate());
    const end = new Date(this.projectService.analysisEndDate());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const data: MonthlyData = {};
    const usageInRange = this.projectService.usage().filter(u => {
      const d = DateUtils.parseDate(u.date);
      return d >= start && d <= end;
    });

    for (const u of usageInRange) {
      const d = DateUtils.parseDate(u.date);
      const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      const key = `${u.productId}_${monthKey}`;

      if (!data[key]) {
        data[key] = { sum: 0, datesWithEntries: new Set<string>() };
      }
      data[key].sum += u.quantity;
      data[key].datesWithEntries.add(u.date);
    }
    return data;
  });

  formatMonthHeader(monthKey: string): string {
    const parts = monthKey.split('-');
    if (parts.length === 2) {
      const yy = parts[0].slice(-2);
      const mm = parts[1];
      return `${yy}.${mm}`;
    }
    return monthKey;
  }

  getDisplayValue(prodId: string, month: string): number {
    const data = this.analysisData()[`${prodId}_${month}`];
    if (!data) return 0;

    if (this.method() === 'sum') {
      return data.sum;
    } else { // avg
      const daysWithEntries = data.datesWithEntries.size;
      return daysWithEntries > 0 ? data.sum / daysWithEntries : 0;
    }
  }

  formatValue(value: number): string {
    if (value === null || value === undefined) return '';
    if (value % 1 === 0) {
      return value.toFixed(0);
    }
    return value.toFixed(2);
  }

  getPatientVisits(month: string): number | null {
    return this.projectService.patientVisits()[month] || null;
  }

  updatePatientVisits(month: string, value: number | null) {
    const count = Number(value);
    if (!isNaN(count)) {
      this.projectService.updatePatientVisits(month, count);
    }
  }

  // --- Actions ---
  printGrid() {
    this.printService.promptPrint();
  }

  async exportToExcel() {
    const months = this.monthsInRange();
    const products = this.projectService.products();

    if (products.length === 0) {
      alert("No data to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Monthly Analysis');

    // Header Row
    const headerRow = ['Product', ...months.map(m => this.formatMonthHeader(m))];
    const header = sheet.addRow(headerRow);
    header.eachCell((cell, colNumber) => {
      cell.font = { bold: true };
      cell.border = {
        top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'}
      };
      if (colNumber > 1) {
        cell.alignment = { textRotation: 90, vertical: 'bottom', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });

    // Product Rows
    products.forEach(prod => {
      const rowData: any[] = [prod.name];
      months.forEach(month => {
        rowData.push(this.getDisplayValue(prod.id, month));
      });
      const row = sheet.addRow(rowData);
      row.eachCell((cell, colNumber) => {
         cell.border = {
           top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
         };
         if (colNumber > 1) {
           const val = cell.value;
           if (typeof val === 'number') {
             cell.numFmt = (val % 1 === 0) ? '0' : '0.00';
           }
         }
      });
    });

    // Patient Visits Row
    const patientRowData: any[] = ["Total Patient Visits"];
    months.forEach(month => {
      patientRowData.push(this.getPatientVisits(month) || '');
    });
    const pRow = sheet.addRow(patientRowData);
    pRow.eachCell((cell, colNumber) => {
       cell.border = {
         top: {style:'medium'}, left: {style:'thin'}, bottom: {style:'medium'}, right: {style:'thin'}
       };
       cell.font = { bold: true };
       if (colNumber > 1 && typeof cell.value === 'number') {
         cell.numFmt = (cell.value % 1 === 0) ? '0' : '0.00';
       }
    });

    // Auto-fit columns
    const colCount = sheet.columnCount;
    for (let colIdx = 1; colIdx <= colCount; colIdx++) {
      const column = sheet.getColumn(colIdx);
      const i = colIdx - 1;
      let maxLength = 0;
      column.eachCell!({ includeEmpty: true }, cell => {
        let valStr = '';
        if (cell.value !== null && cell.value !== undefined) {
          if (typeof cell.value === 'number') {
            valStr = (cell.value % 1 === 0) ? cell.value.toFixed(0) : cell.value.toFixed(2);
          } else {
            valStr = cell.value.toString();
          }
        }
        const columnLength = valStr.length;
        // Ignore header row (row 1) for vertical text columns
        if (i > 0 && String(cell.row) === '1') {
            return;
        }
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      
      if (i > 0) {
         column.width = Math.max(8, maxLength + 2.5);
      } else {
         column.width = Math.max(12, maxLength + 3);
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Monthly - ${this.projectService.analysisStartDate()} to ${this.projectService.analysisEndDate()}.xlsx`;
    saveAs(new Blob([buffer]), filename);
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
