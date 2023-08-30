import { API } from 'homebridge';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { MerlinPlatform } from './merlin/platform';

const PLUGIN_NAME = 'homebridge-merlin';
const PLATFORM_NAME = 'Merlin';

export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, MerlinPlatform);
};
