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
import {
  AfterViewInit,
  Component,
  DoCheck,
  Input,
  isDevMode,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { skip } from 'rxjs/operators';
import { AppIdService } from '../services/app-id.service';
import { GpDataPointsMapService } from './../services/gp-data-points-map.service';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'gp-data-points-map-config',
  templateUrl: './gp-data-point-map-config-component.html',
  styleUrls: ['./gp-data-point-map-config-component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class GpDataPointsMapConfigComponent implements OnInit, DoCheck {
  @Input() config: any = {};
  isOpenCP = false;
  isOpenFontCP = false;
  configDevice = null;
  defaultOutdoorZoom = 14;
  observableDevice$ = null;
  measurementList = [];
  observableMeasurements$ = new BehaviorSubject<any>(this.measurementList);
  private measurementSubs = null;
  appId = null;
  isBusy = false;
  constructor(
    private commonService: GpDataPointsMapService,
    private appIdService: AppIdService
  ) {}

  ngOnInit(): void {
    if (this.config.device && this.config.device.id) {
      this.configDevice = this.config.device.id;
    }
    if (!this.config.outdoorZoom) {
      this.config.isOutdoorAutoZoom = true;
      this.config.outdoorZoom = this.defaultOutdoorZoom;
    }

    if (!this.config.measurementType) {
      this.config.measurementType = {};
    } else {
      if (this.config.measurementTypeList.length > 0) {
        let measurementType;
        for (measurementType of this.config.measurementTypeList) {
          if (this.config.measurementType.name === measurementType.name) {
            this.config.measurementType = measurementType;
          }
        }
      }
    }
    this.appId = this.appIdService.getCurrentAppId();
    // Get the measurements as soon as device or group is selected
    this.measurementSubs = this.observableMeasurements$
      .pipe(skip(1))
      .subscribe((mes) => {
        this.config.measurementTypeList = [];
        if (mes && mes.length > 0) {
          this.config.measurementTypeList = [...mes];
        }
        this.isBusy = false;
      });
  }

  /**
   * Check and reload measuerements if device is changed
   */
  ngDoCheck(): void {
    if (this.config.device && this.config.device.id !== this.configDevice) {
      this.configDevice = this.config.device.id;
      this.isBusy = true;
      this.measurementList = [];
      this.commonService.getFragmentSeries(
        this.config.device,
        this.measurementList,
        this.observableMeasurements$
      );
    }
  }

  // Set outdoor zoom to default
  outdoorAutoChanges(event) {
    this.config.outdoorZoom = this.defaultOutdoorZoom;
  }

  openColorPicker() {
    if (!this.isOpenCP) {
      this.isOpenCP = true;
    }
  }

  closeColorPicker() {
    if (this.isOpenCP) {
      this.isOpenCP = false;
    }
  }
  setSelectedColor(value) {
    if (this.config.markerColor) {
      this.config.markerColor = this.config.markerColor + ';' + value;
    } else {
      this.config.markerColor = value;
    }
  }

  openFontColorPicker() {
    if (!this.isOpenFontCP) {
      this.isOpenFontCP = true;
    }
  }

  closeFontColorPicker() {
    if (this.isOpenFontCP) {
      this.isOpenFontCP = false;
    }
  }
  setSelectedFontColor(value) {
    if (this.config.markerFontColor) {
      this.config.markerFontColor = this.config.markerFontColor + ';' + value;
    } else {
      this.config.markerFontColor = value;
    }
  }
}
