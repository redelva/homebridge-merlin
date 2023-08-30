import {
  API,
  APIEvent,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  DynamicPlatformPlugin,
  HAP,
  Logging,
  PlatformAccessory,
  PlatformAccessoryEvent,
  PlatformConfig,
} from 'homebridge';
import { MerlinAPI } from './api';
import { MerlinConfig } from './models/config';
import { MerlinAccessory } from './accessory';

// let hap: HAP;
// let Accessory: typeof PlatformAccessory;

const PLUGIN_NAME = 'homebridge-merlin';
const PLATFORM_NAME = 'Merlin';

export class MerlinPlatform implements DynamicPlatformPlugin {
  private readonly log: Logging;
  private readonly api: API;
  private config: MerlinConfig;
  private readonly accessories: Array<PlatformAccessory> = [];
  private routerIP = 'http://192.168.31.1';
  private username = '';
  private password = '';

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.api = api;
    this.config = config as MerlinConfig;

    // Need a config or plugin will not start
    if (!config) {
      return;
    }

    // Set up the config if options are not set
    this.routerIP = this.config.routerIP;
    this.username = this.config.username;
    this.password = this.config.password;

    if (!this.password || !this.username) {
      this.log.error("Please add your router's username/password to the config.json.");
      return;
    }

    api.on(APIEvent.DID_FINISH_LAUNCHING, this.didFinishLaunching.bind(this));
  }

  configureAccessory(accessory: PlatformAccessory): void {
    this.log.info(`Configuring accessory ${accessory.displayName}`);

    accessory.on(PlatformAccessoryEvent.IDENTIFY, () => {
      this.log.info(`${accessory.displayName} identified!`);
    });

    const merlinAccessory = new MerlinAccessory(accessory, this.config, this.log, this.api.hap);

    const routerService = merlinAccessory.createService(this.api.hap.Service.WiFiRouter);
    routerService
      .getCharacteristic(this.api.hap.Characteristic.ManagedNetworkEnable)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
        callback(null, 1);
      });

    routerService
      .getCharacteristic(this.api.hap.Characteristic.RouterStatus)
      .on(CharacteristicEventTypes.GET, (callback: CharacteristicSetCallback) => {
        callback(null, 0);
      });

    this.accessories.push(accessory);
  }

  async didFinishLaunching(): Promise<void> {
    const api = new MerlinAPI(this.routerIP, this.username, this.password);
    const validated = await api.validate();

    if (!validated) {
      await api.login(this.username, this.password);
    }
    const info = await api.getConnectedDevices();
    const wifi = await api.getLANSettings();
    const ssid = wifi.ssid;
    const uuid = this.api.hap.uuid.generate(info.serialNumber);
    const accessory = new this.api.platformAccessory(ssid, uuid);

    const accessoryInformation = accessory.getService(this.api.hap.Service.AccessoryInformation);
    if (accessoryInformation) {
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.Manufacturer, info.manufacturer);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.Model, info.modelNumber);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.SerialNumber, info.serialNumber);
      accessoryInformation.setCharacteristic(this.api.hap.Characteristic.FirmwareRevision, info.firmwareVersion);
    }

    if (!this.accessories.find((x: PlatformAccessory) => x.UUID === uuid)) {
      this.configureAccessory(accessory); // abusing the configureAccessory here
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }
}

// export = (api: API): void => {
//   hap = api.hap;
//   Accessory = api.platformAccessory;
//
//   api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, MerlinPlatform);
// };
