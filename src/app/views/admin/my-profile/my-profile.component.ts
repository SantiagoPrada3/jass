import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileApiService } from '../../../core/auth/services/profile-api.service';
import { UserWithLocationResponse } from '../../../modules/organization-management/models/organization.model';
import { Breadcrumb, BreadcrumbItem } from '../../../shared/components/ui/breadcrumb/breadcrumb';

import { NotificationService } from '../../../shared/services/notification.service';

interface ActivityItem {
    id: string;
    icon: string;
    title: string;
    description: string;
    timestamp: Date;
    type: 'login' | 'update' | 'password' | 'other';
}

interface UserNote {
    id: string;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

@Component({
    selector: 'app-my-profile',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, Breadcrumb],
    templateUrl: './my-profile.component.html',
    styleUrl: './my-profile.component.css'
})
export class MyProfileComponent implements OnInit {
    private readonly profileService = inject(ProfileApiService);
    private readonly fb = inject(FormBuilder);
    private readonly notificationService = inject(NotificationService);

    user: UserWithLocationResponse | null = null;
    loading = true;
    saving = false;
    isEditing = false;
    profileForm: FormGroup;

    breadcrumbItems: BreadcrumbItem[] = [
        { label: 'Inicio', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { label: 'Mi Perfil' }
    ];

    changePasswordForm: FormGroup;
    showPasswordModal = false;
    showCurrentPassword = false;
    showNewPassword = false;
    showConfirmPassword = false;

    recentActivities: ActivityItem[] = [];
    userNotes: UserNote[] = [];
    noteForm: FormGroup;
    showNoteModal = false;
    editingNoteId: string | null = null;

    constructor() {
        this.profileForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            phone: ['', [Validators.required, Validators.pattern(/^\d{9,15}$/)]],
            address: ['', [Validators.required]]
        });

        this.changePasswordForm = this.fb.group({
            currentPassword: ['', Validators.required],
            newPassword: ['', [Validators.required, Validators.minLength(8)]],
            confirmPassword: ['', Validators.required]
        }, { validators: this.passwordMatchValidator });

