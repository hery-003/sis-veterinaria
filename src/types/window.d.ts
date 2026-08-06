interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string>;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface User {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'veterinario' | 'recepcionista';
  activo: boolean;
  must_change_password?: boolean;
  created_at?: string;
}

interface WindowApi {
  getUser: () => User | null;
  hasRole: (roles: string | string[]) => boolean;

  login: (username: string, password: string) => Promise<User | null>;
  logout: () => Promise<void>;
  getMe: () => Promise<User>;
  setUser: (user: User | null) => Promise<any>;

  getPropietarios: (params?: any) => Promise<PaginatedResponse<any>>;
  getPropietario: (id: number) => Promise<any>;
  createPropietario: (data: any) => Promise<any>;
  updatePropietario: (data: any) => Promise<any>;
  deletePropietario: (id: number) => Promise<any>;
  restorePropietario: (id: number) => Promise<any>;
  checkCiDuplicate: (ci: string, excludeId?: number) => Promise<{ exists: boolean; nombre?: string }>;

  getMascotas: (params?: any) => Promise<PaginatedResponse<any>>;
  getMascota: (id: number) => Promise<any>;
  createMascota: (data: any) => Promise<any>;
  updateMascota: (data: any) => Promise<any>;
  deleteMascota: (id: number) => Promise<any>;
  restoreMascota: (id: number) => Promise<any>;

  getHistorial: (mascotaId: number) => Promise<any[]>;
  getHistorialAll: (filters?: any) => Promise<any[]>;
  createHistorial: (data: any) => Promise<any>;
  updateHistorial: (data: any) => Promise<any>;
  deleteHistorial: (id: number) => Promise<any>;

  getVacunas: (mascotaId: number) => Promise<any[]>;
  createVacuna: (data: any) => Promise<any>;
  updateVacuna: (data: any) => Promise<any>;
  deleteVacuna: (id: number) => Promise<any>;

  getDesparasitaciones: (mascotaId: number) => Promise<any[]>;
  createDesparasitacion: (data: any) => Promise<any>;
  updateDesparasitacion: (data: any) => Promise<any>;
  deleteDesparasitacion: (id: number) => Promise<any>;

  getCitasByDate: (fecha: string) => Promise<any[]>;
  getCitasByMonth: (year: number, month: number) => Promise<any[]>;
  createCita: (data: any) => Promise<any>;
  updateCita: (data: any) => Promise<any>;
  deleteCita: (id: number) => Promise<any>;
  getMascotasForCitas: () => Promise<any[]>;
  checkCitaConflict: (fecha: string, hora: string, excludeId?: number) => Promise<any>;

  getDashboardSummary: (params?: any) => Promise<any>;

  getUsuarios: (params?: any) => Promise<PaginatedResponse<User>>;
  getUsuario: (id: number) => Promise<User>;
  changePassword: (data: { id: number; currentPassword: string; newPassword: string }) => Promise<any>;
  createUsuario: (data: any) => Promise<any>;
  updateUsuario: (data: any) => Promise<any>;
  deleteUsuario: (id: number) => Promise<any>;
  restoreUsuario: (id: number) => Promise<any>;

  getInventario: (params?: any) => Promise<PaginatedResponse<any>>;
  getInventarioItem: (id: number) => Promise<any>;
  createInventarioItem: (data: any) => Promise<any>;
  updateInventarioItem: (data: any) => Promise<any>;
  deleteInventarioItem: (id: number) => Promise<any>;
  restoreInventarioItem: (id: number) => Promise<any>;
  getInventarioMovimientos: (productoId: number) => Promise<any[]>;
  registrarMovimientoInventario: (data: any) => Promise<any>;
  getInventarioStock: (productoId: number) => Promise<number>;

  checkReminders: () => Promise<any>;
  getAuditLog: (params?: any) => Promise<PaginatedResponse<any>>;
  globalSearch: (query: string) => Promise<any>;

  exportBackup: (filePath: string) => Promise<void>;
  importBackup: (filePath: string) => Promise<void>;
  selectFile: (extensions: string[]) => Promise<string | null>;
  saveFile: (defaultName: string) => Promise<string | null>;

  selectPhoto: () => Promise<string | null>;
  getPhotoDataUrl: (filePath: string) => Promise<string>;
  notifyDesktop: (title: string, body: string) => Promise<void>;
}

interface Window {
  api: WindowApi;
}
