import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import { TranslationService } from '../services/translation.service';
import { DateUtils } from '../services/date.utils';
import { AnalysisResult } from '../types';

import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col bg-transparent p-3.5 sm:p-5 printable-area print:h-auto print:overflow-visible print:block">
      <!-- Controls -->
      <div class="bg-white/40 p-3.5 sm:p-5 rounded-2xl shadow-sm border border-slate-200/50 flex flex-wrap gap-4 sm:gap-5 items-end justify-between no-print backdrop-blur-md">
        <div class="flex flex-wrap gap-3 sm:gap-4 items-end w-full lg:w-auto">
          <div class="flex-1 min-w-[120px] sm:flex-initial w-full">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('start_date') }}</label>
            <input 
              type="date" 
              [ngModel]="projectService.analysisStartDate()" 
              (ngModelChange)="projectService.analysisStartDate.set($event)"
              (keyup.enter)="runAnalysis()"
              class="w-full px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white"
            />
          </div>
          <div class="flex-1 min-w-[120px] sm:flex-initial w-full">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('end_date') }}</label>
            <input 
              type="date" 
              [ngModel]="projectService.analysisEndDate()" 
              (ngModelChange)="projectService.analysisEndDate.set($event)"
              (keyup.enter)="runAnalysis()"
              class="w-full px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white"
            />
          </div>
          <div class="flex-1 min-w-[130px] sm:flex-initial w-full">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('product') || 'Product' }}</label>
            <select
              [ngModel]="selectedProdId()" 
              (ngModelChange)="selectedProdId.set($event); runAnalysis()"
              class="w-full px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white min-w-[140px]"
            >
              <option value="">{{ ts.t('all_products') || 'All Products' }}</option>
              @for (prod of projectService.products(); track prod.id) {
                <option [value]="prod.id">{{ prod.name }}</option>
              }
            </select>
          </div>
          <div class="flex-1 min-w-[130px] sm:flex-initial w-full">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{{ ts.t('department') || 'Department' }}</label>
            <select
              [ngModel]="selectedDeptId()" 
              (ngModelChange)="selectedDeptId.set($event); runAnalysis()"
              class="w-full px-4 py-2.5 bg-white/80 border border-slate-200 shadow-sm rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 focus:outline-none transition-all hover:bg-white min-w-[140px]"
            >
              <option value="">{{ ts.t('all_departments') || 'All Departments' }}</option>
              @for (dept of projectService.departments(); track dept.id) {
                <option [value]="dept.id">{{ dept.name }}</option>
              }
            </select>
          </div>
          <button 
            (click)="runAnalysis()"
            class="flex-1 sm:flex-initial w-full px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            {{ ts.t('analyze_range') }}
          </button>
        </div>

        <div class="flex items-center gap-3 sm:gap-4 justify-between w-full lg:w-auto lg:justify-end mt-2 lg:mt-0 flex-wrap">
            <button (click)="printAnalysis()" class="flex-1 lg:flex-none px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              {{ ts.t('print') }}
            </button>

            <!-- Zoom Controls -->
            <div class="flex-1 lg:flex-initial justify-center flex items-center gap-1.5">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-widest mr-1">{{ ts.t('zoom') }}</span>
              <button (click)="zoomOut()" class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">-</button>
              <button (click)="resetZoom()" class="text-sm w-14 font-semibold text-slate-700 hover:text-blue-600 transition-colors text-center">{{ zoomLevel() * 100 | number:'1.0-0' }}%</button>
              <button (click)="zoomIn()" class="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full bg-white hover:bg-slate-50 text-slate-600 shadow-sm border border-slate-200 font-mono transition-transform hover:scale-105">+</button>
            </div>
        </div>
      </div>

      <!-- Results Table -->
      <div class="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl shadow-sm border border-slate-200/50 overflow-hidden flex flex-col print:overflow-visible print:border-none print:shadow-none print:bg-transparent" (wheel)="onWheel($event)" [style.zoom]="zoomLevel()">
        <div class="p-4 bg-slate-100/50 border-b border-slate-200/50 font-bold text-slate-700 flex justify-between items-center">
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>
            {{ ts.t('analysis_results') }}
          </span>
          <span class="bg-indigo-100 text-indigo-700 py-1 px-3 rounded-full text-xs font-bold shadow-sm">{{ results().length }} {{ ts.t('records_found') }}</span>
        </div>
        <div class="flex-1 overflow-auto print:overflow-visible print:h-auto print:block">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50/90 backdrop-blur-md text-xs text-slate-600 uppercase tracking-wider font-bold sticky top-0 z-10 shadow-sm">
              <tr>
                <th class="px-5 py-4 border-b border-slate-200/60">{{ ts.t('product') }}</th>
                <th class="px-5 py-4 border-b border-slate-200/60">{{ ts.t('department') }}</th>
                <th class="px-5 py-4 border-b border-slate-200/60 text-right">{{ ts.t('sum') }}</th>
                <th class="px-5 py-4 border-b border-slate-200/60 text-right">{{ ts.t('average') }}</th>
                <th class="px-5 py-4 border-b border-slate-200/60 text-right">{{ ts.t('min') }}</th>
                <th class="px-5 py-4 border-b border-slate-200/60 text-right">{{ ts.t('max') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100/50">
              @for (res of results(); track $index) {
                <tr class="hover:bg-blue-50/40 transition-colors group">
                  <td class="px-5 py-3 font-semibold text-slate-800">{{ res.productName }}</td>
                  <td class="px-5 py-3 text-slate-600 font-medium">{{ res.departmentName }}</td>
                  <td class="px-5 py-3 text-right font-bold text-blue-600 group-hover:text-blue-700 transition-colors">{{ res.sum | number:'1.0-2' }}</td>
                  <td class="px-5 py-3 text-right text-slate-700">{{ res.average | number:'1.2-2' }}</td>
                  <td class="px-5 py-3 text-right text-slate-500">{{ res.min }}</td>
                  <td class="px-5 py-3 text-right text-slate-500">{{ res.max }}</td>
                </tr>
              }
              @if (results().length === 0) {
                <tr>
                  <td colspan="6" class="px-5 py-12 text-center">
                    <div class="flex flex-col items-center justify-center text-slate-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-3 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                      <span class="font-medium text-sm">{{ ts.t('no_data_range') }}</span>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AnalysisComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);
  printService = inject(PrintService);

  results = signal<AnalysisResult[]>([]);
  zoomLevel = signal(1);
  selectedProdId = signal('');
  selectedDeptId = signal('');

  printAnalysis() {
    this.printService.confirmPrint('multi');
  }

  runAnalysis() {
    const start = new Date(this.projectService.analysisStartDate());
    const end = new Date(this.projectService.analysisEndDate());

    // Normalize time to compare dates properly
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const usage = this.projectService.usage();
    const products = this.projectService.products();
    const depts = this.projectService.departments();

    // Grouping: Key = ProdId_DeptId -> Array of quantities
    const grouped = new Map<string, number[]>();

    usage.forEach(u => {
      const uDate = DateUtils.parseDate(u.date);
      if (uDate >= start && uDate <= end) {
        const key = `${u.productId}_${u.departmentId}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(u.quantity);
      }
    });

    const output: AnalysisResult[] = [];

    grouped.forEach((quantities, key) => {
      const [prodId, deptId] = key.split('_');
      const prod = products.find(p => p.id === prodId);
      const dept = depts.find(d => d.id === deptId);

      if (prod && dept) {
        if (this.selectedProdId() && prod.id !== this.selectedProdId()) return;
        if (this.selectedDeptId() && dept.id !== this.selectedDeptId()) return;

        const sum = quantities.reduce((a, b) => a + b, 0);
        const min = Math.min(...quantities);
        const max = Math.max(...quantities);
        const avg = sum / quantities.length;

        output.push({
          productName: prod.name,
          departmentName: dept.name,
          sum,
          average: avg,
          min,
          max
        });
      }
    });

    // Sort by Product Name
    output.sort((a, b) => a.productName.localeCompare(b.productName));

    this.results.set(output);
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
