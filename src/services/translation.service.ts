import { Injectable, signal, computed } from '@angular/core';

export type Lang = 'en' | 'ge';

const DICTIONARY: Record<string, Record<Lang, string>> = {
  // App Titles & Nav
  'app_title': { en: 'Inventory Tracking', ge: 'რესურსების მართვა' },
  'nav_grid': { en: 'Grid', ge: 'ბადე' },
  'nav_storage': { en: 'Storage', ge: 'მარაგი' },
  'nav_analysis': { en: 'Analysis', ge: 'ანალიზი' },
  'nav_monthly': { en: 'Monthly', ge: 'თვიური' },
  'nav_graph': { en: 'Graph', ge: 'გრაფიკი' },

  // Controls
  'load_saved_date': { en: 'History...', ge: 'ისტორია...' },
  'new_project': { en: 'New Project', ge: 'ახალი' },
  'import_excel': { en: 'Import Excel', ge: 'იმპორტი' },
  'export_excel': { en: 'Export Excel', ge: 'ექსპორტი' },
  'save_json': { en: 'Save JSON', ge: 'შენახვა' },
  'load_json': { en: 'Load JSON', ge: 'გახსნა' },

  // Dialogs
  'confirm_delete_date': { en: 'Delete data for', ge: 'წაიშალოს მონაცემები:' },
  'this_cannot_be_undone': { en: 'Cannot be undone.', ge: 'დაბრუნება შეუძლებელია.' },
  'manage_history': { en: 'Manage History', ge: 'ისტორიის მართვა' },
  'select_all': { en: 'Select All', ge: 'ყველა' },
  'deselect_all': { en: 'Deselect All', ge: 'არცერთი' },
  'delete_selected': { en: 'Delete Selected', ge: 'წაშლა' },
  'confirm_bulk_delete_title': { en: 'Confirm Deletion', ge: 'წაშლის დადასტურება' },
  'confirm_bulk_delete_msg': { en: 'Delete selected dates? This cannot be undone.', ge: 'წაიშალოს მონიშნული თარიღები? დაბრუნება შეუძლებელია.' },
  'no_history': { en: 'No history available.', ge: 'ისტორია ცარიელია.' },
  'new_project_title': { en: 'New Project Confirmation', ge: 'ახალი პროექტის დადასტურება' },
  'new_project_message': { en: 'Starting a new project will clear all unsaved data. Would you like to save first?', ge: 'ახალი პროექტის დაწყობა წაშლის შენახულ მონაცემებს. გსურთ პირველ რიგში შენახვა?' },
  'discard_and_new': { en: 'Discard & New', ge: 'გაუქმება და ახალი' },
  'save_and_new': { en: 'Save & New', ge: 'შენახვა და ახალი' },

  // Grid
  'grid_layout': { en: 'Layout', ge: 'განლაგება' },
  'fit_content': { en: 'Fit', ge: 'ავტო' },
  'zoom': { en: 'Zoom', ge: 'მასშტაბი' },
  'prod_dept': { en: 'Prod. / Dept.', ge: 'პროდ. / დეპ.' },
  'total': { en: 'Total', ge: 'სულ' },
  'add_product': { en: 'Add Product', ge: 'დამატება' },
  'add_new_product': { en: 'Add New Product', ge: 'ახალი პროდუქტი' },
  'add_new_dept': { en: 'Add New Department', ge: 'ახალი დეპ.' },
  'rename': { en: 'Rename', ge: 'გადარქმევა' },
  'delete': { en: 'Delete', ge: 'წაშლა' },
  'cancel': { en: 'Cancel', ge: 'გაუქმება' },
  'save': { en: 'Save', ge: 'შენახვა' },
  'confirm': { en: 'Confirm', ge: 'დადასტურება' },
  'confirm_usage': { en: 'Confirm Usage', ge: 'გახარჯვა' },
  'enter_value': { en: 'Enter value...', ge: 'მნიშვნელობა...' },
  'confirm_deletion_title': { en: 'Confirm Deletion', ge: 'წაშლის დადასტურება' },
  'confirm_deletion_msg': { en: 'Delete', ge: 'წაიშალოს' },

  // Storage
  'storage_quantity': { en: 'Storage', ge: 'მარაგი' },
  'ordered': { en: 'Ordered', ge: 'შეკვეთილი' },
  'confirm_orders': { en: 'Confirm Orders', ge: 'შეკვეთის დადასტურება' },
  'previous_storage': { en: 'Prev. Storage', ge: 'წინა მარაგი' },
  'total_usage': { en: 'Used', ge: 'გახარჯული' },
  'storage_auto_calculated': { en: 'Storage calculated from previous history', ge: 'მარაგი დათვლილია ისტორიიდან' },
  'import_invoice': { en: 'Import Invoice', ge: 'ინვოისის ატვირთვა' },
  'import_rs': { en: 'Import RS.GE', ge: 'RS.GE იმპორტი' },
  'import_rs_tooltip': { en: 'Import file downloaded from RS.GE automation', ge: 'RS.GE-დან ჩამოტვირთული ფაილის იმპორტი' },
  'product_settings': { en: 'Product Settings', ge: 'პარამეტრები' },
  'keywords': { en: 'Hashtags / Keywords', ge: 'საძიებო სიტყვები' },
  'keywords_ph': { en: 'comma, separated, tags', ge: 'მძიმით, გამოყოფილი, სიტყვები' },
  'pack_size': { en: 'Pack Size', ge: 'შეკვრის ოდენობა' },
  'invoice_imported': { en: 'Invoice Imported', ge: 'ინვოისი დამუშავდა' },
  'products_matched': { en: 'products matched and added to order list.', ge: 'პროდუქტი მოიძებნა და დაემატა შეკვეთებს.' },
  'import_history': { en: 'Import History', ge: 'იმპორტის ისტორია' },
  'waybill': { en: 'Waybill', ge: 'ზედნადები' },
  'items': { en: 'Items', ge: 'საგნები' },
  'delete_import': { en: 'Delete Record', ge: 'ჩანაწერის წაშლა' },
  'no_imports': { en: 'No import history found.', ge: 'იმპორტის ისტორია ცარიელია.' },

  // Analysis
  'start_date': { en: 'Start', ge: 'დან' },
  'end_date': { en: 'End', ge: 'მდე' },
  'analyze_range': { en: 'Analyze', ge: 'ანალიზი' },
  'analysis_results': { en: 'Results', ge: 'შედეგები' },
  'records_found': { en: 'records', ge: 'ჩანაწერი' },
  'product': { en: 'Product', ge: 'პროდუქტი' },
  'department': { en: 'Department', ge: 'დეპარტამენტი' },
  'sum': { en: 'Sum', ge: 'ჯამი' },
  'average': { en: 'Avg', ge: 'საშ.' },
  'min': { en: 'Min', ge: 'მინ' },
  'max': { en: 'Max', ge: 'მაქს' },
  'no_data_range': { en: 'No data in range.', ge: 'მონაცემები არ არის.' },

  // Monthly
  'total_per_month': { en: 'Total (Monthly)', ge: 'ჯამური' },
  'avg_per_day': { en: 'Avg (Daily)', ge: 'საშ. დღიური' },
  'print': { en: 'Print', ge: 'ბეჭდვა' },
  'total_patient_visits': { en: 'Patient Visits', ge: 'პაციენტთა ვიზიტები' },
  'no_products_found': { en: 'No products found.', ge: 'პროდუქტები არ მოიძებნა.' },

  // Graph
  'graph_config': { en: 'Config', ge: 'პარამეტრები' },
  'date_range': { en: 'Period', ge: 'პერიოდი' },
  'method': { en: 'Method', ge: 'მეთოდი' },
  'sum_monthly': { en: 'Sum', ge: 'ჯამი' },
  'avg_monthly': { en: 'Average', ge: 'საშუალო' },
  'products': { en: 'Products', ge: 'პროდუქტები' },
  'departments': { en: 'Departments', ge: 'დეპარტამენტები' },
  'toggle_all': { en: 'All', ge: 'ყველა' },
  'include_total': { en: 'Total', ge: 'სულ' },
  'include_patient_visits': { en: 'Patients', ge: 'პაციენტები' },
  'show_legend': { en: 'Legend', ge: 'ლეგენდა' },
  'other_options': { en: 'Options', ge: 'ოფციები' },
  'update_graph': { en: 'Update', ge: 'განახლება' },
  'analytics_vis': { en: 'Visualization', ge: 'გრაფიკი' },
  'export_png': { en: 'PNG', ge: 'PNG' },
  'no_data_selection': { en: 'No data', ge: 'მონაცემები არ არის' },
  'all_products': { en: 'All Products', ge: 'ყველა პროდუქტი' },
  'all_departments': { en: 'All Departments', ge: 'ყველა დეპარტამენტი' },

  // Print
  'print_options': { en: 'Print Options', ge: 'ბეჭდვის პარამეტრები' },
  'smart_fit': { en: 'Smart Fit (Single Page)', ge: 'ერთ გვერდზე დატევა' },
  'smart_fit_desc': { en: 'Scales content to fit on a single page width.', ge: 'მასშტაბის შემცირება გვერდზე დასატევად.' },
  'multi_page': { en: 'Multiple Pages (Full Size)', ge: 'მრავალგვერდიანი (სრული ზომა)' },
  'multi_page_desc': { en: 'Preserves text size and spans multiple pages.', ge: 'ინარჩუნებს ზომას და გადადის გვერდებზე.' },

  // Projects
  'manage_projects': { en: 'Manage Projects', ge: 'პროექტების მართვა' },
  'new_project_name': { en: 'New Project Name', ge: 'ახალი პროექტის სახელი' },
  'enter_project_name': { en: 'Enter project name', ge: 'ჩაწერეთ პროექტის სახელი' },
  'delete_project_confirm': { en: 'Delete project and all its data? This cannot be undone.', ge: 'წაიშალოს პროექტი და მისი ყველა მონაცემი? დაბრუნება შეუძლებელია.' },
  'project_name': { en: 'Project Name', ge: 'პროექტის სახელი' },
  'create': { en: 'Create', ge: 'შექმნა' },
  'active_project': { en: 'Active Project', ge: 'აქტიური პროექტი' }
};

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  currentLang = signal<Lang>('en');

  setLang(lang: Lang) {
    this.currentLang.set(lang);
    document.documentElement.lang = lang === 'ge' ? 'ka-GE' : 'en-US';
  }

  // Helper to get text reactively
  t(key: string): string {
    return DICTIONARY[key]?.[this.currentLang()] || key;
  }
}