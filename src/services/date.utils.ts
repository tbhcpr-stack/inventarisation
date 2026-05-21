export class DateUtils {
  // Format Date object to dd.mm.yy
  static formatDate(date: Date): string {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    return `${d}.${m}.${y}`;
  }

  // Parse dd.mm.yy to Date object
  static parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();
    const parts = dateStr.split('.');
    if (parts.length !== 3) return new Date();
    
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    // Assume 20xx for yy
    const y = 2000 + parseInt(parts[2], 10);
    
    return new Date(y, m, d);
  }

  // Convert Date input string (yyyy-mm-dd) to dd.mm.yy
  static inputToAppFormat(isoDate: string): string {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}.${m}.${y.slice(-2)}`;
  }

  // Convert dd.mm.yy to input string (yyyy-mm-dd)
  static appFormatToInput(appDate: string): string {
    if (!appDate) return '';
    const parts = appDate.split('.');
    if (parts.length !== 3) return '';
    return `20${parts[2]}-${parts[1]}-${parts[0]}`;
  }

  static getMonthYear(dateStr: string): string {
    const d = this.parseDate(dateStr);
    return `${d.getMonth() + 1}/${d.getFullYear()}`;
  }
}