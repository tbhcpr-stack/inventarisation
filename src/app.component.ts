import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from './services/project.service';
import { TranslationService } from './services/translation.service';
import { PrintService } from './services/print.service';
import { DateUtils } from './services/date.utils';
import { GridComponent } from './components/grid.component';
import { AnalysisComponent } from './components/analysis.component';
import { GraphComponent } from './components/graph.component';
import { MonthlyAnalysisComponent } from './components/monthly-analysis.component';
import { StorageComponent } from './components/storage.component';
import { PrintModalComponent } from './components/print-modal.component';
import { ViewMode } from './types';
import { SupabaseService } from './services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, GridComponent, AnalysisComponent, GraphComponent, MonthlyAnalysisComponent, StorageComponent, PrintModalComponent],
  template: `
<div class="h-full flex flex-col font-sans text-gray-800 print:h-auto print:block print:overflow-visible" [class.print-fit]="printService.printMode() === 'fit'" [class.print-multi]="printService.printMode() === 'multi'">
  
  <app-print-modal></app-print-modal>
  
  <!-- Top Navigation Bar -->
  <header class="bg-slate-900/85 backdrop-blur-xl border-b border-white/10 text-white shadow-xl sticky top-0 z-50 transition-all">
    <div class="container mx-auto px-4 h-16 flex items-center justify-between">
      
      <!-- Logo / Title & Project Switcher -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-3">
          <img src="assets/logo.png" class="w-10 h-10 object-contain rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)] ring-1 ring-white/10" alt="Logo">
          <h1 class="text-xl font-display font-bold tracking-tight hidden lg:block bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{{ ts.t('app_title') }}</h1>
        </div>

        <div class="h-6 w-px bg-white/10 hidden md:block"></div>

        <!-- Project dropdown selector -->
        <div class="relative flex items-center bg-slate-800/60 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner backdrop-blur-md">
           <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400 mr-2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
           <select 
             [ngModel]="projectService.activeProjectId()" 
             (ngModelChange)="handleProjectChange($event)"
             class="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer pr-6 appearance-none z-10"
           >
             @for (proj of projectService.projects(); track proj.id) {
               <option [value]="proj.id" class="text-black bg-white">{{ proj.name }}</option>
             }
           </select>
           <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-400 absolute right-2 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <!-- Manage Projects button -->
        <button (click)="openProjectManagerModal()" class="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-all hover:scale-105" [title]="ts.t('manage_projects')">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </div>

      <!-- Center Controls (Date) -->
      <div class="flex items-center gap-3 bg-slate-800/80 px-5 py-2 rounded-full border border-white/5 shadow-inner backdrop-blur-md">
         
         <!-- Custom Date Picker Trigger (Icon Only) -->
         <div class="relative flex items-center justify-center p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer group w-8 h-8">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300 group-hover:text-blue-300 transition-colors"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <input 
                 type="date" 
                 [value]="currentDateInput()" 
                 (change)="onDateChange($event)"
                 class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
         </div>

         <!-- Formatted Date Text (Static Label) -->
         <span class="text-sm text-blue-100 font-medium min-w-[80px] text-center select-none cursor-default tracking-wide">{{ currentDateDisplay() }}</span>
         
         <!-- Delete / Manage History Button -->
         @if (projectService.savedDates().length > 0) {
           <div class="h-5 w-px bg-white/10 mx-1"></div>
           
           <button (click)="handleDeleteAction()" class="p-1.5 hover:bg-red-500/20 rounded-full text-red-400 hover:text-red-300 transition-all hover:scale-105" [title]="ts.t('manage_history')">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
           </button>
           
           <!-- Dedicated History Dropdown Arrow -->
           <div class="relative w-7 h-7 flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer transition-all" [title]="ts.t('load_saved_date')">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300 pointer-events-none"><polyline points="6 9 12 15 18 9"></polyline></svg>
             <select (change)="onSavedDateSelect($event)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10">
                <option value="" disabled [selected]="!isCurrentDateSaved()">{{ ts.t('load_saved_date') }}</option>
                @for (date of projectService.savedDates(); track date) {
                  <option [value]="date" class="text-black" [selected]="date === projectService.currentDate()">{{ date }}</option>
                }
             </select>
           </div>
         }
      </div>

      <!-- Right Controls (Menu) -->
      <div class="flex items-center gap-4 flex-wrap justify-end">
        <!-- View Tabs -->
        <div class="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 shadow-inner">
          <button (click)="setView('grid')" [class.bg-gradient-to-r]="viewMode === 'grid'" [class.from-blue-600]="viewMode === 'grid'" [class.to-indigo-600]="viewMode === 'grid'" [class.text-white]="viewMode === 'grid'" [class.shadow-md]="viewMode === 'grid'" [class.text-slate-400]="viewMode !== 'grid'" [class.hover:text-white]="viewMode !== 'grid'" class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300">
            {{ ts.t('nav_grid') }}
          </button>
          <button (click)="setView('storage')" [class.bg-gradient-to-r]="viewMode === 'storage'" [class.from-blue-600]="viewMode === 'storage'" [class.to-indigo-600]="viewMode === 'storage'" [class.text-white]="viewMode === 'storage'" [class.shadow-md]="viewMode === 'storage'" [class.text-slate-400]="viewMode !== 'storage'" [class.hover:text-white]="viewMode !== 'storage'" class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300">
            {{ ts.t('nav_storage') }}
          </button>
          <button (click)="setView('analysis')" [class.bg-gradient-to-r]="viewMode === 'analysis'" [class.from-blue-600]="viewMode === 'analysis'" [class.to-indigo-600]="viewMode === 'analysis'" [class.text-white]="viewMode === 'analysis'" [class.shadow-md]="viewMode === 'analysis'" [class.text-slate-400]="viewMode !== 'analysis'" [class.hover:text-white]="viewMode !== 'analysis'" class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300">
            {{ ts.t('nav_analysis') }}
          </button>
          <button (click)="setView('monthly-analysis')" [class.bg-gradient-to-r]="viewMode === 'monthly-analysis'" [class.from-blue-600]="viewMode === 'monthly-analysis'" [class.to-indigo-600]="viewMode === 'monthly-analysis'" [class.text-white]="viewMode === 'monthly-analysis'" [class.shadow-md]="viewMode === 'monthly-analysis'" [class.text-slate-400]="viewMode !== 'monthly-analysis'" [class.hover:text-white]="viewMode !== 'monthly-analysis'" class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300">
            {{ ts.t('nav_monthly') }}
          </button>
          <button (click)="setView('graph')" [class.bg-gradient-to-r]="viewMode === 'graph'" [class.from-blue-600]="viewMode === 'graph'" [class.to-indigo-600]="viewMode === 'graph'" [class.text-white]="viewMode === 'graph'" [class.shadow-md]="viewMode === 'graph'" [class.text-slate-400]="viewMode !== 'graph'" [class.hover:text-white]="viewMode !== 'graph'" class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-300">
            {{ ts.t('nav_graph') }}
          </button>
        </div>

        <!-- Language Switcher -->
        <div class="flex bg-slate-950/50 p-1 rounded-xl border border-white/5 shadow-inner">
          <button (click)="setLanguage('en')" [class.bg-gradient-to-r]="ts.currentLang() === 'en'" [class.from-slate-600]="ts.currentLang() === 'en'" [class.to-slate-700]="ts.currentLang() === 'en'" [class.text-white]="ts.currentLang() === 'en'" [class.shadow]="ts.currentLang() === 'en'" [class.text-slate-400]="ts.currentLang() !== 'en'" [class.hover:text-white]="ts.currentLang() !== 'en'" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300">EN</button>
          <button (click)="setLanguage('ge')" [class.bg-gradient-to-r]="ts.currentLang() === 'ge'" [class.from-slate-600]="ts.currentLang() === 'ge'" [class.to-slate-700]="ts.currentLang() === 'ge'" [class.text-white]="ts.currentLang() === 'ge'" [class.shadow]="ts.currentLang() === 'ge'" [class.text-slate-400]="ts.currentLang() !== 'ge'" [class.hover:text-white]="ts.currentLang() !== 'ge'" class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-300">GE</button>
        </div>

        <!-- File Menu Dropdown (Simplified as Buttons for MVP) -->
        <div class="flex items-center gap-1 ml-2">
           <button (click)="handleNew()" class="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all hover:scale-110" [title]="ts.t('new_project')">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
           </button>
           
           <label class="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white cursor-pointer transition-all hover:scale-110" [title]="ts.t('load_json')">
             <input type="file" accept=".json" class="hidden" (change)="handleLoad($event)">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
           </label>

            <button (click)="handleSave()" class="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all hover:scale-110" [title]="ts.t('save_json')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            </button>

            @if (supabaseService.isConfigured()) {
              <button (click)="handleRestoreFromSupabase()" class="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all hover:scale-110 relative" [title]="ts.t('restore_from_supabase')" [disabled]="supabaseService.isDownloading()">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                @if (supabaseService.isDownloading()) {
                  <span class="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-full">
                    <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </span>
                }
              </button>
            }

            <button (click)="openSupabaseModal()" class="p-2 hover:bg-slate-800 rounded-full text-slate-300 hover:text-white transition-all hover:scale-110 relative" [title]="ts.t('supabase_settings')">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
              @if (supabaseService.isUploading()) {
                <span class="absolute inset-0 flex items-center justify-center bg-slate-900/60 rounded-full">
                  <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </span>
              }
            </button>

           <div class="h-6 w-px bg-white/10 mx-2"></div>

           <label class="px-3 py-1.5 bg-success/90 hover:bg-success rounded-full text-white cursor-pointer transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 flex items-center justify-center" [title]="ts.t('import_excel')">
              <input type="file" accept=".xlsx, .xlsm, .xls, .csv" class="hidden" (change)="handleImportExcel($event)">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><line x1="12" y1="9" x2="12" y2="15"></line><line x1="9" y1="12" x2="15" y2="12"></line></svg>
           </label>
           
           <button (click)="exportExcel()" class="px-3 py-1.5 bg-success/90 hover:bg-success rounded-full text-white transition-all hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:-translate-y-0.5 flex items-center justify-center" [title]="ts.t('export_excel')">
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><polyline points="9 15 12 18 15 15"></polyline></svg>
           </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content Area -->
  <main class="flex-1 overflow-hidden p-3 md:p-6 bg-surface relative isolate print:h-auto print:overflow-visible print:block print:p-0">
    <!-- Subtle Background Glow -->
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[400px] bg-blue-500/5 blur-[120px] rounded-full point-events-none -z-10 no-print"></div>
    
    <!-- Main Glass Viewport -->
    <div class="h-full w-full bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-900/5 overflow-hidden animate-fade-in flex flex-col print:bg-white print:ring-0 print:shadow-none print:backdrop-blur-none print:h-auto print:overflow-visible print:block">
      <app-grid class="h-full block w-full overflow-hidden print:h-auto print:overflow-visible" [class.hidden]="viewMode !== 'grid'"></app-grid>
      <app-storage class="h-full block w-full overflow-hidden print:h-auto print:overflow-visible" [class.hidden]="viewMode !== 'storage'"></app-storage>
      <app-analysis class="h-full block w-full overflow-hidden print:h-auto print:overflow-visible" [class.hidden]="viewMode !== 'analysis'"></app-analysis>
      <app-monthly-analysis class="h-full block w-full overflow-hidden print:h-auto print:overflow-visible" [class.hidden]="viewMode !== 'monthly-analysis'"></app-monthly-analysis>
      <app-graph class="h-full block w-full overflow-hidden print:h-auto print:overflow-visible" [class.hidden]="viewMode !== 'graph'"></app-graph>
    </div>
  </main>

  <!-- History Management Modal -->
  @if (showHistoryModal()) {
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[80vh] border border-gray-200">
        <!-- Modal Header -->
        <div class="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-lg">
          <h3 class="font-bold text-lg text-gray-800">{{ ts.t('manage_history') }}</h3>
          <button (click)="closeHistoryModal()" class="text-gray-500 hover:text-gray-700 transition-colors rounded-full p-1 hover:bg-gray-200">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
  
        <!-- Modal Toolbar -->
        <div class="px-4 py-2 border-b border-gray-100 bg-white flex items-center gap-3">
           <button (click)="selectAllDates()" class="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline uppercase tracking-wide">{{ ts.t('select_all') }}</button>
           <span class="text-gray-300 text-xs">|</span>
           <button (click)="deselectAllDates()" class="text-xs text-blue-600 font-bold hover:text-blue-800 hover:underline uppercase tracking-wide">{{ ts.t('deselect_all') }}</button>
        </div>
  
        <!-- Modal Content (Scrollable) -->
        <div class="flex-1 overflow-y-auto p-2 bg-white">
           @for (date of projectService.savedDates(); track date) {
             <label class="flex items-center gap-3 p-3 hover:bg-blue-50 rounded-md cursor-pointer transition-colors border-b border-gray-50 last:border-0 group">
                <input 
                   type="checkbox" 
                   [checked]="historySelection().has(date)" 
                   (change)="toggleHistoryDate(date)" 
                   class="rounded text-blue-600 w-5 h-5 border-gray-300 focus:ring-blue-500" 
                />
                <span class="text-sm font-medium text-gray-700 group-hover:text-blue-800">{{ date }}</span>
             </label>
           }
           @if (projectService.savedDates().length === 0) {
              <div class="flex flex-col items-center justify-center py-12 text-gray-400">
                 <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                 <span class="text-sm">{{ ts.t('no_history') }}</span>
              </div>
           }
        </div>
  
        <!-- Modal Footer -->
        <div class="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button (click)="closeHistoryModal()" class="px-4 py-2 bg-white border border-gray-300 rounded text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors shadow-sm">{{ ts.t('cancel') }}</button>
          <button (click)="promptDeleteSelected()" [disabled]="historySelection().size === 0" class="px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            {{ ts.t('delete_selected') }}
            @if (historySelection().size > 0) {
              <span class="bg-red-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">{{ historySelection().size }}</span>
            }
          </button>
        </div>
      </div>
    </div>
  }
  
  <!-- Confirmation Modal -->
  @if (showConfirmDeleteModal()) {
    <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/20 p-4">
      <div class="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6 transform transition-all border border-gray-100">
         <h3 class="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            {{ ts.t('confirm_bulk_delete_title') }}
         </h3>
         <p class="text-gray-600 text-sm mb-6">{{ ts.t('confirm_bulk_delete_msg') }}</p>
         
         <div class="flex justify-end gap-3">
            <button (click)="cancelDeleteConfirm()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
               {{ ts.t('cancel') }}
            </button>
            <button (click)="executeDelete()" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm">
               {{ ts.t('delete_selected') }}
            </button>
         </div>
      </div>
    </div>
  }

  <!-- New Project Confirmation Modal -->
  @if (showNewProjectConfirmModal()) {
    <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-2xl w-full max-w-md p-6 transform transition-all border border-gray-100">
         <h3 class="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            {{ ts.t('new_project_title') }}
         </h3>
         <p class="text-gray-600 text-sm mb-6">{{ ts.t('new_project_message') }}</p>
         
         <div class="flex justify-end gap-3">
            <button (click)="cancelNewProject()" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors">
               {{ ts.t('cancel') }}
            </button>
            <button (click)="executeNewProject()" class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 transition-colors shadow-sm">
               {{ ts.t('discard_and_new') }}
            </button>
            <button (click)="executeSaveAndNewProject()" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm">
               {{ ts.t('save_and_new') }}
            </button>
         </div>
      </div>
    </div>
  }

  <!-- Project Manager Modal -->
  @if (showProjectManagerModal()) {
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] border border-slate-100 overflow-hidden">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 class="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
             {{ ts.t('manage_projects') }}
          </h3>
          <button (click)="closeProjectManagerModal()" class="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1.5 hover:bg-slate-100">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Modal Toolbar / Quick Actions -->
        <div class="p-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
          <button (click)="promptCreateProject()" class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(59,130,246,0.3)] hover:-translate-y-0.5 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            {{ ts.t('new_project') }}
          </button>
        </div>

        <!-- Project List Content -->
        <div class="flex-1 overflow-y-auto p-4 bg-slate-50/30">
          <div class="space-y-2">
            @for (proj of projectService.projects(); track proj.id) {
              <div 
                [class.ring-2]="proj.id === projectService.activeProjectId()" 
                [class.ring-blue-500]="proj.id === projectService.activeProjectId()"
                [class.bg-blue-50/30]="proj.id === projectService.activeProjectId()"
                class="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm hover:shadow group"
              >
                <!-- Project info (click to select) -->
                <div (click)="handleProjectSelectInModal(proj.id)" class="flex-1 cursor-pointer flex items-center gap-3">
                  <div [class.bg-blue-500]="proj.id === projectService.activeProjectId()" [class.text-white]="proj.id === projectService.activeProjectId()" [class.bg-slate-100]="proj.id !== projectService.activeProjectId()" [class.text-slate-500]="proj.id !== projectService.activeProjectId()" class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs">
                     P
                  </div>
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-slate-800">{{ proj.name }}</span>
                    @if (proj.id === projectService.activeProjectId()) {
                      <span class="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">{{ ts.t('active_project') }}</span>
                    }
                  </div>
                </div>

                <!-- Project Actions -->
                <div class="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  <button (click)="promptRenameProject(proj.id, proj.name)" class="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-700 transition-all" [title]="ts.t('rename')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
                  </button>
                  <button (click)="confirmDeleteProject(proj.id, proj.name)" class="p-2 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-all" [title]="ts.t('delete')">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  }

  <!-- Supabase Settings Modal -->
  @if (showSupabaseModal()) {
    <div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] border border-slate-100 overflow-hidden animate-fade-in">
        <!-- Modal Header -->
        <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 class="font-display font-bold text-lg text-slate-800 flex items-center gap-2">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"></path></svg>
             {{ ts.t('supabase_settings') }}
          </h3>
          <button (click)="closeSupabaseModal()" class="text-slate-400 hover:text-slate-600 transition-colors rounded-full p-1.5 hover:bg-slate-100">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <!-- Modal Content -->
        <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ ts.t('supabase_url') }}</label>
            <input 
              type="text" 
              [ngModel]="supabaseUrlInput()" 
              (ngModelChange)="supabaseUrlInput.set($event)"
              placeholder="https://your-project.supabase.co" 
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ ts.t('supabase_key') }}</label>
            <input 
              type="password" 
              [ngModel]="supabaseKeyInput()" 
              (ngModelChange)="supabaseKeyInput.set($event)"
              placeholder="eyJhbGciOi..." 
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{{ ts.t('supabase_bucket') }}</label>
            <input 
              type="text" 
              [ngModel]="supabaseBucketInput()" 
              (ngModelChange)="supabaseBucketInput.set($event)"
              placeholder="e.g. inventory-backups" 
              class="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
            />
          </div>

          <label class="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors border border-slate-100 select-none">
            <input 
              type="checkbox" 
              [ngModel]="supabaseAutoBackupInput()" 
              (ngModelChange)="supabaseAutoBackupInput.set($event)"
              class="rounded text-blue-600 w-5 h-5 border-slate-300 focus:ring-blue-500"
            />
            <span class="text-sm font-semibold text-slate-700">{{ ts.t('supabase_auto_backup') }}</span>
          </label>

          @if (testConnectionStatus() === 'success') {
            <div class="p-3 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 text-xs font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
              {{ ts.t('connection_success') }}
            </div>
          }
          @if (testConnectionStatus() === 'failed') {
            <div class="p-3 bg-rose-50 text-rose-700 rounded-xl border border-rose-100 text-xs font-medium flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {{ ts.t('connection_failed') }}
            </div>
          }
        </div>

        <!-- Modal Footer -->
        <div class="p-4 border-t border-slate-100 flex justify-between gap-3 bg-slate-50 rounded-b-2xl">
          <button 
            (click)="testSupabaseConnection()" 
            [disabled]="isTestingConnection() || !supabaseUrlInput() || !supabaseKeyInput() || !supabaseBucketInput()" 
            class="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            @if (isTestingConnection()) {
              <svg class="animate-spin h-4 w-4 text-slate-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              {{ ts.t('testing') }}
            } @else {
              {{ ts.t('test_connection') }}
            }
          </button>
          <div class="flex gap-2">
            <button (click)="closeSupabaseModal()" class="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">{{ ts.t('cancel') }}</button>
            <button 
              (click)="saveSupabaseSettings()" 
              [disabled]="!supabaseUrlInput() || !supabaseKeyInput() || !supabaseBucketInput()" 
              class="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {{ ts.t('save') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  }
</div>
`
})
export class AppComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);
  printService = inject(PrintService);
  supabaseService = inject(SupabaseService);

  viewMode: ViewMode = 'grid';

  // Supabase Modal Signals
  showSupabaseModal = signal(false);
  supabaseUrlInput = signal('');
  supabaseKeyInput = signal('');
  supabaseBucketInput = signal('');
  supabaseAutoBackupInput = signal(false);
  isTestingConnection = signal(false);
  testConnectionStatus = signal<'idle' | 'success' | 'failed'>('idle');

  // Date Logic
  currentDateInput = computed(() => DateUtils.appFormatToInput(this.projectService.currentDate()));
  isCurrentDateSaved = computed(() => this.projectService.savedDates().includes(this.projectService.currentDate()));

  // Display formatted date DD/MM/YYYY
  currentDateDisplay = computed(() => {
    const appDate = this.projectService.currentDate(); // dd.mm.yy
    const parts = appDate.split('.');
    if (parts.length === 3) {
      return `${parts[0]}/${parts[1]}/20${parts[2]}`;
    }
    return appDate;
  });

  // History Management State
  showHistoryModal = signal(false);
  showConfirmDeleteModal = signal(false);
  historySelection = signal<Set<string>>(new Set());

  // New Project Modal State
  showNewProjectConfirmModal = signal(false);

  // Project Manager Modal State
  showProjectManagerModal = signal(false);

  onDateChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.value) {
      this.projectService.setDate(DateUtils.inputToAppFormat(input.value));
    }
  }

  onSavedDateSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    if (select.value) {
      this.projectService.setDate(select.value);
    }
  }

  setView(mode: ViewMode) {
    this.viewMode = mode;
  }

  setLanguage(lang: 'en' | 'ge') {
    this.ts.setLang(lang);
  }

  // --- Parallel Projects Management Logic ---

  openProjectManagerModal() {
    this.showProjectManagerModal.set(true);
  }

  closeProjectManagerModal() {
    this.showProjectManagerModal.set(false);
  }

  handleProjectChange(projectId: string) {
    this.projectService.selectProject(projectId);
  }

  handleProjectSelectInModal(projectId: string) {
    this.projectService.selectProject(projectId);
  }

  promptCreateProject() {
    const promptText = this.ts.t('enter_project_name');
    const name = prompt(promptText);
    if (name && name.trim()) {
      this.projectService.createProject(name);
    }
  }

  promptRenameProject(id: string, currentName: string) {
    const promptText = `${this.ts.t('rename')}: ${currentName}`;
    const name = prompt(promptText, currentName);
    if (name && name.trim() && name.trim() !== currentName) {
      this.projectService.renameProject(id, name);
    }
  }

  confirmDeleteProject(id: string, name: string) {
    const confirmMsg = `${this.ts.t('delete_project_confirm')} (${name})`;
    if (confirm(confirmMsg)) {
      this.projectService.deleteProject(id);
    }
  }

  // --- History Management Logic ---

  openHistoryModal() {
    this.historySelection.set(new Set());
    this.showHistoryModal.set(true);
  }

  closeHistoryModal() {
    this.showHistoryModal.set(false);
    this.showConfirmDeleteModal.set(false);
  }

  toggleHistoryDate(date: string) {
    this.historySelection.update(set => {
      const newSet = new Set(set);
      if (newSet.has(date)) newSet.delete(date); else newSet.add(date);
      return newSet;
    });
  }

  selectAllDates() {
    this.historySelection.set(new Set(this.projectService.savedDates()));
  }

  deselectAllDates() {
    this.historySelection.set(new Set());
  }

  promptDeleteSelected() {
    if (this.historySelection().size === 0) return;
    this.showConfirmDeleteModal.set(true);
  }

  cancelDeleteConfirm() {
    this.showConfirmDeleteModal.set(false);
  }

  executeDelete() {
    const dates = Array.from(this.historySelection());
    this.projectService.deleteDates(dates);
    this.closeHistoryModal(); // Close everything
  }

  // --- File Operations ---

  handleNew() {
    this.showNewProjectConfirmModal.set(true);
  }

  executeNewProject() {
    this.projectService.newProject();
    this.showNewProjectConfirmModal.set(false);
  }

  executeSaveAndNewProject() {
    this.handleSave(); // This triggers a download
    // Wait a moment for the download to start before clearing data
    setTimeout(() => {
      this.projectService.newProject();
      this.showNewProjectConfirmModal.set(false);
    }, 500);
  }

  cancelNewProject() {
    this.showNewProjectConfirmModal.set(false);
  }

  // Renamed to handle History Action
  handleDeleteAction() {
    this.openHistoryModal();
  }

  async handleSave() {
    const json = this.projectService.getProjectJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    // If Supabase is configured, upload to Supabase as main and backup
    if (this.supabaseService.isConfigured()) {
      const activeId = this.projectService.activeProjectId();
      if (activeId) {
        const mainOk = await this.supabaseService.uploadMainFile(activeId, json);
        const backupOk = await this.supabaseService.uploadBackupFile(activeId, json);
        if (mainOk && backupOk) {
          alert(this.ts.t('save_success'));
        }
      }
    }
  }

  openSupabaseModal() {
    this.supabaseUrlInput.set(this.supabaseService.url());
    this.supabaseKeyInput.set(this.supabaseService.anonKey());
    this.supabaseBucketInput.set(this.supabaseService.bucket());
    this.supabaseAutoBackupInput.set(this.supabaseService.autoBackup());
    this.testConnectionStatus.set('idle');
    this.showSupabaseModal.set(true);
  }

  closeSupabaseModal() {
    this.showSupabaseModal.set(false);
  }

  saveSupabaseSettings() {
    this.supabaseService.saveCredentials(
      this.supabaseUrlInput(),
      this.supabaseKeyInput(),
      this.supabaseBucketInput(),
      this.supabaseAutoBackupInput()
    );
    this.showSupabaseModal.set(false);
  }

  async testSupabaseConnection() {
    this.isTestingConnection.set(true);
    this.testConnectionStatus.set('idle');

    // Temporarily apply inputs for the test
    const originalUrl = this.supabaseService.url();
    const originalKey = this.supabaseService.anonKey();
    const originalBucket = this.supabaseService.bucket();

    this.supabaseService.url.set(this.supabaseUrlInput().trim());
    this.supabaseService.anonKey.set(this.supabaseKeyInput().trim());
    this.supabaseService.bucket.set(this.supabaseBucketInput().trim());

    const success = await this.supabaseService.testConnection();

    // Revert inputs in service so they aren't saved unless the user hits "Save"
    this.supabaseService.url.set(originalUrl);
    this.supabaseService.anonKey.set(originalKey);
    this.supabaseService.bucket.set(originalBucket);

    this.isTestingConnection.set(false);
    this.testConnectionStatus.set(success ? 'success' : 'failed');
  }

  async handleRestoreFromSupabase() {
    const activeId = this.projectService.activeProjectId();
    if (!activeId) return;

    const confirmMsg = this.ts.t('restore_confirm');
    if (confirm(confirmMsg)) {
      const jsonStr = await this.supabaseService.downloadMainFile(activeId);
      if (jsonStr) {
        this.projectService.loadProjectJSON(jsonStr);
        alert(this.ts.t('restore_success'));
      } else {
        alert(this.ts.t('restore_failed'));
      }
    }
  }

  handleLoad(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        this.projectService.loadProjectJSON(text);
      };
      reader.readAsText(input.files[0]);
    }
  }

  handleImportExcel(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.projectService.importFromExcel(input.files[0]);
    }
  }

  exportExcel() {
    this.projectService.exportToExcel();
  }
}