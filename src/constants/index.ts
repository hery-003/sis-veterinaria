export const ESPECIES = ['Perro', 'Gato', 'Conejo', 'Ave', 'Hamster', 'Reptil', 'Otro'];

export const ESPECIE_CONFIG = {
  Perro: { icon: '🐕', color: '#2563eb' },
  Gato: { icon: '🐈', color: '#f59e0b' },
  Conejo: { icon: '🐇', color: '#ec4899' },
  Ave: { icon: '🐦', color: '#10b981' },
  Hamster: { icon: '🐹', color: '#f97316' },
  Reptil: { icon: '🦎', color: '#22c55e' },
  Otro: { icon: '🐾', color: '#6b7280' },
};

export const TIPOS_INVENTARIO = [
  { value: 'medicamento', label: 'Medicamento', color: 'primary' },
  { value: 'vacuna', label: 'Vacuna', color: 'success' },
  { value: 'insumo', label: 'Insumo', color: 'warning' },
  { value: 'otro', label: 'Otro', color: 'secondary' },
];

export const TIPOS_HISTORIAL = [
  { value: 'consulta', label: 'Consulta', color: 'primary' },
  { value: 'vacuna', label: 'Vacuna', color: 'success' },
  { value: 'cirugia', label: 'Cirugía', color: 'error' },
  { value: 'receta', label: 'Receta', color: 'warning' },
  { value: 'desparasitacion', label: 'Desparasitación', color: 'secondary' },
];

export const ESTADOS_CITA = [
  { value: 'pendiente', label: 'Pendiente', color: 'warning' },
  { value: 'realizada', label: 'Realizada', color: 'success' },
  { value: 'cancelada', label: 'Cancelada', color: 'error' },
];

export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'veterinario', label: 'Veterinario' },
  { value: 'recepcionista', label: 'Recepcionista' },
];

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export const PAGE_SIZES = [5, 10, 25, 50];

export const RAZAS_POR_ESPECIE: Record<string, string[]> = {
  Perro: ['Labrador', 'Golden Retriever', 'Pastor Alemán', 'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'Chihuahua', 'Boxer', 'Husky', 'Mestizo'],
  Gato: ['Persa', 'Siamés', 'Maine Coon', 'Ragdoll', 'Bengalí', 'Británico', 'Sphynx', 'Mestizo'],
  Conejo: ['Holland Lop', 'Mini Rex', 'Angora', 'Flemish Giant', 'Californiano'],
  Ave: ['Canario', 'Periquito', 'Loro', 'Cockatiel', 'Agapornis'],
  Hamster: ['Sirio', 'Roborovski', 'Campbell', 'Winter White'],
  Reptil: ['Iguana', 'Gecko', 'Tortuga', 'Serpiente', 'Camaleón'],
  Otro: [],
};
