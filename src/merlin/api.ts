import axios from 'axios';
import { AxiosRequestConfig, Method, ResponseType } from 'axios';

const USERAGENT = 'asusrouter-Android-DUTUtil-1.0.0.3.58-163';

const CONTENTTYPE = 'application/x-www-form-urlencoded';

export interface Client {
  rssi: string
  interface: string
  alias: string
  mac: string
}

export class MerlinAPI {
  private ip = 'http://192.168.31.1/';
  private password = '';
  private username = '';
  private token = '';
  private expireTs = -1;

  constructor(ip: string, username:string, password: string) {
    this.ip = ip;
    this.username = username;
    this.password = password;

    if (this.ip.endsWith('/')) {
      this.ip = this.ip.substring(0, this.ip.length - 1);
    }
  }

  async validate(){
    return new Date().getTime() - this.expireTs > 3600;
  }

  async sendRequest(method: string, path: string, payload?: any): Promise<any> {
    const headers: any = {
      'Content-Type': CONTENTTYPE,
      'User-Agent': USERAGENT,
      Cookie: `asus_token=${this.token};`,
    };

    const req: AxiosRequestConfig = {
      method: method as Method,
      url: `${this.ip}${path}`,
      data: payload,
      headers,
    };

    return (await axios(req)).data;
  }

  async get(payload: string): Promise<any> {
    const headers: any = {
      'Content-Type': CONTENTTYPE,
      'User-Agent': USERAGENT,
      Cookie: `asus_token=${this.token};`,
    };

    const req: AxiosRequestConfig = {
      method: 'post',
      url: `${this.ip}/appGet.cgi`,
      data: { hook: payload },
      headers,
    };

    return (await axios(req)).data;
  }

  async login(username: string, password: string) {
    const response = await this.sendRequest('post', '/login.cgi', {
      login_authorization: Buffer.from(`${username}:${password}`).toString('base64'),
    });

    if (!response.cookies.asus_token) {
      throw new Error(`Failed to login to router ${response.body}`);
    }
    this.token = response.cookies.asus_token;
    this.expireTs = new Date().getTime();
  }

  async logout() {
    await this.sendRequest('get', '/Logout.asp');
  }

  // const info = (await api.sendRequest('core/GetDeviceInfo')).output;
  // const wifi = (await api.sendRequest('router/GetLANSettings')).output;
  // const ssid = wifi.hostName;

  // async getDCHPHistory () {
  //   const response = await makeAuthenticatedRequest(get, 'http://router.asus.com/Main_DHCPStatus_Content.asp')
  //   const regex = /Hostname \s+IP Address\s+MAC Address\s+Expires(?=[\S\s]{10,8000})[\S\s]+<\/textarea>/gm
  //   const result = regex.exec(response.body)
  //   if (!result) {
  //     // Something wrong
  //     throw new Error('Got malformed data back from http://router.asus.com/Main_DHCPStatus_Content.asp')
  //   }
  //   const table = result[0]
  //   const rows = table.split('\n')
  //   const devices = []
  //   for (let i = 0; i < rows.length; i++) {
  //     const row = rows[i]
  //     if (row.startsWith('Hostname')) { continue }
  //     const regex = /(\S+).+?(\d+.\d+.\d+.\d+).+?([A-z0-9:]+).+?(\d+:\d+:\d+)/gm
  //     const results = regex.exec(row)
  //     if (!results) { continue }
  //     const device = { hostname: results[1], ip: results[2], mac: results[3], expires: results[4], secondsLeft: -1 }
  //     devices.push(device)
  //     const hhmmss = /(\d+):(\d+):(\d+)/gm.exec(device.expires)
  //     if (hhmmss) {
  //       device.secondsLeft = Number(hhmmss[1]) * 3600 + Number(hhmmss[2]) * 60 + Number(hhmmss[3])
  //     }
  //   }
  //   return devices
  // }

  async getConnectedDevices() {
    const resp = await this.get(
      'get_clientlist(appobj);wl_sta_list_2g(appobj);wl_sta_list_5g(appobj);wl_sta_list_5g_2(appobj);nvram_get(custom_clientlist)',
    );

    const updateInterface = (_interface: string, interfaceName: string): Array<Client> => {
      const key = `wl_sta_list_${_interface}`;
      return Object.keys(resp[key]).map((mac: string) => {
        return { alias: '', interface: interfaceName, mac: mac, rssi: resp[key][mac].rssi };
      });
    };

    const clients = resp.get_clientlist;
    clients.push(...updateInterface('2g', '2GHz'));
    clients.push(...updateInterface('5g', '5GHz'));
    clients.push(...updateInterface('5g_2', '5GHz-2'));
    // update_custom()

    return clients;
  }

  getLANSettings() {
    return { ssid: 'absolute' };
  }
}
