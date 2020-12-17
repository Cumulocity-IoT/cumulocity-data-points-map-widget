/**
 * Copyright (c) 2020 Software AG, Darmstadt, Germany and/or its licensors
 *
 * SPDX-License-Identifier: Apache-2.0
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { isDevMode, Injectable } from '@angular/core';
import {
  InventoryBinaryService, InventoryService, IManagedObject,
  IResultList, MeasurementService, IResult, IManagedObjectBinary,
  EventService, ObservableList, IMeasurement, RealtimeAction, IFetchOptions, FetchClient
} from '@c8y/client';
import { BehaviorSubject, Observable } from 'rxjs';
import { C8yPosition } from './../interfaces/c8y.position';
import { C8Y_DEVICE_GROUP, C8Y_DEVICE_SUBGROUP } from './../tokens';
@Injectable()
export class GpDataPointsMapService {

  constructor(
    private invSvc: InventoryService,
    private msmtSvc: MeasurementService,
    private inventoryBinaryService: InventoryBinaryService,
    private eventService: EventService,
    private fetchClient: FetchClient
  ) { }

  /**
   * Retrieve the details for the specified managed object as a Promise
   *
   * @param deviceId Id of the managed object
   */
  getTargetObject(deviceId: string): any {
    return new Promise(
      (resolve, reject) => {
        this.invSvc.detail(deviceId)
          .then((resp) => {
            if (resp.res.status === 200) {
              resolve(resp.data);
            } else {
              reject(resp);
            }
          });
      });
  }

  /**
   * This service will recursively get all the child devices for the given device id and return a promise with the result list.
   *
   * @param id ID of the managed object to check for child devices
   * @param pageToGet Number of the page passed to the API
   * @param allDevices Child Devices already found
   */
  getChildDevices(id: string, pageToGet: number, allDevices: { data: any[], res: any }): Promise<IResultList<IManagedObject>> {
    const inventoryFilter = {
      // fragmentType: 'c8y_IsDevice',
      pageSize: 50,
      withTotalPages: true,
      currentPage: pageToGet
    };
    if (!allDevices) {
      allDevices = { data: [], res: null };
    }
    return new Promise(
      (resolve, reject) => {
        this.invSvc.childAssetsList(id, inventoryFilter)
          .then((resp) => {
            if (resp.res.status === 200) {
              if (resp.data && resp.data.length >= 0) {
                allDevices.data.push.apply(allDevices.data, resp.data);
                // suppose that if # of devices is less that the page size, then all devices have already been retrieved
                if (resp.data.length < inventoryFilter.pageSize) {
                  resolve(allDevices);
                } else {
                  this.getChildDevices(id, resp.paging.nextPage, allDevices)
                    .then((np) => {
                      resolve(allDevices);
                    })
                    .catch((err) => reject(err));
                }
              }
              // resolve(resp);
            } else {
              reject(resp);
            }
          });
      });
  }

  /**
   * This method will get all devices where c8y_position is available
   */
  getAllDevices(pageToGet: number, allDevices: { data: any[], res: any }): Promise<IResultList<IManagedObject>> {
    const inventoryFilter = {
      fragmentType: 'c8y_IsDevice',
      pageSize: 10,
      withTotalPages: true,
      query: 'has(c8y_Position)',
      currentPage: pageToGet
    };
    if (!allDevices) {
      allDevices = { data: [], res: null };
    }

    return new Promise(
      (resolve, reject) => {
        this.invSvc.list(inventoryFilter)
          .then((resp) => {
            if (resp.res.status === 200) {
              if (resp.data && resp.data.length >= 0) {
                allDevices.data.push.apply(allDevices.data, resp.data);
                if (resp.data.length < inventoryFilter.pageSize) {
                  resolve(allDevices);
                } else {
                  this.getAllDevices(resp.paging.nextPage, allDevices)
                    .then((np) => {
                      resolve(allDevices);
                    })
                    .catch((err) => reject(err));
                }
              }
            } else {
              reject(resp);
            }
          });
      });
  }

    // tslint:disable-next-line:max-line-length
    getLastMeasurementForSource(sourceId: string, dateFrom: string, dateTo: string, type: string, series: string): Observable<IMeasurement[]> {
        const msmtFilter = {
            pageSize: 1,
            valueFragmentSeries: series,
            valueFragmentType: type,
            dateFrom,
            dateTo,
            revert: true,
           // type
        };
        const realtimeOps = {
            realtime: true,
            realtimeAction: RealtimeAction.CREATE
        };
        // tslint:disable-next-line: deprecation
        return this.msmtSvc.listBySource$(sourceId, msmtFilter, realtimeOps);
    }

  /**
   * This method used in configuration of this widget to populate available measurements for given device id or group id
   */
  getFragmentSeries(aDevice: any, fragementList: any, observableFragment$: BehaviorSubject<any>): void {
    let deviceList: any = null;
    if (aDevice) {
      // if the map is inside a dashboard for a single object or a group
      // get all child assets for the target object, defined in the configuration
      this.getTargetObject(aDevice.id)
        .then(async (mo) => {
          if (mo && mo.type && (mo.type.localeCompare(C8Y_DEVICE_GROUP) === 0 || mo.type.localeCompare(C8Y_DEVICE_SUBGROUP) === 0)) {
            // GET child devices
            this.getChildDevices(aDevice.id, 1, deviceList)
              .then(async (deviceFound) => {
                deviceList = deviceFound.data;
                const uniqueDeviceList = deviceList
                  .filter((device, index, self) =>
                    index === self.findIndex((t) => (t.type === device.type)))
                  .map((device) => device.id);
                for (const device of uniqueDeviceList) {
                  if (isDevMode()) { console.log('+-+- CHECKING Series FOR: ', device); }
                  const  supportedMeasurements = await this.getSupportedMeasurementsForDevice(device);
                  if (isDevMode()) { console.log('+-+- supportedMeasurements FOR... ' + device, supportedMeasurements); }
                  const fragmentSeries = await this.getSupportedSeriesForDevice(device);
                  if (isDevMode()) { console.log('+-+- FragmentSeries FOR... ' + device, fragmentSeries); }
                  if (fragmentSeries && fragmentSeries.c8y_SupportedSeries &&
                    supportedMeasurements && supportedMeasurements.c8y_SupportedMeasurements) {
                    fragementList = this.getFragementList(fragementList, fragmentSeries.c8y_SupportedSeries,
                      supportedMeasurements.c8y_SupportedMeasurements) ;
                  }
                }
                observableFragment$.next(fragementList);
              })
              .catch((err) => {
                if (isDevMode()) { console.log('+-+- ERROR FOUND WHILE GETTING CHILD DEVICES... ', err); }
              });
          } else {
            if (isDevMode()) { console.log('+-+- CHECKING MEASUREMENTS FOR: ', aDevice.id); }
            const  supportedMeasurements = await this.getSupportedMeasurementsForDevice(aDevice.id);
            if (isDevMode()) { console.log('+-+- supportedMeasurements FOR... ' + aDevice.id, supportedMeasurements); }
            const fragmentSeries = await this.getSupportedSeriesForDevice(aDevice.id);
            if (isDevMode()) { console.log('+-+- FragmentSeries FOR... ' + aDevice.id, fragmentSeries); }
            if (fragmentSeries && fragmentSeries.c8y_SupportedSeries &&
                supportedMeasurements && supportedMeasurements.c8y_SupportedMeasurements) {
                fragementList = this.getFragementList
                (fragementList, fragmentSeries.c8y_SupportedSeries, supportedMeasurements.c8y_SupportedMeasurements);
              }
            observableFragment$.next(fragementList);
          }
        })
        .catch((err) => {
          if (isDevMode()) { console.log('+-+- ERROR while getting Device details ', err); }
        });
    }
  }

  /**
   * This method populate measurementList/fragementList based on series and measurements
   */
  private getFragementList(fragementList: any, fragmentSeries: any, supportedMeasurements: any) {
    if (fragementList) {
      fragmentSeries.forEach(fs => {
        const measurementType = supportedMeasurements.filter(smFilter => fs.indexOf(smFilter) !== -1);
        if (measurementType && measurementType.length > 0) {
          const fsName = fs.replace(measurementType[0] + '.' , '');
          const fsType = measurementType[0];
          const existingF = fragementList.find(sm => sm.type === fsType && sm.name === fsName);
          if (!existingF || existingF == null) {
            fragementList.push({
              name: fsName,
              type: fsType,
              description: fs
            });
          }
        }
      });
    } else {
      fragmentSeries.forEach(fs => {
        const measurementType = supportedMeasurements.filter(smFilter => fs.indexOf(smFilter) !== -1);
        if (measurementType && measurementType.length > 0) {
          const fsName = fs.replace(measurementType[0] + '.' , '');
          const fsType = measurementType[0];
          fragementList.push({
              name: fsName,
              type: fsType,
              description: fs
            });
        }
      });
    }
    return fragementList;
  }

  /**
   * Get Supported Series for given device id
   */
  private async getSupportedSeriesForDevice(deviceId: string) {
    const options: IFetchOptions = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    return (await (await this.fetchClient.fetch(`/inventory/managedObjects/${deviceId}/supportedSeries`, options)).json());
  }

  /**
   * Get Supported Measurements for given device Id
   */
  private async getSupportedMeasurementsForDevice(deviceId: string) {
    const options: IFetchOptions = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };
    return (await (await this.fetchClient.fetch(`/inventory/managedObjects/${deviceId}/supportedMeasurements`, options)).json());
  }
}
