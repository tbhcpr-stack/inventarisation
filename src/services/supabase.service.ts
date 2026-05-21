import { Injectable, signal, computed } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getEnvVar(name: string): string {
  // Try window.env
  if ((window as any).env && (window as any).env[name]) {
    return (window as any).env[name];
  }
  // Try window.process?.env
  if ((window as any).process?.env && (window as any).process.env[name]) {
    return (window as any).process.env[name];
  }
  // Try import.meta.env
  try {
    const metaEnv = (import.meta as any).env;
    if (metaEnv) {
      if (metaEnv[name]) return metaEnv[name];
      if (metaEnv[`VITE_${name}`]) return metaEnv[`VITE_${name}`];
    }
  } catch (e) {}
  
  return '';
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // Configuration Signals
  readonly url = signal<string>('');
  readonly anonKey = signal<string>('');
  readonly bucket = signal<string>('');
  readonly autoBackup = signal<boolean>(false);

  // Status Signals
  readonly isUploading = signal<boolean>(false);
  readonly isDownloading = signal<boolean>(false);

  // Dynamic Supabase Client
  private readonly supabaseClient = computed<SupabaseClient | null>(() => {
    const u = this.url();
    const k = this.anonKey();
    if (u && k) {
      try {
        return createClient(u, k, {
          auth: {
            persistSession: false // Client-side backup upload only, no auth needed
          }
        });
      } catch (err) {
        console.error('Failed to create Supabase client:', err);
        return null;
      }
    }
    return null;
  });

  // Check if fully configured
  readonly isConfigured = computed(() => {
    return !!this.url() && !!this.anonKey() && !!this.bucket();
  });

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration() {
    // 1. Try to load from LocalStorage first (UI settings take priority)
    try {
      const storageUrl = localStorage.getItem('resource_tracker_supabase_url');
      const storageKey = localStorage.getItem('resource_tracker_supabase_anon_key');
      const storageBucket = localStorage.getItem('resource_tracker_supabase_bucket');
      const storageAutoBackup = localStorage.getItem('resource_tracker_supabase_auto_backup') === 'true';

      if (storageUrl?.trim() && storageKey?.trim() && storageBucket?.trim()) {
        this.url.set(storageUrl.trim());
        this.anonKey.set(storageKey.trim());
        this.bucket.set(storageBucket.trim());
        this.autoBackup.set(storageAutoBackup);
        console.log('Supabase configured via LocalStorage (UI settings).');
        return;
      }
    } catch (e) {
      console.error('Error loading Supabase config from LocalStorage:', e);
    }

    // 2. Fallback to environment variables (statically accessed for Vite/Vercel build-time replacement)
    let envUrl = '';
    let envKey = '';
    let envBucket = '';
    let envAuto = false;

    try {
      const metaEnv = (import.meta as any).env;
      if (metaEnv) {
        envUrl = metaEnv.VITE_SUPABASE_URL || '';
        envKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';
        envBucket = metaEnv.VITE_SUPABASE_BUCKET || '';
        envAuto = metaEnv.VITE_SUPABASE_AUTO_BACKUP === 'true';
      }
    } catch (e) {}

    // Fallback to getEnvVar check
    if (!envUrl) envUrl = getEnvVar('SUPABASE_URL');
    if (!envKey) envKey = getEnvVar('SUPABASE_ANON_KEY');
    if (!envBucket) envBucket = getEnvVar('SUPABASE_BUCKET');
    if (!envAuto) {
      const autoStr = getEnvVar('SUPABASE_AUTO_BACKUP');
      if (autoStr) envAuto = autoStr === 'true';
    }

    if (envUrl && envKey && envBucket) {
      this.url.set(envUrl);
      this.anonKey.set(envKey);
      this.bucket.set(envBucket);
      this.autoBackup.set(envAuto);
      console.log('Supabase configured via environment variables.');
      return;
    }
  }

  saveCredentials(url: string, key: string, bucket: string, autoBackup: boolean) {
    const trimmedUrl = url.trim();
    const trimmedKey = key.trim();
    const trimmedBucket = bucket.trim();

    this.url.set(trimmedUrl);
    this.anonKey.set(trimmedKey);
    this.bucket.set(trimmedBucket);
    this.autoBackup.set(autoBackup);

    try {
      if (trimmedUrl && trimmedKey && trimmedBucket) {
        localStorage.setItem('resource_tracker_supabase_url', trimmedUrl);
        localStorage.setItem('resource_tracker_supabase_anon_key', trimmedKey);
        localStorage.setItem('resource_tracker_supabase_bucket', trimmedBucket);
        localStorage.setItem('resource_tracker_supabase_auto_backup', autoBackup ? 'true' : 'false');
      } else {
        localStorage.removeItem('resource_tracker_supabase_url');
        localStorage.removeItem('resource_tracker_supabase_anon_key');
        localStorage.removeItem('resource_tracker_supabase_bucket');
        localStorage.removeItem('resource_tracker_supabase_auto_backup');
        // Re-trigger loadConfiguration to fall back to environment variables if UI settings were cleared
        this.loadConfiguration();
      }
    } catch (e) {
      console.error('Error saving Supabase config to LocalStorage:', e);
    }
  }

  async testConnection(): Promise<boolean> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return false;

    try {
      const testFile = new Blob(['ok'], { type: 'text/plain' });
      const testPath = `.connection_test_${Date.now()}.txt`;
      
      // Attempt upload
      const { error: uploadError } = await client.storage
        .from(bucketName)
        .upload(testPath, testFile, { upsert: true });

      if (uploadError) {
        console.error('Supabase connection test upload failed:', uploadError);
        return false;
      }

      // Attempt cleanup delete
      await client.storage.from(bucketName).remove([testPath]);
      return true;
    } catch (err) {
      console.error('Supabase connection test exception:', err);
      return false;
    }
  }

  async uploadMainFile(projectId: string, jsonStr: string): Promise<boolean> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return false;

    this.isUploading.set(true);
    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filePath = `projects/project_${projectId}.json`;
      const { error } = await client.storage
        .from(bucketName)
        .upload(filePath, blob, { upsert: true });

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error uploading main project file to Supabase:', err);
      return false;
    } finally {
      this.isUploading.set(false);
    }
  }

  async uploadBackupFile(projectId: string, jsonStr: string): Promise<boolean> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return false;

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `backups/project_${projectId}_${timestamp}.json`;
      const { error } = await client.storage
        .from(bucketName)
        .upload(filePath, blob);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error uploading backup project file to Supabase:', err);
      return false;
    }
  }

  async downloadMainFile(projectId: string): Promise<string | null> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return null;

    this.isDownloading.set(true);
    try {
      const filePath = `projects/project_${projectId}.json`;
      const { data, error } = await client.storage
        .from(bucketName)
        .download(filePath);

      if (error) throw error;
      if (!data) return null;
      return await data.text();
    } catch (err) {
      console.error('Error downloading main project file from Supabase:', err);
      return null;
    } finally {
      this.isDownloading.set(false);
    }
  }

  async uploadAutoBackupFile(projectId: string, jsonStr: string): Promise<boolean> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return false;

    try {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = `autobackups/project_${projectId}_${timestamp}.json`;
      const { error } = await client.storage
        .from(bucketName)
        .upload(filePath, blob);

      if (error) throw error;

      // Clean up old auto-backups in the background (keep latest 10)
      try {
        const { data: files } = await client.storage
          .from(bucketName)
          .list('autobackups', {
            limit: 100,
            sortBy: { column: 'name', order: 'desc' }
          });

        if (files) {
          const projectAutoFiles = files
            .filter(f => f.name.startsWith(`project_${projectId}_`))
            .sort((a, b) => b.name.localeCompare(a.name));

          if (projectAutoFiles.length > 10) {
            const filesToDelete = projectAutoFiles.slice(10).map(f => `autobackups/${f.name}`);
            await client.storage.from(bucketName).remove(filesToDelete);
          }
        }
      } catch (cleanErr) {
        console.error('Error cleaning up old auto-backups:', cleanErr);
      }

      return true;
    } catch (err) {
      console.error('Error uploading auto backup project file to Supabase:', err);
      return false;
    }
  }

  async listBackups(projectId: string): Promise<{ manual: BackupInfo[], auto: BackupInfo[] }> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return { manual: [], auto: [] };

    try {
      // List manual backups
      const { data: manualFiles, error: manualError } = await client.storage
        .from(bucketName)
        .list('backups', {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' }
        });

      // List auto backups
      const { data: autoFiles, error: autoError } = await client.storage
        .from(bucketName)
        .list('autobackups', {
          limit: 100,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (manualError) console.error('Error listing manual backups:', manualError);
      if (autoError) console.error('Error listing auto backups:', autoError);

      const parseBackupFiles = (files: any[], folder: string): BackupInfo[] => {
        return (files || [])
          .filter(f => f.name.startsWith(`project_${projectId}_`))
          .map(f => {
            const match = f.name.match(/project_[^_]+_(.+)\.json/);
            let timestampStr = f.created_at || '';
            if (match && match[1]) {
              const rawTs = match[1];
              const parts = rawTs.split('T');
              if (parts.length === 2) {
                const timePart = parts[1].replace(/-/g, ':');
                const dotIndex = timePart.lastIndexOf(':');
                const timeWithDot = dotIndex !== -1 ? timePart.substring(0, dotIndex) + '.' + timePart.substring(dotIndex + 1) : timePart;
                const iso = `${parts[0]}T${timeWithDot}`;
                try {
                  const date = new Date(iso);
                  if (!isNaN(date.getTime())) {
                    timestampStr = date.toISOString();
                  }
                } catch (e) {}
              }
            }
            return {
              name: f.name,
              path: `${folder}/${f.name}`,
              createdAt: timestampStr ? new Date(timestampStr) : new Date(f.created_at)
            };
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      };

      const manual = parseBackupFiles(manualFiles || [], 'backups');
      const auto = parseBackupFiles(autoFiles || [], 'autobackups');

      return { manual, auto };
    } catch (err) {
      console.error('Error in listBackups:', err);
      return { manual: [], auto: [] };
    }
  }

  async downloadBackupFileByPath(filePath: string): Promise<string | null> {
    const client = this.supabaseClient();
    const bucketName = this.bucket();
    if (!client || !bucketName) return null;

    this.isDownloading.set(true);
    try {
      const { data, error } = await client.storage
        .from(bucketName)
        .download(filePath);

      if (error) throw error;
      if (!data) return null;
      return await data.text();
    } catch (err) {
      console.error(`Error downloading backup file from Supabase (${filePath}):`, err);
      return null;
    } finally {
      this.isDownloading.set(false);
    }
  }
}

export interface BackupInfo {
  name: string;
  path: string;
  createdAt: Date;
}

