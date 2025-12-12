import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WaterQualityRoutingModule } from './water-quality-routing-module';
import { GoogleMapsService } from './services/google-maps.service';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    WaterQualityRoutingModule
  ],
  providers: [
    GoogleMapsService
  ]
})
export class WaterQualityModule { }