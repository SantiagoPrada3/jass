export enum Status {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE'
}

export const StatusLabels = {
  [Status.ACTIVE]: 'Activo',
  [Status.INACTIVE]: 'Inactivo'
};

export enum ProgramStatus {
  ACTIVE = 'ACTIVE',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export const ProgramStatusLabels = {
  [ProgramStatus.ACTIVE]: 'Con Agua',
  [ProgramStatus.PLANNED]: 'Planificado',
  [ProgramStatus.IN_PROGRESS]: 'En Progreso',
  [ProgramStatus.COMPLETED]: 'Completado',
  [ProgramStatus.CANCELLED]: 'Sin Agua'
};

export enum DaysOfWeek {
  LUNES = 'LUNES',
  MARTES = 'MARTES',
  MIERCOLES = 'MIERCOLES',
  JUEVES = 'JUEVES',
  VIERNES = 'VIERNES',
  SABADO = 'SABADO',
  DOMINGO = 'DOMINGO'
}

export const DaysOfWeekLabels = {
  [DaysOfWeek.LUNES]: 'Lunes',
  [DaysOfWeek.MARTES]: 'Martes',
  [DaysOfWeek.MIERCOLES]: 'Miércoles',
  [DaysOfWeek.JUEVES]: 'Jueves',
  [DaysOfWeek.VIERNES]: 'Viernes',
  [DaysOfWeek.SABADO]: 'Sábado',
  [DaysOfWeek.DOMINGO]: 'Domingo'
};