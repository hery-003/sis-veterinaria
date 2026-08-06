class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.status = 400;
  }
}

function isValidEmail(email) {
  if (!email) return true;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  if (!phone) return true;
  const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
  return phoneRegex.test(phone);
}

function isValidCI(ci) {
  if (!ci) return true;
  const ciRegex = /^[\d\-\.]+$/;
  return ciRegex.test(ci) && ci.replace(/\D/g, '').length >= 5;
}

function isPositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
}

function isPositiveInt(value) {
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return false;
  const num = parseInt(str, 10);
  return !isNaN(num) && num >= 0;
}

function isValidTime(hora) {
  if (hora === undefined || hora === null || hora === '') return true;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(hora));
}

function isValidDate(dateStr) {
  if (!dateStr) return true;
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isValidEnum(value, allowedValues) {
  return !value || allowedValues.includes(value);
}

function validatePropietario(data) {
  const errors = [];
  if (!data.nombre || !data.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
  } else if (data.nombre.trim().length < 2) {
    errors.push({ field: 'nombre', message: 'El nombre debe tener al menos 2 caracteres' });
  }
  if (data.ci && !isValidCI(data.ci)) {
    errors.push({ field: 'ci', message: 'Formato de cédula inválido' });
  }
  if (data.telefono && !isValidPhone(data.telefono)) {
    errors.push({ field: 'telefono', message: 'Formato de teléfono inválido' });
  }
  if (data.email && !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Formato de email inválido' });
  }
  return errors;
}

function validateMascota(data) {
  const errors = [];
  if (!data.nombre || !data.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
  }
  if (!data.especie || !data.especie.trim()) {
    errors.push({ field: 'especie', message: 'La especie es obligatoria' });
  }
  if (data.edad !== undefined && data.edad !== null && data.edad !== '' && !isPositiveInt(data.edad)) {
    errors.push({ field: 'edad', message: 'La edad debe ser un número positivo' });
  }
  if (data.peso !== undefined && data.peso !== null && data.peso !== '' && (!isPositiveNumber(data.peso) || parseFloat(data.peso) > 500)) {
    errors.push({ field: 'peso', message: 'El peso debe ser un número entre 0 y 500 kg' });
  }
  if (data.propietario_id && !isPositiveInt(data.propietario_id)) {
    errors.push({ field: 'propietario_id', message: 'ID de propietario inválido' });
  }
  return errors;
}

function validateInventario(data) {
  const errors = [];
  if (!data.nombre || !data.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
  }
  const tiposPermitidos = ['medicamento', 'vacuna', 'insumo', 'otro'];
  if (data.tipo && !isValidEnum(data.tipo, tiposPermitidos)) {
    errors.push({ field: 'tipo', message: `Tipo debe ser uno de: ${tiposPermitidos.join(', ')}` });
  }
  if (data.cantidad !== undefined && data.cantidad !== null && data.cantidad !== '' && !isPositiveInt(data.cantidad)) {
    errors.push({ field: 'cantidad', message: 'La cantidad debe ser un número entero positivo' });
  }
  if (data.precio !== undefined && data.precio !== null && data.precio !== '' && !isPositiveNumber(data.precio)) {
    errors.push({ field: 'precio', message: 'El precio debe ser un número positivo' });
  }
  if (data.fecha_vencimiento && !isValidDate(data.fecha_vencimiento)) {
    errors.push({ field: 'fecha_vencimiento', message: 'Fecha de vencimiento inválida' });
  }
  return errors;
}

function validateUsuario(data) {
  const errors = [];
  if (!data.username || !data.username.trim()) {
    errors.push({ field: 'username', message: 'El username es obligatorio' });
  } else if (data.username.trim().length < 3) {
    errors.push({ field: 'username', message: 'El username debe tener al menos 3 caracteres' });
  }
  if (!data.nombre || !data.nombre.trim()) {
    errors.push({ field: 'nombre', message: 'El nombre es obligatorio' });
  }
  if (data.password !== undefined && data.password !== null) {
    if (data.password.length < 6) {
      errors.push({ field: 'password', message: 'La contraseña debe tener al menos 6 caracteres' });
    }
  }
  const rolesPermitidos = ['admin', 'veterinario', 'recepcionista'];
  if (data.rol && !isValidEnum(data.rol, rolesPermitidos)) {
    errors.push({ field: 'rol', message: `Rol debe ser uno de: ${rolesPermitidos.join(', ')}` });
  }
  return errors;
}

function validateCita(data) {
  const errors = [];
  if (!data.mascota_id || !isPositiveInt(data.mascota_id)) {
    errors.push({ field: 'mascota_id', message: 'Debe seleccionar una mascota' });
  }
  if (!data.fecha || !isValidDate(data.fecha)) {
    errors.push({ field: 'fecha', message: 'La fecha es obligatoria y debe ser válida' });
  }
  if (data.estado) {
    const estadosPermitidos = ['pendiente', 'realizada', 'cancelada'];
    if (!isValidEnum(data.estado, estadosPermitidos)) {
      errors.push({ field: 'estado', message: `Estado debe ser uno de: ${estadosPermitidos.join(', ')}` });
    }
  }
  if (!isValidTime(data.hora)) {
    errors.push({ field: 'hora', message: 'La hora debe tener formato HH:MM (ej. 14:30)' });
  }
  return errors;
}

function validateHistorial(data) {
  const errors = [];
  if (!data.mascota_id || !isPositiveInt(data.mascota_id)) {
    errors.push({ field: 'mascota_id', message: 'Debe seleccionar una mascota' });
  }
  if (!data.fecha || !isValidDate(data.fecha)) {
    errors.push({ field: 'fecha', message: 'La fecha es obligatoria' });
  }
  const tiposPermitidos = ['consulta', 'vacuna', 'cirugia', 'receta'];
  if (!data.tipo || !isValidEnum(data.tipo, tiposPermitidos)) {
    errors.push({ field: 'tipo', message: `Tipo debe ser uno de: ${tiposPermitidos.join(', ')}` });
  }
  if (data.proxima_dosis && !isValidDate(data.proxima_dosis)) {
    errors.push({ field: 'proxima_dosis', message: 'Fecha de próxima dosis inválida' });
  }
  if (data.peso !== undefined && data.peso !== null && data.peso !== '' && (!isPositiveNumber(data.peso) || parseFloat(data.peso) > 500)) {
    errors.push({ field: 'peso', message: 'El peso debe ser un número entre 0 y 500 kg' });
  }
  if (data.temperatura !== undefined && data.temperatura !== null && data.temperatura !== '' &&
      (!isPositiveNumber(data.temperatura) || parseFloat(data.temperatura) < 25 || parseFloat(data.temperatura) > 45)) {
    errors.push({ field: 'temperatura', message: 'La temperatura debe estar entre 25 y 45 °C' });
  }
  if (data.frecuencia_cardiaca !== undefined && data.frecuencia_cardiaca !== null && data.frecuencia_cardiaca !== '' &&
      (!isPositiveInt(data.frecuencia_cardiaca) || parseInt(data.frecuencia_cardiaca, 10) < 20 || parseInt(data.frecuencia_cardiaca, 10) > 300)) {
    errors.push({ field: 'frecuencia_cardiaca', message: 'La frecuencia cardíaca debe estar entre 20 y 300 lpm' });
  }
  if (data.frecuencia_respiratoria !== undefined && data.frecuencia_respiratoria !== null && data.frecuencia_respiratoria !== '' &&
      (!isPositiveInt(data.frecuencia_respiratoria) || parseInt(data.frecuencia_respiratoria, 10) < 5 || parseInt(data.frecuencia_respiratoria, 10) > 200)) {
    errors.push({ field: 'frecuencia_respiratoria', message: 'La frecuencia respiratoria debe estar entre 5 y 200 rpm' });
  }
  return errors;
}

function validateMovimiento(data) {
  const errors = [];
  if (!data.producto_id || !isPositiveInt(data.producto_id)) {
    errors.push({ field: 'producto_id', message: 'Producto inválido' });
  }
  if (!isValidEnum(data.tipo, ['entrada', 'salida'])) {
    errors.push({ field: 'tipo', message: 'Tipo debe ser entrada o salida' });
  }
  if (!isPositiveInt(data.cantidad) || parseInt(data.cantidad, 10) === 0) {
    errors.push({ field: 'cantidad', message: 'La cantidad debe ser un número entero mayor que cero' });
  }
  return errors;
}

function throwIfErrors(errors) {
  if (errors.length > 0) {
    const e = new Error(errors[0].message);
    e.name = 'ValidationError';
    e.field = errors[0].field;
    e.errors = errors;
    e.status = 400;
    throw e;
  }
}

function sanitizeString(str, maxLength = 255) {
  if (!str) return null;
  return String(str).trim().slice(0, maxLength);
}

function sanitizeEmail(email) {
  if (!email) return null;
  const cleaned = String(email).trim().toLowerCase().slice(0, 100);
  return cleaned || null;
}

const TEXT_FIELDS = new Set([
  'nombre', 'raza', 'direccion', 'motivo', 'descripcion', 'diagnostico',
  'tratamiento', 'notas', 'proveedor', 'lote',
]);

function capitalizeWords(str) {
  if (!str) return str;
  return String(str).replace(/\b\w/g, (c) => c.toUpperCase());
}

function autoFormat(value, field) {
  if (typeof value !== 'string' || !value) return value;
  if (field === 'email') return value.toLowerCase().trim();
  if (field === 'username') return value.trim();
  if (TEXT_FIELDS.has(field)) return capitalizeWords(value);
  return value;
}

module.exports = {
  ValidationError,
  isValidEmail,
  isValidPhone,
  isValidCI,
  isPositiveNumber,
  isPositiveInt,
  isValidDate,
  isValidTime,
  isValidEnum,
  validatePropietario,
  validateMascota,
  validateInventario,
  validateUsuario,
  validateCita,
  validateHistorial,
  validateMovimiento,
  throwIfErrors,
  sanitizeString,
  sanitizeEmail,
  autoFormat,
};
