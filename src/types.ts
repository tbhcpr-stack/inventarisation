export interface Product {
  id: string;
  name: string;
  keywords?: string[]; // Array of strings to match in invoice
  packSize?: number;   // Amount in a "pack" (შეკვრა)
}

export interface Department {
  id: string;
  name: string;
}

export interface UsageRecord {
  date: string; // Format: dd.mm.yy
  productId: string;
  departmentId: string;
  quantity: number;
  confirmedQuantity?: number; // Tracks how much has been subtracted from storage
}

export interface StorageRecord {
  date: string; // Format: dd.mm.yy
  productId: string;
  quantity: number;
}

export interface ImportRecord {
  waybillNumber: string;
  productId: string;
  date: string; // Date of import
  quantity: number;
  originalNames?: string[]; // Names from the invoice source "საქონლის დასახელება"
}

export interface Project {
  id: string;
  name: string;
}

export interface ProjectData {
  products: Product[];
  departments: Department[];
  usage: UsageRecord[];
  storage?: StorageRecord[]; 
  patientVisits?: Record<string, number>; // Key: YYYY-MM, Value: count
  importHistory?: ImportRecord[];
}

export type ViewMode = 'grid' | 'storage' | 'analysis' | 'graph' | 'monthly-analysis';

export interface AnalysisResult {
  productName: string;
  departmentName: string;
  sum: number;
  average: number;
  min: number;
  max: number;
}