import IpUtil from "ip";
import arp from 'node-arp';
var log = require('electron-log');
const chalk = require('chalk');
import evilscan from 'evilscan';
import * as networkActions from '../actions/network_connection_actions';
import * as types from '../constants/network_scanner_action_types';
import { ipcMain } from 'electron';

const prefix = chalk.bold.blue;

function writeLog(...params) {
  console.info(prefix('[scanner]'), ...params);
}

function scanNetwork(sender) {
  const ip = IpUtil.address();
  let ips = [];
  let ipRange = networkActions.getIpsForScan(ip);
  ips = ips.concat(networkActions.getIpList(ipRange[1]+'.0',ipRange[2]+'.0'));
  // let ipsLength = ips.length*256;
  return Promise.all(ips.map((ip) => {
    return new Promise((resolve, reject) => {
      const scanner = new evilscan({
        target: ip,
        port:'8022',
        status:'O'
      });
      scanner.on('result', (data) => {
        if (data.status === "open") {
          writeLog("Found EON at ", data.ip);
          sender.send(types.SCAN_NETWORK_RESULT,data);
        }
      });
      scanner.on('error', (err) => {
        // writeLog('Error:',err);
        reject(err);
      });
      scanner.on('done', (data) => {
        // writeLog('IP Group Complete');
        sender.send(types. SCAN_NETWORK_PARTIAL_COMPLETE);
        resolve();
      });

      scanner.run();
    });
  }));
}

export function listenForNetworkScanner() {
  writeLog("Waiting for Network Scans...");
  ipcMain.on(types.SCAN_NETWORK,(evt) => {
    const { sender } = evt;
    scanNetwork(sender).then((results) => {
      sender.send(types.SCAN_NETWORK_COMPLETE,results);
    }).catch((err) => {
      sender.send(types.SCAN_NETWORK_FAIL,err);
    });
  });
}