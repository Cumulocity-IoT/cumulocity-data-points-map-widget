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
  ApplicationRef,
  Component,
  ComponentFactoryResolver,
  ComponentRef,
  ElementRef,
  Injector,
  Input,
  isDevMode,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ResizedEvent } from 'angular-resize-event';
import {
  InventoryService,
  RealtimeAction,
  IManagedObject,
  MeasurementService,
  Realtime,
} from '@c8y/client';
import * as moment_ from 'moment';
declare global {
  interface Window {
    L: any;
    h337: any;
  }
}

import 'leaflet2/dist/leaflet.js';
const L: any = window.L;
const moment = moment_;
import 'leaflet-extra-markers/dist/js/leaflet.extra-markers.js';
import 'leaflet.markercluster/dist/leaflet.markercluster';

import { GpDataPointsMapService } from './../services/gp-data-points-map.service';
import { C8Y_DEVICE_GROUP, C8Y_DEVICE_SUBGROUP } from '../tokens';
import { MovingMarkerService } from './../services/movingMarker.service';
import { skip } from 'rxjs/operators';
import { AppIdService } from '../services/app-id.service';
import { GPDataPointMapPopupComponent } from './gp-data-points-map-popup.component';

@Component({
  // tslint:disable-next-line: component-selector
  selector: 'gp-data-points-map',
  templateUrl: './gp-data-points-map.component.html',
  styleUrls: ['./gp-data-points-map.component.css'],
})
export class GpDataPointsMapComponent implements OnInit, AfterViewInit {
  @Input() set config(newConfig: any) {
    this.inputConfig = newConfig;
    if (this.map) {
      this.initializeMap(false);
    }
  }
  get config(): any {
    return this.inputConfig;
  }
  @ViewChild('dpmapRef', { static: true }) protected mapDivRef: ElementRef;
  @ViewChild('dpInfoRef', { static: true })
  protected mapInfosDivRef: ElementRef;
  protected mapDiv: HTMLDivElement;
  protected mapInfosDiv: HTMLDivElement;
  protected map: any;
  protected initialMinZoom = 3;
  protected allDeviceList = [];
  protected allSubscriptions: any = [];
  protected allMarkers: any = {};
  protected featureGroup = [];
  protected layerControl = L.control.layers([], [], {});
  initialMaxZoom = 14;
  isBusy = false;
  realtime = true;
  deviceId = '';
  isClusterMap = false;
  measurementType: any;
  markerColor = '';
  markerFontColor = '';
  inputConfig: any;
  width: number;
  height: number;
  mapLoaded = false;
  defaultBounds = null;
  popupDetailCompRef: ComponentRef<GPDataPointMapPopupComponent> = null;
  dashboardField = null;
  tabGroupField = null;
  appId = null;
  LAYER_OSM = {
    id: 'openstreetmap',
    name: 'Open Street Map',
    enabled: true,
    layer: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 19, // max zoom where base layer tiles will be retrieved... this avoids errors when zooming more
      maxZoom: 28, // but, it can be zoomed closer :)
      attribution: 'Open Street Map',
    }),
  };

  constructor(
    private dpService: GpDataPointsMapService,
    private inventoryService: InventoryService,
    private movingMarkerService: MovingMarkerService,
    private realTimeService: Realtime,
    private appRef: ApplicationRef,
    private injector: Injector,
    private resolver: ComponentFactoryResolver,
    private appIdService: AppIdService
  ) {}

  ngOnInit() {
    this.appId = this.appIdService.getCurrentAppId();
    this.initializeMap(true);
  }

  public ngAfterViewInit(): void {
    this.initMapHandlers();
  }

  refresh() {
    this.initializeMap(false);
  }

  toggleRealTime() {
    this.realtime = !this.realtime;
    if (this.realtime) {
      this.initializeMap(false);
    } else {
      this.clearSubscriptions();
    }
  }

  /**
   * Intialzie map and load confiuration parameter. if it is not first call then clear all subscriptions
   */
  protected initializeMap(isFirstCall): void {
    this.mapDiv = this.mapDivRef.nativeElement;
    this.mapInfosDiv = this.mapInfosDivRef.nativeElement;

    this.deviceId = '126'; // '23227199' ;// '23121787';
    this.measurementType = {
      name: 'T', // 'PM25',
      type: 'temperature_measurement',
    };
    this.markerColor = '#797bfc';
    this.markerFontColor = '#fff';

    if (this.inputConfig) {
      if (this.inputConfig.device) {
        this.deviceId = this.inputConfig.device.id;
      }
      this.measurementType = this.inputConfig.measurementType;
      this.markerColor = this.inputConfig.markerColor;
      this.markerFontColor = this.inputConfig.markerFontColor;
      this.dashboardField = this.inputConfig.dashboardField;
      this.tabGroupField = this.inputConfig.tabGroupField;
      this.isClusterMap = this.inputConfig.isClusterMap;
      if (
        this.inputConfig.outdoorZoom !== null &&
        this.inputConfig.outdoorZoom !== undefined
      ) {
        this.initialMaxZoom = this.inputConfig.outdoorZoom;
      }
    }

    if (!isFirstCall) {
      this.clearMapAndSubscriptions();
    }
    if (this.mapLoaded) {
      return;
    }
    this.mapLoaded = true;
    this.updateMapSize(null, null);
    this.renderMap();
    this.renderAllDevicesForGroup(this.deviceId);
  }

  /**
   * Initialize Leaflet Map handlers
   */
  protected initMapHandlers(): void {
    this.map.invalidateSize();
    this.movingMarkerService.initializeMovingMarker(L);
  }

  protected updateMapSize(w: number, h: number): void {
    if (w > 0 && h > 0) {
      this.width = w - 20;
      this.height = h - this.mapInfosDiv.offsetHeight - 10; // 10px from styling :/
    } else {
      this.width = this.mapDiv.parentElement.offsetWidth - 20;
      this.height =
        this.mapDiv.parentElement.offsetHeight -
        this.mapInfosDiv.offsetHeight -
        10; // 10px from styling :/
    }
  }

  /**
   * Clear map, all variables and subscriptions
   */
  private clearMapAndSubscriptions() {
    this.map.remove();
    this.allMarkers = {};
    this.layerControl = L.control.layers([], [], {
      hideSingleBase: false,
      sortLayers: true,
      sortFunction(a, b) {
        return a.options.name - b.options.name;
      },
    });

    this.featureGroup = [];
    this.allDeviceList = [];
    this.mapLoaded = false;
    this.clearSubscriptions();
  }

  /**
   * Clear all Realtime subscriptions
   */
  private clearSubscriptions() {
    if (this.allSubscriptions) {
      this.allSubscriptions.forEach((s) => {
        if (s.type === 'Measurements') {
          this.realTimeService.unsubscribe(s.subs);
        } else {
          s.subs.unsubscribe();
        }
      });
    }
  }

  /**
   * Render the map (establish center and base layer)
   */
  protected renderMap(): void {
    // Create Leaflet Map in fixed DIV - zoom level is hardcoded for simplicity and will be overriden with fitBounds
    const initBounds = new L.LatLngBounds([0, 0], [0, 0]);
    this.map = L.map(this.mapDiv, {
      zoomControl: true,
      zoomAnimation: false,
      trackResize: true,
      boxZoom: true,
    }).setView(
      [initBounds.getCenter().lat, initBounds.getCenter().lng],
      this.initialMinZoom
    );
    this.map.addLayer(this.LAYER_OSM.layer);
  }

  onResized(event: ResizedEvent) {
    this.updateMapSize(event.newWidth, event.newHeight);
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  /**
   * Render all devices for given group id
   */
  protected renderAllDevicesForGroup(deviceId): void {
    let deviceList: any = null;
    const t0 = performance.now();
    if (deviceId) {
      this.dpService
        .getTargetObject(deviceId) // this.config.device.id
        .then((mo) => {
          if (
            mo &&
            mo.type &&
            (mo.type.localeCompare(C8Y_DEVICE_GROUP) === 0 ||
              mo.type.localeCompare(C8Y_DEVICE_SUBGROUP) === 0)
          ) {
            // GET child devices
            this.dpService
              .getChildDevices(deviceId, 1, deviceList) // this.config.device.id
              .then((deviceFound) => {
                deviceList = deviceFound.data;
                this.allDeviceList.push.apply(this.allDeviceList, deviceList);
                this.addDevicesToMap(this.allDeviceList);
              })
              .catch((err) => {
                if (isDevMode()) {
                  console.log(
                    '+-+- ERROR FOUND WHILE GETTING CHILD DEVICES... ',
                    err
                  );
                }
              });
          } else {
            this.allDeviceList.push(mo);
            this.addDevicesToMap(this.allDeviceList);
          }
        })
        .catch((err) => {
          if (isDevMode()) {
            console.log(
              '+-+- ERROR while getting context object details for dashboard ',
              err
            );
          }
        });
    } else {
      if (this.allDeviceList.length > 0) {
        this.addDevicesToMap(this.allDeviceList);
      } else {
        this.addLayerToMap(null);
      }
    }
  }

  /**
   * render single device on map based on its position
   */
  private addSingleDeviceToMap(device: any): void {
    const realtimeOps = {
      realtime: true,
      realtimeAction: RealtimeAction.UPDATE,
    };
    if (
      device &&
      device.c8y_Position &&
      device.c8y_Position.lat &&
      device.c8y_Position.lng
    ) {
      // REALTIME ------------------------------------------------------------------------
      // tslint:disable-next-line: deprecation
      const imoDetail = this.inventoryService.detail$(device.id, realtimeOps);
      const detailSubs = imoDetail.subscribe(
        (data) => {
          if (true) {
            data = data[0];
          }
          // check if this marker has already been created... and has an altitude as well to indicate its floor
          // if no position is given, no update is done
          if (data && data.c8y_Position) {
            if (this.allMarkers[data.id]) {
              this.updateMarkerPosition(data);
            } else {
              let mapBounds = null;
              if (!data.c8y_Position.alt) {
                data.c8y_Position.alt = 0;
              }
              const aMarker = this.createMarker(data);
              this.allMarkers[data.id] = aMarker;
              if (!mapBounds) {
                mapBounds = new L.LatLngBounds(
                  aMarker.getLatLng(),
                  aMarker.getLatLng()
                );
              } else {
                mapBounds.extend(aMarker.getLatLng());
              }
              let fgOnLvl = this.featureGroup.find(
                (i) => i.name === data.c8y_Position.alt
              );
              const markers = L.markerClusterGroup();
              if (!fgOnLvl) {
                if (this.isClusterMap) {
                  markers.addLayer(aMarker);
                  fgOnLvl = {
                    name: Number(data.c8y_Position.alt),
                    layer: L.featureGroup([markers]),
                  };
                  L.setOptions(fgOnLvl.layer, { name: data.c8y_Position.alt });
                } else {
                  fgOnLvl = {
                    name: Number(data.c8y_Position.alt),
                    layer: L.featureGroup([aMarker]),
                  };
                  L.setOptions(fgOnLvl.layer, { name: data.c8y_Position.alt });
                }
                this.featureGroup.push(fgOnLvl);
              } else {
                if (this.isClusterMap) {
                  markers.addLayer(aMarker);
                  fgOnLvl.layer.addLayer(markers);
                } else {
                  fgOnLvl.layer.addLayer(aMarker);
                }
              }
              this.addLayerToMap(mapBounds);
            }
          }
        },
        (err) => {
          if (isDevMode()) {
            console.log('+-+- got an error with the device observable ', err);
          }
        }
      );
      if (this.realtime) {
        this.allSubscriptions.push({
          id: device.id,
          subs: detailSubs,
          type: 'device',
        });
      } else {
        detailSubs.unsubscribe();
      }
    }
  }

  /**
   * Render multpile devices on map
   */
  private async addDevicesToMap(deviceList: any[]): Promise<void> {
    // if there is a single device in the group, treat it as a single device
    if (deviceList && deviceList.length === 1) {
      this.addSingleDeviceToMap(deviceList[0]);
    } else {
      const realtimeOps = {
        realtime: true,
        realtimeAction: RealtimeAction.UPDATE,
      };
      const categoryFeatureGroups = [];
      let mapBounds = this.defaultBounds;
      const markers = L.markerClusterGroup();
      deviceList.forEach((imo) => {
        if (imo.c8y_Position && !imo.c8y_Position.alt) {
          imo.c8y_Position.alt = 0;
        }
        if (!imo.type) {
          imo.type = 'default';
        }
        if (imo.c8y_Position && imo.c8y_Position.lat && imo.c8y_Position.lng) {
          if (this.allMarkers[imo.id]) {
            this.updateMarkerPosition(imo);
          } else {
            // create a marker per device found...
            try {
              const aMarker = this.createMarker(imo);
              this.allMarkers[imo.id] = aMarker;
              if (!mapBounds) {
                mapBounds = new L.LatLngBounds(
                  aMarker.getLatLng(),
                  aMarker.getLatLng()
                );
              } else {
                mapBounds.extend(aMarker.getLatLng());
              }
              if (this.isClusterMap) {
                markers.addLayer(aMarker);
                categoryFeatureGroups.push(markers);
              } else {
                categoryFeatureGroups.push(aMarker);
              }
              // tslint:disable-next-line: deprecation
              const imoDetail = this.inventoryService.detail$(
                imo.id,
                realtimeOps
              );
              const detailSubs = imoDetail.pipe(skip(1)).subscribe((mobj) => {
                mobj = mobj[0];
                this.updateMarkerPosition(mobj);
              });
              if (this.realtime) {
                this.allSubscriptions.push({
                  id: imo.id,
                  subs: detailSubs,
                  type: 'device',
                });
              } else {
                detailSubs.unsubscribe();
              }
              // }
            } catch (error) {
              if (isDevMode()) {
                console.log(
                  '+-+-+- error while creating and adding marker to map\n ',
                  [error, imo]
                );
              }
            }
          }
        } else {
          if (isDevMode()) {
            console.log('+-+- device without location\n', imo);
          }
        }
      });
      if (categoryFeatureGroups.length > 0) {
        let fgOnLvl = this.featureGroup.find((i) => i.name === 0);
        if (!fgOnLvl) {
          fgOnLvl = { name: 0, layer: L.featureGroup(categoryFeatureGroups) };
          L.setOptions(fgOnLvl.layer, { name: 0 });
          this.featureGroup.push(fgOnLvl);
        } else {
          categoryFeatureGroups.forEach((layer) => {
            fgOnLvl.layer.addLayer(layer);
          });
        }
      }
      this.addLayerToMap(mapBounds);
    }
  }

  /**
   * This method is used to create marker for given device
   */
  private createMarker(mo: IManagedObject) {
    // add floor plan, stored in the position's altitude, as option in the marker for later comparisons...
    const iconMarker = L.ExtraMarkers.icon({
      icon: 'fa-number',
      iconColor: this.markerFontColor,
      extraClasses: 'fa-lg',
      markerColor: this.markerColor,
      number: 0,
      shape: 'square',
      svg: 'true',
      prefix: 'fa-dp',
    });
    const iconOpts = {
      title: mo.name,
      id: mo.id,
      icon: iconMarker,
      draggable: false,
    };
    const markerLatLng = L.latLng(mo.c8y_Position);
    const mkr = L.Marker.movingMarker(
      [markerLatLng, markerLatLng],
      [1000],
      iconOpts
    );
    const mpp = L.popup({ className: 'lt-popup' });
    const elem = [
      { label: 'Name:', value: mo.name },
      { label: 'ID:', value: mo.id },
      { label: 'Type:', value: mo.type },
    ];
    let tabGroup = null;
    let dashboardId = null;
    if (this.dashboardField) {
      dashboardId = this.getNavigationFields(this.dashboardField, mo);
    }
    if (this.tabGroupField) {
      tabGroup = this.getNavigationFields(this.tabGroupField, mo);
    }
    let deviceListDashboard = [];
    deviceListDashboard = mo.deviceListDynamicDashboards;
    const markerData = {
      elem,
      dashboardId,
      tabGroup,
    };
    let ppContent = '';
    if (dashboardId) {
      this.createNavigationPopupForMarker(null, mpp, markerData);
    } else {
      ppContent = this.getPopupContent(elem);
    }
    mkr
      .bindPopup(mpp)
      .on('popupopen', ($event) => {
        if (ppContent) {
          mpp.setContent(ppContent);
        }
      })
      .on('click', (e) => {
      })
      .on('popupclose', ($event) => {});
    return mkr;
  }

  /**
   * Attached Navigation popup with component resolver.
   */
  private createNavigationPopupForMarker(layer: any, popup: any, data?: any) {
    const compFactory = this.resolver.resolveComponentFactory(
      GPDataPointMapPopupComponent
    );
    this.popupDetailCompRef = compFactory.create(this.injector);
    if (this.appRef.attachView) {
      // since 2.3.0
      this.appRef.attachView(this.popupDetailCompRef.hostView);
    } else {
      // tslint:disable-next-line: no-string-literal
      this.appRef['registerChangeDetector'](
        this.popupDetailCompRef.changeDetectorRef
      );
    }

    const div = document.createElement('div');
    div.appendChild(this.popupDetailCompRef.location.nativeElement);
    popup.setContent(div);
    if (data) {
      this.popupDetailCompRef.instance.editData = data;
    }
  }

  /**
   * Findout navigation property in device object
   */
  private getNavigationFields(dashboardField, deviceObj) {
    let navigationField = null;
    const dashboardFields = dashboardField.split('.');
    const dashboardFieldObj = deviceObj[dashboardFields[0]];
    if (
      dashboardFieldObj &&
      Array.isArray(dashboardFieldObj) &&
      dashboardFields.length === 2
    ) {
      if (dashboardFieldObj.length > 0) {
        const deviceWithAppId = dashboardFieldObj.find(
          (dashboard) => dashboard.appId === this.appId
        );
        if (deviceWithAppId) {
          navigationField = deviceWithAppId[dashboardFields[1]];
        } else {
          navigationField = dashboardFieldObj[0][dashboardFields[1]];
        }
      }
    } else if (dashboardFieldObj && dashboardFields.length === 2) {
      navigationField = dashboardFieldObj[dashboardFields[1]];
    } else {
      navigationField = dashboardFieldObj;
    }
    return navigationField;
  }

  /**
   * Create popup content for device marker where dashboard link is not provided
   */
  private getPopupContent(elems): string {
    let ppContent = '';
    for (const elem of elems) {
      ppContent =
        ppContent +
        `<div class='lt-popup-row'><label class=''>${elem.label}</label><div class=''>${elem.value}</div></div>`;
    }
    return ppContent;
  }

  /**
   * Update marker position based on realtime device movement
   */
  private updateMarkerPosition(data: IManagedObject) {
    // this.allMarkers[data.id].setLatLng(new L.latLng(data.c8y_Position.lat, data.c8y_Position.lng));
    const newPosLatLng = new L.latLng(
      data.c8y_Position.lat,
      data.c8y_Position.lng
    );
    this.allMarkers[data.id].moveTo(newPosLatLng, 2000);
    const markerBound = new L.LatLngBounds(newPosLatLng, newPosLatLng);
    const mapBounds = this.map.getBounds();
    mapBounds.extend(markerBound);
    this.map.flyToBounds(mapBounds, { maxZoom: this.initialMaxZoom });
    const markers = L.markerClusterGroup();
    markers.refreshClusters(this.allMarkers[data.id]);
  }

  /**
   * THis method is used to load all layers(marker, geofence, heatmap, etc) on map based on given configuration
   */
  private addLayerToMap(mapBounds: any) {
    if (this.map) {
      let initLayerSet = false;
      this.featureGroup.forEach((fg, idx) => {
        // this will set the layer to be shown initially. Should not show levels without devices initially...
        // the feature group will contain devices and plans as layers.
        if (!initLayerSet && this.featureGroup.length === 1) {
          fg.layer.addTo(this.map);
          initLayerSet = true;
        }
        if (this.featureGroup.length > 1) {
          this.layerControl.addBaseLayer(fg.layer, fg.name);
        }
      });
      if (!mapBounds) {
        mapBounds = new L.LatLngBounds([0, 0], [0, 0]);
      }
      this.map.flyToBounds(mapBounds, { maxZoom: this.initialMaxZoom });
      if (this.featureGroup && this.featureGroup.length > 1) {
        this.layerControl.addTo(this.map);
      }
      this.isBusy = false;
      this.getMeasurements();
      this.allDeviceList = [];
    }
  }

  /**
   * Get mesurements for all devices
   */
  private getMeasurements() {
    this.allDeviceList.forEach((device) => {
      this.getLastMeasurement(device.id, this.measurementType.type, this.measurementType.name);
    });
  }
  /**
   * Get Last measurements for given device id. Measurement will be look upto last 30 days
   */
  private getLastMeasurement(sourceId, type, series) {
    const now = moment();
    const observedMeasures = this.dpService.getLastMeasurementForSource(
      sourceId,
      now.add(-30, 'days').format('YYYY-MM-DD'),
      now.add(31, 'days').format('YYYY-MM-DD'),
      type,
      series
    );

    const measurementSubs = observedMeasures.subscribe((data) => {
      if (data.length > 0 ) {
        const marker = this.allMarkers[sourceId];
        if (marker) {
          this.hideDeviceOnMap(sourceId);
          const icon = marker.getIcon();
          const msmt = data[0];
          if (
            msmt &&
            msmt[this.measurementType.type] &&
            msmt[this.measurementType.type][this.measurementType.name]
          ) {
            const val =
              msmt[this.measurementType.type][this.measurementType.name].value;
            icon.options.number =
              Math.round((val + Number.EPSILON) * 100) / 100;
          } else {
            icon.options.number = 0;
          }
          marker.setIcon(icon);
          const oldFeatureGroup = this.featureGroup[0];
          if (this.isClusterMap) {
            const clusterLayer = oldFeatureGroup.layer.getLayers();
            if (clusterLayer && clusterLayer.length > 0) {
              for (const layer of clusterLayer) {
                if (layer._url === undefined) {
                  layer.addLayer(marker);
                  break;
                }
              }
            }
          } else {
            oldFeatureGroup.layer.addLayer(marker);
          }
          if (this.realtime) {
            this.realtTimeMeasurements(sourceId, RealtimeAction.CREATE);
          }
        }
      }
      measurementSubs.unsubscribe();
    });
  }

  /**
   *
   * remove device marker from map to update its measuerement
   */
  private hideDeviceOnMap(deviceId) {
    const cMarker = this.allMarkers[deviceId];
    if (cMarker) {
      const oldFeatureGroup = this.featureGroup[0];
      if (this.isClusterMap) {
        const clusterLayer = oldFeatureGroup.layer.getLayers();
        if (clusterLayer && clusterLayer.length > 0) {
          clusterLayer.forEach((layer) => {
            if (layer._url === undefined && layer.removeLayer) {
              layer.removeLayer(cMarker);
            }
          });
        }
      } else {
        oldFeatureGroup.layer.removeLayer(cMarker); // marker removed from feature group
      }
    }
  }
  /**
   * Subscripton for realtime measurements for given source id
   */
  private realtTimeMeasurements(sourceId, realtimeAction) {
    const measurementChannel = `/measurements/${sourceId}`;
    const realTimeMeasurementSub = this.realTimeService.subscribe(
      measurementChannel,
      (response) => {
        if (response && response.data) {
          const measurementData = response.data;
          if (
            measurementData.realtimeAction === realtimeAction &&
            measurementData.data
          ) {
            const msmt = measurementData.data;
            const marker = this.allMarkers[sourceId];
            if (marker && msmt &&
              msmt[this.measurementType.type] &&
              msmt[this.measurementType.type][this.measurementType.name]) {
              const oldFeatureGroup = this.featureGroup[0];
              this.hideDeviceOnMap(sourceId);
              oldFeatureGroup.layer.removeLayer(marker); // marker removed from feature group
              const icon = marker.getIcon();
              const val = msmt[this.measurementType.type][this.measurementType.name].value;
              icon.options.number = Math.round((val + Number.EPSILON) * 100) / 100;
              marker.setIcon(icon);
              if (this.isClusterMap) {
                const clusterLayer = oldFeatureGroup.layer.getLayers();
                if (clusterLayer && clusterLayer.length > 0) {
                  for (const layer of clusterLayer) {
                    if (layer._url === undefined) {
                      layer.addLayer(marker);
                      break;
                    }
                  }
                }
              } else {
                oldFeatureGroup.layer.addLayer(marker);
              }
            }
          }
        }
      }
    );
    this.allSubscriptions.push({
      id: sourceId,
      subs: realTimeMeasurementSub,
      type: 'Measurements',
    });
  }
}
