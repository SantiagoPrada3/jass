export enum UserStatus {
     ACTIVE = 'ACTIVE',
     INACTIVE = 'INACTIVE',
     PENDING = 'PENDING',
     SUSPENDED = 'SUSPENDED'
}

export enum RolesUsers {
     SUPER_ADMIN = 'SUPER_ADMIN',
     ADMIN = 'ADMIN',
     CLIENT = 'CLIENT'
}

export interface Role {
     id: string;
     name: string;
     description: string;
     permissions: string[];
}

export const UserStatusLabels = {
     [UserStatus.ACTIVE]: 'Activo',
     [UserStatus.INACTIVE]: 'Inactivo',
     [UserStatus.PENDING]: 'Pendiente',
     [UserStatus.SUSPENDED]: 'Suspendido'
};

export const RoleLabels = {
     [RolesUsers.SUPER_ADMIN]: 'Super Administrador',
     [RolesUsers.ADMIN]: 'Administrador',
     [RolesUsers.CLIENT]: 'Cliente'
};