        this.noteForm = this.fb.group({
            title: ['', [Validators.required, Validators.maxLength(100)]],
            content: ['', [Validators.required, Validators.maxLength(500)]]
        });
    }

    passwordMatchValidator(g: FormGroup) {
        return g.get('newPassword')?.value === g.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    ngOnInit(): void {
        this.loadProfile();
        this.loadRecentActivity();
        this.loadNotes();
    }

    loadProfile(): void {
        this.loading = true;
        this.profileService.getMyProfile().subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.user = response.data;
                    this.profileForm.patchValue({
                        email: this.user.email,
                        phone: this.user.phone,
                        address: this.user.address
                    });
                }
                this.loading = false;
            },
            error: (err) => {
                console.error('Error loading profile', err);
                this.notificationService.error('Error', 'No se pudo cargar la información del perfil');
                this.loading = false;
            }
        });
    }

    toggleEdit(): void {
        this.isEditing = !this.isEditing;
        if (!this.isEditing && this.user) {
            // Reset form if cancelling
            this.profileForm.patchValue({
                email: this.user.email,
                phone: this.user.phone,
                address: this.user.address
            });
        }
    }

    saveProfile(): void {
        if (this.profileForm.invalid) return;

        this.saving = true;
        const updateData = this.profileForm.value;

        this.profileService.updateMyProfile(updateData).subscribe({
            next: (response) => {
                if (response.success && response.data) {
                    this.user = response.data;
                    this.isEditing = false;
                    this.notificationService.success('Éxito', 'Perfil actualizado correctamente');
                    this.addActivity('update', 'Perfil actualizado', 'Has actualizado tu información personal');
                } else {
                    this.notificationService.error('Error', response.message || 'No se pudo actualizar el perfil');
                }
                this.saving = false;
            },
            error: (err) => {
                console.error('Error updating profile', err);
                this.notificationService.error('Error', 'Ocurrió un error al actualizar el perfil');
                this.saving = false;
            }
        });
    }

    openPasswordModal() {
        this.showPasswordModal = true;
        this.changePasswordForm.reset();
        this.showCurrentPassword = false;
        this.showNewPassword = false;
        this.showConfirmPassword = false;
    }

    closePasswordModal() {
        this.showPasswordModal = false;
    }

    changePassword() {
        if (this.changePasswordForm.invalid) return;

        this.saving = true;
        const passwordData = this.changePasswordForm.value;

        this.profileService.changePassword(passwordData).subscribe({
            next: (response) => {
                if (response.success) {
                    this.notificationService.success('Éxito', 'Contraseña actualizada correctamente');
                    this.closePasswordModal();
                    this.addActivity('password', 'Contraseña actualizada', 'Has cambiado tu contraseña exitosamente');
                } else {
                    this.notificationService.error('Error', response.message || 'No se pudo actualizar la contraseña');
                }
                this.saving = false;
            },
            error: (err) => {
                console.error('Error changing password', err);
                const errorMessage = err.error?.message || 'Ocurrió un error al cambiar la contraseña';
                this.notificationService.error('Error', errorMessage);
                this.saving = false;
            }
        });
    }

    loadRecentActivity(): void {
        const storedActivities = localStorage.getItem('userActivities');
        if (storedActivities) {
            this.recentActivities = JSON.parse(storedActivities).map((activity: ActivityItem) => ({
                ...activity,
                timestamp: new Date(activity.timestamp)
            }));
        } else {
            this.recentActivities = [
                {
                    id: '1',
                    icon: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
                    title: 'Inicio de sesión',
                    description: 'Último acceso al sistema',
                    timestamp: new Date(),
                    type: 'login'
                }
            ];
        }
    }

    addActivity(type: ActivityItem['type'], title: string, description: string): void {
        const newActivity: ActivityItem = {
            id: Date.now().toString(),
            icon: this.getActivityIcon(type),
            title,
            description,
            timestamp: new Date(),
            type
        };

        this.recentActivities.unshift(newActivity);
        if (this.recentActivities.length > 5) {
            this.recentActivities = this.recentActivities.slice(0, 5);
        }

        localStorage.setItem('userActivities', JSON.stringify(this.recentActivities));
    }

    getActivityIcon(type: ActivityItem['type']): string {
        const icons = {
            login: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1',
            update: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
            password: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
            other: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        };
        return icons[type];
    }

    getRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace un momento';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        return date.toLocaleDateString();
    }

    loadNotes(): void {
        const storedNotes = localStorage.getItem('userNotes');
        if (storedNotes) {
            this.userNotes = JSON.parse(storedNotes).map((note: UserNote) => ({
                ...note,
                createdAt: new Date(note.createdAt),
                updatedAt: new Date(note.updatedAt)
            }));
        }
    }

    openNoteModal(note?: UserNote): void {
        this.showNoteModal = true;
        if (note) {
            this.editingNoteId = note.id;
            this.noteForm.patchValue({
                title: note.title,
                content: note.content
            });
        } else {
            this.editingNoteId = null;
            this.noteForm.reset();
        }
    }

    closeNoteModal(): void {
        this.showNoteModal = false;
        this.editingNoteId = null;
        this.noteForm.reset();
    }

    saveNote(): void {
        if (this.noteForm.invalid) return;

        const noteData = this.noteForm.value;
        const now = new Date();

        if (this.editingNoteId) {
            const index = this.userNotes.findIndex(n => n.id === this.editingNoteId);
            if (index !== -1) {
                this.userNotes[index] = {
                    ...this.userNotes[index],
                    title: noteData.title,
                    content: noteData.content,
                    updatedAt: now
                };
                this.notificationService.success('Éxito', 'Nota actualizada correctamente');
                this.addActivity('update', 'Nota actualizada', `Has actualizado la nota "${noteData.title}"`);
            }
        } else {
            const newNote: UserNote = {
                id: Date.now().toString(),
                title: noteData.title,
                content: noteData.content,
                createdAt: now,
                updatedAt: now
            };
            this.userNotes.unshift(newNote);
            this.notificationService.success('Éxito', 'Nota creada correctamente');
            this.addActivity('other', 'Nueva nota', `Has creado la nota "${noteData.title}"`);
        }

        localStorage.setItem('userNotes', JSON.stringify(this.userNotes));
        this.closeNoteModal();
    }

    deleteNote(noteId: string): void {
        const note = this.userNotes.find(n => n.id === noteId);
        if (note && confirm(`¿Estás seguro de eliminar la nota "${note.title}"?`)) {
            this.userNotes = this.userNotes.filter(n => n.id !== noteId);
            localStorage.setItem('userNotes', JSON.stringify(this.userNotes));
            this.notificationService.success('Éxito', 'Nota eliminada correctamente');
            this.addActivity('other', 'Nota eliminada', `Has eliminado la nota "${note.title}"`);
        }
    }
}
