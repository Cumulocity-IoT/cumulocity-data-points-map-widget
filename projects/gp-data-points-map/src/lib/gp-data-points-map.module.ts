/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { NgModule } from '@angular/core';
import {
  MatButtonModule,
  MatProgressBarModule,
  MatRadioModule,
  MatSliderModule,
  MatSlideToggleModule,
} from '@angular/material';
import { CoreModule, HOOK_COMPONENTS } from '@c8y/ngx-components';
import { GpDataPointsMapConfigComponent } from './config/gp-data-point-map-config-component';
import { GpDataPointsMapComponent } from './components/gp-data-points-map.component';
import { GpDataPointsMapService } from './services/gp-data-points-map.service';
import { MovingMarkerService } from './services/movingMarker.service';
import { AngularResizedEventModule } from 'angular-resize-event';
import * as preview from './preview-image';
import { GPDataPointMapPopupComponent } from './components/gp-data-points-map-popup.component';
import { AppIdService } from './services/app-id.service';
import { ColorPickerComponent } from './color-picker/color-picker-component';
import { ColorSliderComponent } from './color-picker/color-slider/color-slider-component';
import { ColorPaletteComponent } from './color-picker/color-palette/color-palette-component';

@NgModule({
  declarations: [
    GpDataPointsMapComponent,
    GpDataPointsMapConfigComponent,
    GPDataPointMapPopupComponent,
    ColorPickerComponent,
    ColorSliderComponent,
    ColorPaletteComponent,
  ],
  imports: [
    CoreModule,
    MatProgressBarModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatRadioModule,
    AngularResizedEventModule,
  ],
  exports: [
    GpDataPointsMapComponent,
    GpDataPointsMapConfigComponent,
    GPDataPointMapPopupComponent,
    ColorPickerComponent,
  ],
  entryComponents: [
    GpDataPointsMapComponent,
    GpDataPointsMapConfigComponent,
    GPDataPointMapPopupComponent,
    ColorPickerComponent,
    ColorSliderComponent,
    ColorPaletteComponent,
  ],
  providers: [
    GpDataPointsMapService,
    MovingMarkerService,
    AppIdService,
    {
      provide: HOOK_COMPONENTS,
      multi: true,
      useValue: {
        id: 'datapoints-map-widget',
        label: 'Data points Map',
        previewImage: preview.previewImage,
        description:
          'The Data points Map widget help you to display measurements and device locations on map.',
        component: GpDataPointsMapComponent,
        configComponent: GpDataPointsMapConfigComponent,
        data: {
          ng1: {
            options: {
              noDeviceTarget: false,
              noNewWidgets: false,
              deviceTargetNotRequired: false,
              groupsSelectable: true,
            },
          },
        },
      },
    },
  ],
})
export class GpDataPointsMapModule {
  constructor(private appIdService: AppIdService) {}
}
