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
    // 1. Try to load from environment variables (useful for pre-configured deployments)
    const envUrl = getEnvVar('SUPABASE_URL');
    const envKey = getEnvVar('SUPABASE_ANON_KEY');
    const envBucket = getEnvVar('SUPABASE_BUCKET');
    const envAuto = getEnvVar('SUPABASE_AUTO_BACKUP') === 'true';

    if (envUrl && envKey && envBucket) {
      this.url.set(envUrl);
      this.anonKey.set(envKey);
      this.bucket.set(envBucket);
      this.autoBackup.set(envAuto);
      console.log('Supabase configured via environment variables.');
      return;
    }

    // 2. Fallback to LocalStorage
    try {
      this.url.set(localStorage.getItem('resource_tracker_supabase_url') || '');
      this.anonKey.set(localStorage.getItem('resource_tracker_supabase_anon_key') || '');
      this.bucket.set(localStorage.getItem('resource_tracker_supabase_bucket') || '');
      this.autoBackup.set(localStorage.getItem('resource_tracker_supabase_auto_backup') === 'true');
    } catch (e) {
      console.error('Error loading Supabase config from LocalStorage:', e);
    }
  }

  saveCredentials(url: string, key: string, bucket: string, autoBackup: boolean) {
    this.url.set(url.trim());
    this.anonKey.set(key.trim());
    this.bucket.set(bucket.trim());
    this.autoBackup.set(autoBackup);

    try {
      localStorage.setItem('resource_tracker_supabase_url', url.trim());
      localStorage.setItem('resource_tracker_supabase_anon_key', key.trim());
      localStorage.setItem('resource_tracker_supabase_bucket', bucket.trim());
      localStorage.setItem('resource_tracker_supabase_auto_backup', autoBackup ? 'true' : 'false');
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
}
