import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../modules/organization-management/models/api-response-model';
import { UserWithLocationResponse } from '../../../modules/organization-management/models/organization.model';

@Injectable({
    providedIn: 'root'
})
export class ProfileApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = `${environment.services.gateway}/common/profile`;

    getMyProfile(): Observable<ApiResponse<UserWithLocationResponse>> {
        return this.http.get<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/me`);
    }

    updateMyProfile(data: Partial<UserWithLocationResponse>): Observable<ApiResponse<UserWithLocationResponse>> {
        return this.http.patch<ApiResponse<UserWithLocationResponse>>(`${this.baseUrl}/me`, data);
    }

    changePassword(data: any): Observable<ApiResponse<string>> {
        return this.http.put<ApiResponse<string>>(`${environment.services.gateway}/auth/change-password`, data);
    }
}
