import { Injectable, signal, computed, effect } from '@angular/core';
import { Product, Department, UsageRecord, StorageRecord, ProjectData, ImportRecord, Project } from '../types';
import { DateUtils } from './date.utils';
import * as XLSX from 'xlsx';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  // Parallel Projects Signals
  readonly projects = signal<Project[]>([]);
  readonly activeProjectId = signal<string>('');

  // State Signals
  readonly products = signal<Product[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly usage = signal<UsageRecord[]>([]);
  readonly storage = signal<StorageRecord[]>([]);
  readonly importHistory = signal<ImportRecord[]>([]);
  readonly currentDate = signal<string>(DateUtils.formatDate(new Date()));
  readonly patientVisits = signal<Record<string, number>>({}); // Key: YYYY-MM

  // Shared state for analysis pages
  readonly analysisStartDate = signal<string>(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  readonly analysisEndDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Computed State
  readonly savedDates = computed(() => {
    // Dates are derived from both usage and storage
    const dates = new Set([
        ...this.usage().map(u => u.date),
        ...this.storage().map(s => s.date)
    ]);
    return Array.from(dates).sort((a: string, b: string) => {
      return DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime();
    });
  });

  // Current Grid Data Helper
  readonly currentGridMap = computed(() => {
    const date = this.currentDate();
    const records = this.usage().filter(u => u.date === date);
    const map = new Map<string, number>();
    records.forEach(r => {
      map.set(`${r.productId}_${r.departmentId}`, r.quantity);
    });
    return map;
  });

  // Check if there are any changes in the grid that haven't been subtracted from storage yet
  readonly hasUnconfirmedChanges = computed(() => {
    const date = this.currentDate();
    return this.usage().some(u => u.date === date && u.quantity !== (u.confirmedQuantity || 0));
  });

  // Current Storage Map (Effective)
  readonly currentStorageMap = computed(() => {
    const date = this.currentDate();
    const allStorage = this.storage();
    
    // Check for explicit records
    const currentRecords = allStorage.filter(s => s.date === date);
    if (currentRecords.length > 0) {
        const map = new Map<string, number>();
        currentRecords.forEach(r => map.set(r.productId, r.quantity));
        return map;
    }

    // Find closest previous date
    const targetDateObj = DateUtils.parseDate(date);
    const sortedDates = Array.from(new Set(allStorage.map(s => s.date)))
        .map((d: string) => ({ date: d, obj: DateUtils.parseDate(d) }))
        .filter(d => d.obj.getTime() < targetDateObj.getTime())
        .sort((a, b) => b.obj.getTime() - a.obj.getTime());

    const map = new Map<string, number>();
    
    if (sortedDates.length > 0) {
        const prevDate = sortedDates[0].date;
        const prevRecords = allStorage.filter(s => s.date === prevDate);
        prevRecords.forEach(r => {
            // Copy value directly (No subtraction based on user requirement)
            map.set(r.productId, r.quantity);
        });
    }

    return map;
  });

  private backupTimeout: any = null;

  constructor(private supabaseService: SupabaseService) {
    this.initProjects();

    // Auto-save active project data whenever signals change
    effect(() => {
      const activeId = this.activeProjectId();
      if (!activeId) return;

      const data: ProjectData = {
        products: this.products(),
        departments: this.departments(),
        usage: this.usage(),
        storage: this.storage(),
        patientVisits: this.patientVisits(),
        importHistory: this.importHistory()
      };

      this.saveProjectData(activeId, data);

      // Auto backup to Supabase if configured and autoBackup is enabled
      if (this.supabaseService.isConfigured() && this.supabaseService.autoBackup()) {
        if (this.backupTimeout) {
          clearTimeout(this.backupTimeout);
        }
        this.backupTimeout = setTimeout(async () => {
          const jsonStr = JSON.stringify(data, null, 2);
          await this.supabaseService.uploadMainFile(activeId, jsonStr);
        }, 2000); // 2 seconds debounce
      }
    });
  }

  private saveProjectData(projectId: string, data: ProjectData) {
    try {
      localStorage.setItem(`resource_tracker_project_data_${projectId}`, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving project data to LocalStorage:', e);
    }
  }

  private loadProjectData(projectId: string): ProjectData | null {
    try {
      const dataStr = localStorage.getItem(`resource_tracker_project_data_${projectId}`);
      if (dataStr) {
        return JSON.parse(dataStr);
      }
    } catch (e) {
      console.error('Error loading project data from LocalStorage:', e);
    }
    return null;
  }

  // --- Parallel Projects Management ---

  private initProjects() {
    try {
      let projectsStr = localStorage.getItem('resource_tracker_projects');
      let activeId = localStorage.getItem('resource_tracker_active_project_id');
      
      // Migration: Ensure the Default Project has ID 'default' for cross-environment consistency
      if (projectsStr) {
        try {
          let loadedProjects = JSON.parse(projectsStr) as Project[];
          let migrated = false;
          
          loadedProjects = loadedProjects.map(p => {
            if (p.name === 'Default Project' && p.id !== 'default') {
              migrated = true;
              const oldKey = `resource_tracker_project_data_${p.id}`;
              const oldData = localStorage.getItem(oldKey);
              if (oldData) {
                localStorage.setItem('resource_tracker_project_data_default', oldData);
                localStorage.removeItem(oldKey);
              }
              if (activeId === p.id) {
                activeId = 'default';
              }
              return { ...p, id: 'default' };
            }
            return p;
          });

          if (migrated) {
            localStorage.setItem('resource_tracker_projects', JSON.stringify(loadedProjects));
            localStorage.setItem('resource_tracker_active_project_id', activeId || 'default');
            projectsStr = JSON.stringify(loadedProjects);
          }
        } catch (err) {
          console.error('Error migrating default project ID:', err);
        }
      }

      if (projectsStr) {
        const loadedProjects = JSON.parse(projectsStr) as Project[];
        this.projects.set(loadedProjects);
        
        if (activeId && loadedProjects.some(p => p.id === activeId)) {
          this.activeProjectId.set(activeId);
          const data = this.loadProjectData(activeId);
          if (data) {
            this.applyProjectData(data);
          }
        } else if (loadedProjects.length > 0) {
          const firstId = loadedProjects[0].id;
          this.activeProjectId.set(firstId);
          const data = this.loadProjectData(firstId);
          if (data) {
            this.applyProjectData(data);
          }
        } else {
          this.createDefaultProject();
        }
      } else {
        this.createDefaultProject();
      }
    } catch (e) {
      console.error('Error initializing projects:', e);
      this.createDefaultProject();
    }
  }

  private createDefaultProject() {
    const defaultId = 'default';
    const defaultProject: Project = { id: defaultId, name: 'Default Project' };
    this.projects.set([defaultProject]);
    this.activeProjectId.set(defaultId);
    
    // Save metadata
    localStorage.setItem('resource_tracker_projects', JSON.stringify([defaultProject]));
    localStorage.setItem('resource_tracker_active_project_id', defaultId);
    
    // Default project starts with empty arrays/objects
    this.newProject();
  }

  private applyProjectData(data: ProjectData) {
    this.products.set(data.products || []);
    this.departments.set(data.departments || []);
    this.usage.set(data.usage || []);
    this.storage.set(data.storage || []);
    this.patientVisits.set(data.patientVisits || {});
    this.importHistory.set(data.importHistory || []);

    // Set current date to latest in records or today
    const allDates = new Set([
      ...(data.usage || []).map(u => u.date),
      ...(data.storage || []).map(s => s.date)
    ]);
    if (allDates.size > 0) {
      const sortedDates = Array.from(allDates).sort((a: string, b: string) => 
        DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime()
      );
      this.currentDate.set(sortedDates[0]);
    } else {
      this.currentDate.set(DateUtils.formatDate(new Date()));
    }
  }

  createProject(name: string) {
    if (!name || !name.trim()) return;
    const newId = this.generateId();
    const newProject: Project = { id: newId, name: name.trim() };
    
    // Update projects signal
    const updatedProjects = [...this.projects(), newProject];
    this.projects.set(updatedProjects);
    
    // Set new active project
    this.activeProjectId.set(newId);
    
    // Clear state for new project
    this.newProject();
    
    // Persist list metadata
    localStorage.setItem('resource_tracker_projects', JSON.stringify(updatedProjects));
    localStorage.setItem('resource_tracker_active_project_id', newId);
  }

  selectProject(id: string) {
    if (id === this.activeProjectId()) return;
    
    // Update active project ID
    this.activeProjectId.set(id);
    localStorage.setItem('resource_tracker_active_project_id', id);
    
    // Load new project data
    const data = this.loadProjectData(id);
    if (data) {
      this.applyProjectData(data);
    } else {
      this.newProject();
    }
  }

  deleteProject(id: string) {
    const currentProjects = this.projects();
    const updatedProjects = currentProjects.filter(p => p.id !== id);
    
    // Remove data from local storage
    try {
      localStorage.removeItem(`resource_tracker_project_data_${id}`);
    } catch (e) {
      console.error(e);
    }

    this.projects.set(updatedProjects);
    localStorage.setItem('resource_tracker_projects', JSON.stringify(updatedProjects));

    // If we deleted the active project, select another one
    if (id === this.activeProjectId()) {
      if (updatedProjects.length > 0) {
        this.selectProject(updatedProjects[0].id);
      } else {
        this.createDefaultProject();
      }
    }
  }

  renameProject(id: string, newName: string) {
    if (!newName || !newName.trim()) return;
    const updatedProjects = this.projects().map(p => 
      p.id === id ? { ...p, name: newName.trim() } : p
    );
    this.projects.set(updatedProjects);
    localStorage.setItem('resource_tracker_projects', JSON.stringify(updatedProjects));
  }

  // Helper for ID generation that works in non-secure contexts
  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      try {
        return crypto.randomUUID();
      } catch (e) {
        // Fallback
      }
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // --- Actions ---

  setDate(date: string) {
    this.currentDate.set(date);
  }

  addProduct(name: string) {
    if (!name || !name.trim()) return;
    const newProduct: Product = { 
        id: this.generateId(), 
        name: name.trim(),
        keywords: [],
        packSize: 1
    };
    this.products.update(p => [...p, newProduct]);
  }

  updateProductSettings(id: string, keywords: string[], packSize: number) {
      this.products.update(p => p.map(x => {
          if (x.id === id) {
              return { ...x, keywords, packSize: packSize > 0 ? packSize : 1 };
          }
          return x;
      }));
  }

  addDepartment(name: string) {
    if (!name || !name.trim()) return;
    const newDept: Department = { id: this.generateId(), name: name.trim() };
    this.departments.update(d => [...d, newDept]);
  }

  reorderProducts(fromIndex: number, toIndex: number) {
    this.products.update(prods => {
      const result = [...prods];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }

  reorderDepartments(fromIndex: number, toIndex: number) {
    this.departments.update(depts => {
      const result = [...depts];
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      return result;
    });
  }

  updateUsage(productId: string, departmentId: string, quantity: number) {
    const date = this.currentDate();
    this.usage.update(records => {
      const existingIndex = records.findIndex(r => 
        r.date === date && r.productId === productId && r.departmentId === departmentId
      );

      if (existingIndex >= 0) {
        const rec = records[existingIndex];
        
        if (quantity === 0) {
          if (rec.confirmedQuantity && rec.confirmedQuantity > 0) {
             const newRecords = [...records];
             newRecords[existingIndex] = { ...rec, quantity: 0 };
             return newRecords;
          }
          return records.filter((_, i) => i !== existingIndex);
        }
        
        const newRecords = [...records];
        newRecords[existingIndex] = { ...rec, quantity };
        return newRecords;
      } else {
        if (quantity === 0) return records; 
        return [...records, { date, productId, departmentId, quantity, confirmedQuantity: 0 }];
      }
    });
  }

  confirmGridUsage() {
    const date = this.currentDate();
    const usageRecs = this.usage().filter(u => u.date === date);
    if (usageRecs.length === 0) return;

    const productDeltas = new Map<string, number>();

    usageRecs.forEach(rec => {
      const previous = rec.confirmedQuantity || 0;
      const current = rec.quantity;
      const delta = current - previous;
      if (delta !== 0) {
        const prodId = rec.productId;
        const currentDelta = productDeltas.get(prodId) || 0;
        productDeltas.set(prodId, currentDelta + delta);
      }
    });

    if (productDeltas.size === 0) return;

    const allStorage = this.storage();
    const currentEffectiveMap = this.currentStorageMap(); 
    
    const explicitStorageIndices = new Map<string, number>();
    allStorage.forEach((rec, idx) => {
        if (rec.date === date) explicitStorageIndices.set(rec.productId, idx);
    });

    let updatedStorage = [...allStorage];
    let storageChanged = false;

    productDeltas.forEach((delta, prodId) => {
        let effectiveVal = currentEffectiveMap.get(prodId);
        if (effectiveVal === undefined) effectiveVal = 0; 
        
        const newVal = effectiveVal - delta;
        storageChanged = true;
        
        if (explicitStorageIndices.has(prodId)) {
            const idx = explicitStorageIndices.get(prodId)!;
            updatedStorage[idx] = { ...updatedStorage[idx], quantity: newVal };
        } else {
            updatedStorage.push({ date, productId: prodId, quantity: newVal });
        }
    });

    if (storageChanged) {
        this.storage.set(updatedStorage);
    }

    const updatedUsage = this.usage().map(rec => {
        if (rec.date === date) {
            if (rec.quantity === 0) return null;
            return { ...rec, confirmedQuantity: rec.quantity };
        }
        return rec;
    }).filter(r => r !== null) as UsageRecord[];

    this.usage.set(updatedUsage);
  }

  updateStorage(productId: string, quantity: number) {
    const date = this.currentDate();
    this.storage.update(records => {
        const existingIndex = records.findIndex(r => r.date === date && r.productId === productId);
        
        if (existingIndex >= 0) {
            const newRecords = [...records];
            newRecords[existingIndex] = { ...newRecords[existingIndex], quantity };
            return newRecords;
        } else {
            return [...records, { date, productId, quantity }];
        }
    });
  }

  // Record that a product was imported from a waybill to prevent duplicates
  recordImport(waybillNumber: string, productId: string, quantity: number, originalNames: string[] = []) {
      const date = this.currentDate();
      this.importHistory.update(history => [
          ...history,
          { waybillNumber, productId, date, quantity, originalNames }
      ]);
  }

  deleteImport(waybillNumber: string) {
    this.importHistory.update(history => history.filter(h => h.waybillNumber !== waybillNumber));
  }

  updatePatientVisits(monthYear: string, count: number) {
    this.patientVisits.update(visits => {
      const newVisits = {...visits};
      if (count > 0) {
        newVisits[monthYear] = count;
      } else {
        delete newVisits[monthYear]; 
      }
      return newVisits;
    });
  }

  renameProduct(id: string, newName: string) {
    if (!newName || !newName.trim()) return;
    this.products.update(p => p.map(x => x.id === id ? { ...x, name: newName.trim() } : x));
  }

  deleteProduct(id: string) {
    this.products.update(p => p.filter(x => x.id !== id));
    this.usage.update(u => u.filter(x => x.productId !== id));
    this.storage.update(s => s.filter(x => x.productId !== id));
    this.importHistory.update(h => h.filter(x => x.productId !== id));
  }

  renameDepartment(id: string, newName: string) {
    if (!newName || !newName.trim()) return;
    this.departments.update(d => d.map(x => x.id === id ? { ...x, name: newName.trim() } : x));
  }

  deleteDepartment(id: string) {
    this.departments.update(d => d.filter(x => x.id !== id));
    this.usage.update(u => u.filter(x => x.departmentId !== id));
  }
  
  deleteDate(dateToDelete: string) {
    const targetDate = dateToDelete.trim();
    if (!targetDate) return;

    const newUsage = this.usage().filter(x => x.date.trim() !== targetDate);
    const newStorage = this.storage().filter(x => x.date.trim() !== targetDate);
    
    this.usage.set(newUsage);
    this.storage.set(newStorage);

    const remainingDates = Array.from(new Set([
        ...newUsage.map(u => u.date),
        ...newStorage.map(u => u.date)
    ])).sort((a: string, b: string) => 
        DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime()
    );

    if (remainingDates.length > 0) {
        this.currentDate.set(remainingDates[0]);
    } else {
        this.currentDate.set(DateUtils.formatDate(new Date()));
    }
  }

  deleteDates(datesToDelete: string[]) {
    const targets = new Set(datesToDelete.map(d => d.trim()));
    if (targets.size === 0) return;

    const newUsage = this.usage().filter(x => !targets.has(x.date.trim()));
    const newStorage = this.storage().filter(x => !targets.has(x.date.trim()));
    
    this.usage.set(newUsage);
    this.storage.set(newStorage);

    const remainingDates = Array.from(new Set([
        ...newUsage.map(u => u.date),
        ...newStorage.map(u => u.date)
    ])).sort((a: string, b: string) => 
        DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime()
    );
    
    const current = this.currentDate().trim();
    if (targets.has(current)) {
        if (remainingDates.length > 0) {
            this.currentDate.set(remainingDates[0]);
        } else {
            this.currentDate.set(DateUtils.formatDate(new Date()));
        }
    }
  }

  // --- Project File Operations ---

  newProject() {
    this.products.set([]);
    this.departments.set([]);
    this.usage.set([]);
    this.storage.set([]);
    this.patientVisits.set({});
    this.importHistory.set([]);
    this.currentDate.set(DateUtils.formatDate(new Date()));
  }

  getProjectJSON(): string {
    const data: ProjectData = {
      products: this.products(),
      departments: this.departments(),
      usage: this.usage(),
      storage: this.storage(),
      patientVisits: this.patientVisits(),
      importHistory: this.importHistory()
    };
    return JSON.stringify(data, null, 2);
  }

  loadProjectJSON(jsonStr: string) {
    try {
      const data: ProjectData = JSON.parse(jsonStr);
      if (Array.isArray(data.products) && Array.isArray(data.departments) && Array.isArray(data.usage)) {
        this.products.set(data.products);
        this.departments.set(data.departments);
        this.usage.set(data.usage);
        this.storage.set(data.storage || []);
        this.patientVisits.set(data.patientVisits || {});
        this.importHistory.set(data.importHistory || []);
        
        // Collect all dates
        const allDates = new Set([...data.usage.map(u => u.date), ...(data.storage || []).map(s => s.date)]);
        if (allDates.size > 0) {
           const sortedDates = Array.from(allDates).sort((a: string, b: string) => 
              DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime()
           );
           this.currentDate.set(sortedDates[0]);
        }
      } else {
        alert('Invalid project file format.');
      }
    } catch (e) {
      alert('Error parsing JSON file.');
      console.error(e);
    }
  }

  // --- Invoice Parsing Logic ---

  async parseInvoice(file: File): Promise<{ orders: Map<string, number>, waybillNumber: string | null, productNames: Map<string, string[]> }> {
      const arrayBuffer = await file.arrayBuffer();
      // FIX: Explicitly specify type: 'array' to handle XLSX/XLS/CSV consistently
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      
      const orders = new Map<string, number>();
      const productNames = new Map<string, string[]>(); // Map internal ProdID -> Array of original Invoice Names
      
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      if (data.length < 2) return { orders, waybillNumber: null, productNames };

      // 1. Try to find Waybill Number in header
      let waybillNumber: string | null = null;
      const waybillValueRegex = /(0\d{8,}|el-\d+)/i;
      
      // Label search regex: "ზედნადენის ნომერი" or "ზედნადების ნომერი"
      const labelRegex = /ზედნადენის\s*ნომერი|ზედნადების\s*ნომერი/i;

      // Scan first 20 rows for the label
      for (let r = 0; r < Math.min(20, data.length); r++) {
          const row = data[r];
          for (let c = 0; c < row.length; c++) {
              const cellVal = String(row[c]).trim();
              
              if (labelRegex.test(cellVal)) {
                  // Requirement: Check Cell Directly Below (r+1, same column)
                  if (r + 1 < data.length) {
                      const valBelow = String(data[r+1][c] || '').trim();
                      if (valBelow && waybillValueRegex.test(valBelow)) {
                          waybillNumber = valBelow.match(waybillValueRegex)![1];
                      }
                  }
                  
                  // Fallback: Check Right (in case user meant visually under but aligned differently)
                  if (!waybillNumber && c + 1 < row.length) {
                       const valRight = String(row[c+1] || '').trim();
                       if (valRight && waybillValueRegex.test(valRight)) {
                            waybillNumber = valRight.match(waybillValueRegex)![1];
                       }
                  }
                  
                  if (waybillNumber) break;
              }
          }
          if (waybillNumber) break;
      }

      // Fallback Strategy if exact label not found
      if (!waybillNumber) {
         const generalRegex = /(?:Waybill|el-0)(?:[\sN№#\.:]*)(0\d{8,}|el-\d+)/i;
         for (let i = 0; i < Math.min(20, data.length); i++) {
             const rowStr = data[i].join(' ');
             const match = rowStr.match(generalRegex);
             if (match) {
                 waybillNumber = match[1];
                 break;
             }
         }
      }

      // 2. Find Columns
      let headerRowIndex = -1;
      let nameColIdx = -1;
      let qtyColIdx = -1;
      let unitColIdx = -1;

      for(let i=0; i < Math.min(20, data.length); i++) {
          const row = data[i].map(c => String(c).toLowerCase().trim());
          const nIdx = row.findIndex(c => c.includes('დასახელება') || c.includes('name') || c.includes('საქონელი'));
          if (nIdx > -1) {
              headerRowIndex = i;
              nameColIdx = nIdx;
              qtyColIdx = row.findIndex(c => c === 'რაოდენობა' || c === 'quantity' || c.includes('რაოდ.'));
              unitColIdx = row.findIndex(c => c === 'ზომის ერთეული' || c.includes('ერთეული') || c === 'unit');
              break;
          }
      }

      if (headerRowIndex === -1 || nameColIdx === -1 || qtyColIdx === -1) {
          throw new Error("Could not identify columns (Name, Quantity) in the Excel file.");
      }

      const products = this.products();
      const history = this.importHistory();

      for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row) continue;

          const rawName = String(row[nameColIdx] || '').trim().toLowerCase();
          let qty = parseFloat(row[qtyColIdx]);
          const unit = unitColIdx > -1 ? String(row[unitColIdx] || '').trim().toLowerCase() : '';

          if (!rawName || isNaN(qty) || qty <= 0) continue;

          // DUPLICATE CHECK
          // Check if this specific line (by name and waybill) was already imported
          if (waybillNumber) {
              const alreadyImported = history.some(h => 
                  h.waybillNumber === waybillNumber && 
                  h.originalNames?.includes(rawName)
              );
              if (alreadyImported) {
                  console.log(`Skipping duplicate: Waybill ${waybillNumber}, Item ${rawName}`);
                  continue; // Skip this item entirely
              }
          }

          // Try to match with our products using Keywords
          const matchedProduct = products.find(p => {
              if (p.keywords && p.keywords.length > 0) {
                  return p.keywords.some(k => {
                      const keyword = k.trim().toLowerCase();
                      return keyword && rawName.includes(keyword);
                  });
              }
              return false;
          });

          if (matchedProduct) {
             // Handle Pack Conversion
             if (unit.includes('შეკვრა') || unit.includes('pack')) {
                 if (matchedProduct.packSize && matchedProduct.packSize > 1) {
                     qty = qty * matchedProduct.packSize;
                 }
             }
             
             // Add to orders
             const currentQty = orders.get(matchedProduct.id) || 0;
             orders.set(matchedProduct.id, currentQty + qty);

             // Track original name for history saving
             const names = productNames.get(matchedProduct.id) || [];
             if (!names.includes(rawName)) {
                 names.push(rawName);
                 productNames.set(matchedProduct.id, names);
             }
          }
      }

      return { orders, waybillNumber, productNames };
  }

  // --- Excel Operations ---

  async exportToExcel() {
    const dates = this.savedDates();

    if (dates.length === 0) {
      alert("No data to export.");
      return;
    }

    const workbook = new ExcelJS.Workbook();

    for (const date of dates) {
      const sheet = workbook.addWorksheet(date);

      // Header: Product | Departments... | Total Usage | Storage
      const departments = this.departments();
      const headerRow = ['Product', ...departments.map(d => d.name), 'Total Usage', 'Storage'];
      const header = sheet.addRow(headerRow);

      // Style Header
      header.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.border = {
          top: {style:'medium'}, left: {style:'medium'}, bottom: {style:'medium'}, right: {style:'medium'}
        };
        // All columns except the first (Product) are vertical
        if (colNumber > 1) {
          cell.alignment = { textRotation: 90, vertical: 'bottom', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      const dateUsage = this.usage().filter(u => u.date === date);
      const dateStorage = this.storage().filter(s => s.date === date);
      
      this.products().forEach(prod => {
        const rowData: any[] = [prod.name];
        let rowTotal = 0;
        
        departments.forEach(dept => {
          const rec = dateUsage.find(u => u.productId === prod.id && u.departmentId === dept.id);
          const qty = rec ? rec.quantity : 0;
          rowData.push(qty || ''); 
          rowTotal += qty;
        });
        
        rowData.push(rowTotal);
        
        const storageRec = dateStorage.find(s => s.productId === prod.id);
        rowData.push(storageRec ? storageRec.quantity : '');

        const row = sheet.addRow(rowData);
        row.eachCell(cell => {
           cell.border = {
             top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'}
           };
        });
      });

      // Auto-fit columns
      const colCount = sheet.columnCount;
      for (let colIdx = 1; colIdx <= colCount; colIdx++) {
        const column = sheet.getColumn(colIdx);
        const i = colIdx - 1;
        let maxLength = 0;
        column.eachCell!({ includeEmpty: true }, cell => {
          const valStr = cell.value !== null && cell.value !== undefined ? cell.value.toString() : '';
          const columnLength = valStr.length;
          // Ignore header row (row 1) for all vertical text columns
          if (i > 0 && String(cell.row) === '1') {
              return;
          }
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
        
        if (i > 0) {
           column.width = Math.max(2.5, maxLength + 0.8);
        } else {
           column.width = Math.max(8, maxLength + 2);
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'ResourceTracking.xlsx');
  }

  async importFromExcel(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer);
    
    const newProducts = new Map<string, Product>();
    const newDepartments = new Map<string, Department>();
    const newUsage: UsageRecord[] = [];
    
    let importedSheetCount = 0;

    this.products().forEach(p => newProducts.set(p.name.toLowerCase(), p));
    this.departments().forEach(d => newDepartments.set(d.name.toLowerCase(), d));

    const dateRegex = /^\d{2}\.\d{2}\.\d{2}$/;

    wb.SheetNames.forEach(sheetName => {
      if (!dateRegex.test(sheetName.trim())) {
        return;
      }
      importedSheetCount++;
      const date = sheetName.trim(); 
      
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (data.length < 2) return;

      const headerRow = data[0];
      const deptIndices: { index: number, deptId: string }[] = [];

      for (let i = 1; i < headerRow.length; i++) {
        const colName = String(headerRow[i]).trim();
        if (!colName || ['total', 'სულ', 'storage', 'მარაგი', 'total usage'].includes(colName.toLowerCase())) continue;

        let deptId = '';
        if (newDepartments.has(colName.toLowerCase())) {
          deptId = newDepartments.get(colName.toLowerCase())!.id;
        } else {
          deptId = this.generateId();
          const newDept = { id: deptId, name: colName };
          newDepartments.set(colName.toLowerCase(), newDept);
        }
        deptIndices.push({ index: i, deptId });
      }

      for (let r = 1; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;
        const prodName = String(row[0] || '').trim();
        if (!prodName) continue;

        let prodId = '';
        if (newProducts.has(prodName.toLowerCase())) {
          prodId = newProducts.get(prodName.toLowerCase())!.id;
        } else {
          prodId = this.generateId();
          const newProd = { 
              id: prodId, 
              name: prodName,
              keywords: [],
              packSize: 1
          };
          newProducts.set(prodName.toLowerCase(), newProd);
        }

        deptIndices.forEach(di => {
          const val = row[di.index];
          const quantity = typeof val === 'number' ? val : parseFloat(String(val));
          if (!isNaN(quantity) && quantity > 0) {
            newUsage.push({
              date,
              productId: prodId,
              departmentId: di.deptId,
              quantity,
              confirmedQuantity: 0 // New import is unconfirmed
            });
          }
        });
      }
    });

    if (importedSheetCount === 0) {
      alert("Import failed: No sheets with a valid date name (dd.mm.yy) were found.");
      return;
    }

    this.products.set(Array.from(newProducts.values()));
    this.departments.set(Array.from(newDepartments.values()));
    
    const importedDates = new Set(newUsage.map(u => u.date));
    const keptUsage = this.usage().filter(u => !importedDates.has(u.date));
    
    this.usage.set([...keptUsage, ...newUsage]);
    
    if (importedDates.size > 0) {
        this.currentDate.set(Array.from(importedDates).sort((a: string, b: string) => DateUtils.parseDate(b).getTime() - DateUtils.parseDate(a).getTime())[0]);
    }
    
    alert(`Imported data from ${importedSheetCount} sheets.`);
  }
}