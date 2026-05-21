import { Component, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../services/project.service';
import { TranslationService } from '../services/translation.service';
import { DateUtils } from '../services/date.utils';
import * as d3 from 'd3';

import { PrintService } from '../services/print.service';

@Component({
  selector: 'app-graph',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-full flex flex-col lg:flex-row bg-transparent overflow-hidden printable-area gap-5 p-5 print:h-auto print:overflow-visible print:block">
      <!-- Config Sidebar -->
      <div class="w-full lg:w-80 bg-white/40 backdrop-blur-md rounded-2xl border border-slate-200/50 flex flex-col overflow-hidden shadow-sm z-10 no-print flex-shrink-0">
        <div class="p-5 bg-slate-100/50 border-b border-slate-200/50 font-bold text-slate-700 flex justify-between items-center">
          <span class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>
            {{ ts.t('graph_config') }}
          </span>
        </div>
        
        <div class="flex-1 overflow-y-auto p-5 space-y-6">
          <!-- Date Range -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ ts.t('date_range') }}</h4>
            <div class="grid grid-cols-2 gap-3">
              <input type="date" [ngModel]="startDateStr()" (ngModelChange)="startDateStr.set($event)" (keyup.enter)="updateChart()" class="text-sm font-medium bg-white/80 border border-slate-200 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all shadow-sm">
              <input type="date" [ngModel]="endDateStr()" (ngModelChange)="endDateStr.set($event)" (keyup.enter)="updateChart()" class="text-sm font-medium bg-white/80 border border-slate-200 rounded-xl px-3 py-2 w-full focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all shadow-sm">
            </div>
          </div>

          <!-- Method -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ ts.t('method') }}</h4>
            <select [ngModel]="method()" (ngModelChange)="method.set($event)" class="w-full text-sm font-medium bg-white/80 border border-slate-200 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none transition-all shadow-sm">
              <option value="sum">{{ ts.t('sum_monthly') }}</option>
              <option value="avg">{{ ts.t('avg_monthly') }}</option>
            </select>
          </div>

          <!-- Products Selection -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
              {{ ts.t('products') }}
              <button (click)="toggleAllProds()" class="text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded bg-blue-50/50 hover:bg-blue-100 transition-colors">{{ ts.t('toggle_all') }}</button>
            </h4>
            <div class="max-h-48 overflow-y-auto border border-slate-200/60 rounded-xl p-2 bg-white/60 space-y-1 shadow-inner custom-scrollbar">
              @for (prod of projectService.products(); track prod.id) {
                <label class="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-blue-50/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" 
                    [checked]="selectedProds().has(prod.id)"
                    (change)="toggleProd(prod.id)"
                    class="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 transition-all">
                  <span class="truncate">{{ prod.name }}</span>
                </label>
              }
            </div>
            <label class="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors mt-2 p-2 rounded-lg hover:bg-white/40">
               <input type="checkbox" [ngModel]="includeTotal()" (ngModelChange)="includeTotal.set($event)" class="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 transition-all">
               {{ ts.t('include_total') }}
            </label>
          </div>

          <!-- Departments Selection -->
          <div class="space-y-3">
            <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest flex justify-between items-center">
              {{ ts.t('departments') }}
              <button (click)="toggleAllDepts()" class="text-blue-500 hover:text-blue-700 font-semibold px-2 py-1 rounded bg-blue-50/50 hover:bg-blue-100 transition-colors">{{ ts.t('toggle_all') }}</button>
            </h4>
            <div class="max-h-48 overflow-y-auto border border-slate-200/60 rounded-xl p-2 bg-white/60 space-y-1 shadow-inner custom-scrollbar">
              @for (dept of projectService.departments(); track dept.id) {
                <label class="flex items-center gap-3 text-sm font-medium text-slate-700 cursor-pointer hover:bg-blue-50/50 p-2 rounded-lg transition-colors">
                  <input type="checkbox" 
                    [checked]="selectedDepts().has(dept.id)"
                    (change)="toggleDept(dept.id)"
                    class="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 transition-all">
                  <span class="truncate">{{ dept.name }}</span>
                </label>
              }
            </div>
          </div>
          
          <!-- Other Options -->
          <div class="space-y-3">
             <h4 class="text-xs font-bold text-slate-500 uppercase tracking-widest">{{ ts.t('other_options') }}</h4>
             <div class="space-y-1">
                <label class="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white/40">
                   <input type="checkbox" [ngModel]="includePatientVisits()" (ngModelChange)="includePatientVisits.set($event)" class="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 transition-all">
                   {{ ts.t('include_patient_visits') }}
                </label>
                <label class="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white/40">
                   <input type="checkbox" [ngModel]="showLegend()" (ngModelChange)="showLegend.set($event)" class="rounded text-blue-500 focus:ring-blue-500 w-4 h-4 transition-all">
                   {{ ts.t('show_legend') }}
                </label>
             </div>
          </div>

        </div>

        <div class="p-5 border-t border-slate-200/50 bg-white/50">
          <button (click)="updateChart()" class="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold tracking-wide hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 uppercase text-xs">
            {{ ts.t('update_graph') }}
          </button>
        </div>
      </div>

      <!-- Chart Area -->
      <div class="flex-1 flex flex-col min-h-[500px]">
         <div class="flex-1 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/50 p-5 relative flex flex-col">
            <div class="flex justify-between items-center mb-6 no-print">
              <h3 class="font-bold text-slate-700 text-lg flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
                 {{ ts.t('analytics_vis') }}
              </h3>
              <div class="flex gap-3">
                <button (click)="printGraph()" class="text-sm font-medium bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                  {{ ts.t('print') }}
                </button>
                <button (click)="downloadChart()" class="text-sm font-medium bg-white hover:bg-slate-50 border border-slate-200 shadow-sm text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  {{ ts.t('export_png') }}
                </button>
              </div>
            </div>
            
            <div #chartContainer class="flex-1 w-full h-full bg-white/50 rounded-xl border border-slate-100/50 p-2 print:min-h-[500px] print:block"></div>
            
            @if(noData()) {
              <div class="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-10 rounded-2xl">
                <div class="flex flex-col items-center gap-3 text-slate-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mb-2 opacity-50"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                  <p class="font-medium text-lg">{{ ts.t('no_data_selection') }}</p>
                  <p class="text-sm opacity-80">Select parameters and click Update Graph</p>
                </div>
              </div>
            }
         </div>
      </div>
    </div>
  `
})
export class GraphComponent {
  projectService = inject(ProjectService);
  ts = inject(TranslationService);
  printService = inject(PrintService);

  startDateStr = signal(new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0]);

  printGraph() {
    this.printService.confirmPrint('fit');
  }
  endDateStr = signal(new Date().toISOString().split('T')[0]);

  selectedProds = signal<Set<string>>(new Set());
  selectedDepts = signal<Set<string>>(new Set());
  includeTotal = signal(false);
  includePatientVisits = signal(false);
  showLegend = signal(true);
  method = signal<'sum' | 'avg'>('sum');
  noData = signal(false);

  @ViewChild('chartContainer') chartContainer!: ElementRef<HTMLDivElement>;

  toggleProd(id: string) {
    this.selectedProds.update(s => {
      const newSet = new Set(s);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  }

  toggleDept(id: string) {
    this.selectedDepts.update(s => {
      const newSet = new Set(s);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      return newSet;
    });
  }

  toggleAllProds() {
    if (this.selectedProds().size === this.projectService.products().length) {
      this.selectedProds.set(new Set());
    } else {
      this.selectedProds.set(new Set(this.projectService.products().map(p => p.id)));
    }
  }

  toggleAllDepts() {
    if (this.selectedDepts().size === this.projectService.departments().length) {
      this.selectedDepts.set(new Set());
    } else {
      this.selectedDepts.set(new Set(this.projectService.departments().map(d => d.id)));
    }
  }

  updateChart() {
    if (!this.chartContainer) return;

    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

    const start = new Date(this.startDateStr());
    const end = new Date(this.endDateStr());
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const products = this.projectService.products().filter(p => this.selectedProds().has(p.id));
    const depts = this.projectService.departments().filter(d => this.selectedDepts().has(d.id));
    const usage = this.projectService.usage();

    interface DataPoint { date: Date; value: number; }
    const seriesData = new Map<string, DataPoint[]>();

    if (products.length === 0 || (depts.length === 0 && !this.includeTotal())) {
      // still allow patient data to be shown
    } else {
      products.forEach(prod => {
        depts.forEach(dept => {
          const name = `${prod.name} - ${dept.name}`;
          const points = this.getMonthlyData(usage, prod.id, [dept.id], start, end, this.method());
          if (points.length > 0) seriesData.set(name, points);
        });

        if (this.includeTotal()) {
          const name = `${prod.name} - Total`;
          const allDeptIds = this.projectService.departments().map(d => d.id);
          const points = this.getMonthlyData(usage, prod.id, allDeptIds, start, end, this.method());
          if (points.length > 0) seriesData.set(name, points);
        }
      });
    }

    if (this.includePatientVisits()) {
      const visits = this.projectService.patientVisits();
      const points: DataPoint[] = [];
      for (const key in visits) { // key is YYYY-MM
        const [year, month] = key.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        if (date >= start && date <= end) {
          points.push({ date, value: visits[key] });
        }
      }
      if (points.length > 0) {
        seriesData.set('Patient Visits', points.sort((a, b) => a.date.getTime() - b.date.getTime()));
      }
    }


    if (seriesData.size === 0) {
      this.noData.set(true);
      return;
    }
    this.noData.set(false);
    this.drawChart(seriesData);
  }

  getMonthlyData(usage: any[], prodId: string, deptIds: string[], start: Date, end: Date, method: 'sum' | 'avg'): { date: Date, value: number }[] {
    const monthMap = new Map<string, number[]>();

    usage.forEach(u => {
      if (u.productId === prodId && deptIds.includes(u.departmentId)) {
        const d = DateUtils.parseDate(u.date);
        if (d >= start && d <= end) {
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (!monthMap.has(key)) monthMap.set(key, []);
          monthMap.get(key)!.push(u.quantity);
        }
      }
    });

    const result: { date: Date, value: number }[] = [];
    monthMap.forEach((vals, key) => {
      const [y, m] = key.split('-').map(Number);
      const date = new Date(y, m, 1); // Use start of month to align with axis ticks

      let val = 0;
      const sum = vals.reduce((a, b) => a + b, 0);
      if (method === 'sum') {
        val = sum;
      } else {
        val = sum / vals.length;
      }
      result.push({ date, value: val });
    });

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  drawChart(data: Map<string, { date: Date, value: number }[]>) {
    const element = this.chartContainer.nativeElement;
    // Dynamic right margin: 320 if Legend ON, 80 if Legend OFF (enough for axis)
    const margin = { top: 20, right: this.showLegend() ? 320 : 80, bottom: 30, left: 50 };
    const width = (element.clientWidth || 800) - margin.left - margin.right;
    const height = (element.clientHeight || 500) - margin.top - margin.bottom;

    const svg = d3.select(element).append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const allPoints = Array.from(data.values()).flat();
    if (allPoints.length === 0) return;

    const productSeries = new Map(Array.from(data.entries()).filter(([name]) => name !== 'Patient Visits'));
    const patientSeries = data.get('Patient Visits');
    const allProductPoints = Array.from(productSeries.values()).flat();

    const hasProductData = productSeries.size > 0 && allProductPoints.length > 0;
    const hasPatientData = !!patientSeries && patientSeries.length > 0;

    const xDomain = d3.extent(allPoints, d => d.date) as [Date, Date];

    // Ensure domain has some width if min equals max
    if (xDomain[0] && xDomain[1] && xDomain[0].getTime() === xDomain[1].getTime()) {
      // Expand by 15 days on each side
      xDomain[0] = new Date(xDomain[0]);
      xDomain[0].setDate(xDomain[0].getDate() - 15);
      xDomain[1] = new Date(xDomain[1]);
      xDomain[1].setDate(xDomain[1].getDate() + 15);
    }

    const x = d3.scaleTime()
      .domain(xDomain)
      .range([0, width]);

    const y = d3.scaleLinear().range([height, 0]);

    if (hasProductData) {
      y.domain([0, d3.max(allProductPoints, d => d.value) || 0]).nice();
    } else if (hasPatientData) {
      y.domain([0, d3.max(patientSeries, d => d.value) || 0]).nice();
    } else {
      y.domain([0, 1]);
    }

    svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y)).append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", "0.71em")
      .attr("text-anchor", "end")
      .text("Value");

    let y2: d3.ScaleLinear<number, number> | undefined;

    if (hasProductData && hasPatientData) {
      y2 = d3.scaleLinear()
        .domain([0, d3.max(patientSeries, d => d.value) || 0])
        .nice()
        .range([height, 0]);
      svg.append("g")
        .attr("class", "y2-axis")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(y2))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -16)
        .attr("dy", "0.71em")
        .attr("text-anchor", "end")
        .text("Patient Visits");
    }

    const color = d3.scaleOrdinal(d3.schemeCategory10).domain(Array.from(data.keys()));

    const line = d3.line<{ date: Date, value: number }>().x(d => x(d.date)).y(d => y(d.value));
    const lineForPatients = y2 ? d3.line<{ date: Date, value: number }>().x(d => x(d.date)).y(d => y2!(d.value)) : line;

    productSeries.forEach((points, name) => {
      svg.append("path")
        .datum(points)
        .attr("fill", "none")
        .attr("stroke", color(name) as string)
        .attr("stroke-width", 2)
        .attr("class", "line")
        .attr("d", line);

      // Add dots for data points to make alignment visible
      svg.selectAll(".dot-" + name.replace(/[^a-zA-Z0-9]/g, ""))
        .data(points)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y(d.value))
        .attr("r", 3)
        .attr("fill", color(name) as string);
    });

    if (patientSeries) {
      svg.append("path")
        .datum(patientSeries)
        .attr("fill", "none")
        .attr("stroke", color('Patient Visits') as string)
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "3, 3")
        .attr("class", "line")
        .attr("d", lineForPatients);

      svg.selectAll(".dot-patient")
        .data(patientSeries)
        .enter().append("circle")
        .attr("class", "dot")
        .attr("cx", d => x(d.date))
        .attr("cy", d => y2 ? y2(d.value) : y(d.value))
        .attr("r", 3)
        .attr("fill", color('Patient Visits') as string);
    }

    // Legend positioned further to the right to avoid Y2 axis labels
    if (this.showLegend()) {
      const legend = svg.append("g").attr("transform", `translate(${width + 70}, 0)`);
      Array.from(data.keys()).forEach((name, i) => {
        const legendItem = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
        legendItem.append("rect").attr("width", 10).attr("height", 10).attr("fill", color(name) as string);

        // No truncation, show full name as requested
        const displayName = name;

        const textEl = legendItem.append("text").text(displayName).attr("x", 15).attr("y", 10).style("font-size", "10px").attr("alignment-baseline", "middle");
        textEl.append("title").text(name); // Tooltip for full name
      });
    }

    // Tooltip
    const tooltip = d3.select(element).append("div").attr("class", "tooltip")
      .style("opacity", 0)
      .style("position", "absolute")
      .style("background-color", "rgba(255, 255, 255, 0.95)")
      .style("border", "1px solid #ddd")
      .style("box-shadow", "0 2px 5px rgba(0,0,0,0.1)")
      .style("border-radius", "8px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("transition", "opacity 0.2s");

    const tooltipCircle = svg.append("circle")
      .attr("r", 5)
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .style("opacity", 0)
      .style("pointer-events", "none")
      .style("transition", "opacity 0.2s");

    const bisectDate = d3.bisector((d: any) => d.date).left;

    svg.append("rect")
      .attr("width", width).attr("height", height).style("fill", "none").style("pointer-events", "all")
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        tooltipCircle.style("opacity", 0);
      })
      .on("mousemove", (event) => {
        const [mouseX, mouseY] = d3.pointer(event);
        const x0 = x.invert(mouseX);

        let closestPointData: { name: string, point: { date: Date, value: number }, distance: number } | null = null;

        data.forEach((points, name) => {
          const idx = bisectDate(points, x0, 1);
          const candidates = [];
          if (points[idx - 1]) candidates.push(points[idx - 1]);
          if (points[idx]) candidates.push(points[idx]);

          const yPosFunc = (name === 'Patient Visits' && y2) ? y2 : y;

          for (const d of candidates) {
            const screenX = x(d.date);
            const screenY = yPosFunc(d.value);
            const distance = Math.sqrt(Math.pow(mouseX - screenX, 2) + Math.pow(mouseY - screenY, 2));
            if (!closestPointData || distance < closestPointData.distance) {
              closestPointData = { name, point: d, distance };
            }
          }
        });

        const threshold = 50; // pixels
        if (closestPointData && closestPointData.distance < threshold) {
          tooltip.style("opacity", 1);
          tooltipCircle.style("opacity", 1);

          const { name, point } = closestPointData;
          const yPos = (name === 'Patient Visits' && y2) ? y2(point.value) : y(point.value);

          tooltip.html(`
              <div class="font-bold text-sm mb-1" style="color:${color(name)}">${name}</div>
              <div class="text-xs grid grid-cols-[auto,1fr] gap-x-2">
                <strong class="text-gray-500">Date:</strong> <span>${d3.timeFormat("%b %Y")(point.date)}</span>
                <strong class="text-gray-500">Value:</strong> <span>${point.value % 1 === 0 ? point.value.toFixed(0) : point.value.toFixed(2)}</span>
              </div>
          `)
            .style("left", (element.offsetLeft + margin.left + x(point.date) + 15) + "px")
            .style("top", (element.offsetTop + margin.top + yPos - 15) + "px");

          tooltipCircle
            .attr("cx", x(point.date))
            .attr("cy", yPos)
            .attr("fill", color(name) as string);

        } else {
          tooltip.style("opacity", 0);
          tooltipCircle.style("opacity", 0);
        }
      });
  }

  downloadChart() {
    const svgElement = this.chartContainer.nativeElement.querySelector('svg');
    if (!svgElement) return;

    const serializer = new XMLSerializer();
    const source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(svgElement);
    const img = new Image();
    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.width.baseVal.value;
      canvas.height = svgElement.height.baseVal.value;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white'; // Set background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement("a");
        link.href = pngUrl;
        link.download = "chart.png";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    };
    img.src = url;
  }
}