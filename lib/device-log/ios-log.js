import { IOSLog as IOSDriverIOSLog } from 'appium-ios-driver';
import path from 'path';
import { fs } from 'appium-support';
import _ from 'lodash';
import log from '../logger';
import { SubProcess, exec } from 'teen_process';
import xcode from 'appium-xcode';

class IOSLog extends IOSDriverIOSLog {
  async startCaptureSimulator () {
    if (_.isUndefined(this.sim.udid)) {
      throw new Error(`Log capture requires a sim udid`);
    }

    const xcodeVersion = await xcode.getVersion(true);
    let tool, args;
    if (xcodeVersion.major < 9) {
      const systemLogPath = path.resolve(this.sim.getLogDir(), 'system.log');
      if (!await fs.exists(systemLogPath)) {
        throw new Error(`No logs could be found at ${systemLogPath}`);
      }
      log.debug(`System log path: ${systemLogPath}`);
      tool = 'tail';
      args = ['-f', '-n', '1', systemLogPath];
    } else {
      if (!await this.sim.isRunning()) {
        throw new Error(`iOS Simulator with udid ${this.sim.udid} is not running`);
      }
      tool = 'xcrun';
      args = ['simctl', 'spawn', this.sim.udid, 'log', 'stream', '--style', 'compact'];
    }
    log.debug(`Starting log capture for iOS Simulator with udid ${this.sim.udid}`);
    try {
      // cleanup existing listeners if the previous session has not been terminated properly
      await exec('pkill', ['-xf', [tool, ...args].join(' ')]);
    } catch (ign) {}
    try {
      this.proc = new SubProcess(tool, args);
      await this.finishStartingLogCapture();
    } catch (e) {
      throw new Error(`Simulator log capture failed. Original error: ${e.message}`);
    }
  }

  get isCapturing () {
    return !!(this.proc && this.proc.isRunning);
  }
}

export { IOSLog };
export default IOSLog;
