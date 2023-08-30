import { PlatformConfig } from 'homebridge';

export interface MerlinConfig extends PlatformConfig {
  routerIP: string;
  username: string;
  password: string;
}
