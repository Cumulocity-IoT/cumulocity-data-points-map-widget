  

# Data Points Map Widget for Cumulocity[<img width="35" src="https://user-images.githubusercontent.com/67993842/97668428-f360cc80-1aa7-11eb-8801-da578bda4334.png"/>](https://github.com/SoftwareAG/cumulocity-data-points-map-widget/releases/download/2.0.0/datapoints-map-runtime-widget-2.0.0.zip)

  
The Data Points Map widget help you to display measurements and device locations on map.

 ### ⚠️ This project is no longer under development. Please use [cumulocity-data-points-map-widget-plugin](https://github.com/SoftwareAG/cumulocity-data-points-map-widget-plugin) for Application Builder >=2.x.x and Cumulocity >=1016.x.x⚠️

### Please choose Data Points Map release based on Cumulocity/Application builder version:

|APPLICATION BUILDER | CUMULOCITY | DATA POINTS MAP WIDGET |
|--------------------|------------|------------------------|
| 1.3.x              | >= 1011.x.x| 2.x.x                  |
| 1.2.x              | 1010.x.x   | 1.x.x                  |  
  

![](https://user-images.githubusercontent.com/32765455/102481039-2cb8c000-4087-11eb-8000-8fb956bd9294.jpg)

## Features
  
*  **Data Points:** Display measurements in terms of data points on map across geographical location.

*  **Cluster Map:** Configurable switch to show cluster map for large set of devices.

*  **Configurable Color:** Select custom color for your device markers on map.

*  **Configurable Zoom:**  Select and configurable zoom which is best fit for your map.  

*  **Support single device and group devices:** Based on configuration during widget configuration. 

  

## Installation

  
### Runtime Widget Deployment?

* This widget support runtime deployment. Download [Runtime Binary](https://github.com/SoftwareAG/cumulocity-data-points-map-widget/releases/download/2.0.0/datapoints-map-runtime-widget-2.0.0.zip) and use application builder to install your runtime widget.
  

### Installation of widget through Appbuilder?
  

**Supported Cumulocity Environments:**
  

*  **App Builder:** Tested with Cumulocity App Builder version 1.3.0.  

 
**Requirements:**

* Git

* NodeJS (release builds are currently built with `v14.18.0`)

* NPM (Included with NodeJS)

**External dependencies:**

```

"angular-resize-event": "^2.1.0"

"fontawesome": "4.7.2"

"leaflet-extra-markers": "^1.2.1"

"leaflet2": "npm:leaflet@^1.6.0"

"@angular/material": "11.2.13"

"leaflet.markercluster": "^1.4.1

```

**Installation Steps For App Builder:**


**Note:** If you are new to App Builder or not yet downloaded/clone app builder code then please follow [App builder documentation(Build Instructions)](https://github.com/SoftwareAG/cumulocity-app-builder) before proceeding further.



1. Open Your existing App Builder project and install external dependencies by executing below command or install it manually.

    ```

    npm i angular-resize-event@2.1.0 fontawesome@4.7.2 leaflet-extra-markers@1.2.1 leaflet2@npm:leaflet@^1.6.0 @angular/material@11.2.13 leaflet.markercluster@1.4.1

    ```
2. Grab the Data Points Map **[Latest Release Binary](https://github.com/SoftwareAG/cumulocity-data-points-map-widget/releases/download/2.0.0/gp-data-points-map-2.0.0.tgz)**.


3. Install the Binary file in app builder.

    ```
    
    npm i <binary file path>/gp-data-points-map-x.x.x.tgz

    ```

4. Copy datapoints-map.less file [from here](https://github.com/SoftwareAG/cumulocity-data-points-map-widget/releases/download/2.0.0/datapoints-map.less) and paste it at /cumulocity-app-builder/ui-assets/

5. Open index.less located at /cumulocity-app-builder/ui-assets/


6. Update index.less file with below Material theme. Import at first line in file/beginning of file(Please ignore this step if it already exist).

    ```

    @import '~@angular/material/prebuilt-themes/indigo-pink.css';

    ```

7. Update index.less file with below datapoints-map.less. Import at last line/end of file.

    ```

    @import  'datapoints-map.less';

    ```

8. Import GpDataPointsMapModule in custom-widget.module.ts file located at /cumulocity-app-builder/custom-widgets/

    ```  

    import {GpDataPointsMapModule} from  'gp-data-points-map';

    @NgModule({

    imports: [

    GpDataPointsMapModule

    ]

    })

    ```

9. Congratulation! Installation is now completed. Now you can run app builder locally or build and deploy it into your tenant.

    ```

    //Start App Builder

    
    npm run start

    // Build App


    npm run build


    // Deploy App


    npm run deploy


    ```
  


## Build Instructions

**Note:** It is only necessary to follow these instructions if you are modifying/extending this widget, otherwise see the [Installation Guide](#Installation).

**Requirements:**
  
* Git  

* NodeJS (release builds are currently built with `v14.18.0`)
  

* NPM (Included with NodeJS)
  

**Instructions**


1. Clone the repository:

    ```  

    git clone https://github.com/SoftwareAG/cumulocity-data-points-map-widget.git

    ```

2. Change directory:

    ```

    cd cumulocity-data-points-map-widget

    ```

3. (Optional) Checkout a specific version:

    ```

    git checkout <your version>
    

    ```  

4. Install the dependencies:

    ```

    npm install

    ```

5. (Optional) Local development server:

    ```

    npm run start

    ```

6. Build the app:

    ```

    npm run build

    ```

7. Deploy the app:

    ```

    npm run deploy

    ```

## QuickStart
  

This guide will teach you how to add widget in your existing or new dashboard.

  

**NOTE:** This guide assumes you have followed the [Installation instructions](#Installation)

  

1. Open you application from App Switcher
  

2. Add new dashboard or navigate to existing dashboard
  

3. Click `Add Widget`
  

4. Search for `Data Points Map`


5. Select `Target Assets or Devices`


6. Select `Measurement from dropdown`

7. Click `Save`


Congratulations! Data Points Map is configured.

  

## User Guide

 

*  **Target assets or devices:** User can select a device or a group. Based on device/group, list of devices will be display on Map. Only those devices are visible on map where position attributes are configured. 

  

*  **Cluster Map:** User can switch to cluster map.


*  **Select Measurements:**  Based on selected assets or devices, this field will be populated with available measurements/data points. User can select any one measurement which is applicable for selected device or group of devices.

  

*  **Dashboard Field(Application Builder only):** User has ability to provide device object field which represent dashboard Id. Based on this field, data points map will display navigation link for particular device(optional).

  

*  **TabGroup Field(Application Builder only):** User has ability to provide device object field which represent dashboard tab group name. Based on this field, data points map will display navigation link for particular device(optional).


*  **Default Zoom:** User has ability to change outdoor zoom level. Default is Auto


*  **Marker Color:** User can select maker color from color picker or enter manually. If more than one color selected from color picker, only first color will be applied. This is optional field.
  

*  **Marker Font Color:** User can select maker color from color picker or enter manually. If more than one color selected from color picker, only first color will be applied. This is optional field.



**Data Points Map On Screen Options:**

 

*  **Realtime**: Realtime measurements are activated by default. Use can click on it to on/off real time measurements.

   

*  **Reload**: Useful for force reload/refresh map.

 
  

------------------------------

This widget is provided as-is and without warranty or support. They do not constitute part of the Software AG product suite. Users are free to use, fork and modify them, subject to the license agreement. While Software AG welcomes contributions, we cannot guarantee to include every contribution in the master project.

_____________________

For more information you can Ask a Question in the [TECHcommunity Forums](https://tech.forums.softwareag.com/tags/c/forum/1/Cumulocity-IoT).


You can find additional information in the [Software AG TECHcommunity](https://tech.forums.softwareag.com/tag/Cumulocity-IoT).
