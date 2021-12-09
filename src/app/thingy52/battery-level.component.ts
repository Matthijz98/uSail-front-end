import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BluetoothCore, BrowserWebBluetooth, ConsoleLoggerService } from '@manekinekko/angular-web-bluetooth';
import { Subscription } from 'rxjs';
import { BleService } from '../ble.service';

export const bleCore = (b: BrowserWebBluetooth, l: ConsoleLoggerService) => new BluetoothCore(b, l);
export const bleService = (b: BluetoothCore) => new BleService(b);


// make sure we get a singleton instance of each service
const PROVIDERS = [{
  provide: BluetoothCore,
  useFactory: bleCore,
  deps: [BrowserWebBluetooth, ConsoleLoggerService]
}, {
  provide: BleService,
  useFactory: bleService,
  deps: [BluetoothCore]
}];


@Component({
  selector: 'ble-battery-level',
  template: `
    {{ value | json }}
  `,
  styles: [],
  providers: PROVIDERS
})
export class BatteryLevelComponent implements OnInit, OnDestroy {
  value = null;
  mode = 'determinate';
  color = 'primary';
  valuesSubscription: Subscription;
  streamSubscription: Subscription;
  deviceSubscription: Subscription;

  get device() {
    return this.service.getDevice();
  }

  constructor(
    public service: BleService,
    public snackBar: MatSnackBar,
    public console: ConsoleLoggerService) {

    service.config({
      decoder: (value: DataView) => value.buffer,
      service: '0000ffe0-0000-1000-8000-00805f9b34fb',
      characteristic: '0000ffe0-0000-1000-8000-00805f9b34fb'
    });
  }

  ngOnInit() {
    this.getDeviceStatus();

    this.streamSubscription = this.service.stream()
      .subscribe((value: number) => {
        this.updateValue(value);
      }, error => this.hasError(error));

  }

  getDeviceStatus() {
    this.deviceSubscription = this.service.getDevice()
      .subscribe(device => {
        if (device) {
          this.color = 'warn';
          this.mode = 'indeterminate';
          this.value = null;
        } else {
          // device not connected or disconnected
          this.value = null;
          this.mode = 'determinate';
          this.color = 'primary';
        }
      }, this.hasError.bind(this));
  }

  requestValue() {
    this.valuesSubscription = this.service.value()
      .subscribe((value: number) => this.updateValue(value), error => this.hasError(error));
  }

  updateValue(value) {
    this.console.log(value);
    this.console.log(new TextDecoder().decode(value));
    this.value = JSON.parse(new TextDecoder().decode(value));
    this.mode = 'determinate';
  }

  disconnect() {
    this.service.disconnectDevice();
    this.deviceSubscription.unsubscribe();
    this.valuesSubscription.unsubscribe();
  }

  hasError(error: string) {
    this.snackBar.open(error, 'Close');
  }

  ngOnDestroy() {
    this.valuesSubscription?.unsubscribe();
    this.deviceSubscription?.unsubscribe();
    this.streamSubscription?.unsubscribe();
  }
}

