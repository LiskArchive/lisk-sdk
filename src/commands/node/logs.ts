/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 *
 */
import { flags as flagParser } from '@oclif/command';
import * as childProcess from 'child_process';
import BaseCommand from '../../base';
import { NETWORK } from '../../utils/constants';
import { flags as commonFlags } from '../../utils/flags';
import { getNetworkConfig, NodeConfig } from '../../utils/node/config';
import { describeApplication, Pm2Env } from '../../utils/node/pm2';

interface Flags {
  readonly name: string;
}

export default class LogsCommand extends BaseCommand {
  static description = 'Show log of a Lisk Core instance';

  static examples = ['node:logs --name=testnet-1.6'];

  static flags = {
    ...BaseCommand.flags,
    name: flagParser.string({
      ...commonFlags.name,
      default: NETWORK.MAINNET,
    }),
  };

  async run(): Promise<void> {
    const { flags } = this.parse(LogsCommand);
    const { name } = flags as Flags;

    const { pm2_env } = await describeApplication(name);
    const { pm_cwd: installDir, LISK_NETWORK: network } = pm2_env as Pm2Env;
    const { logFileName }: NodeConfig = getNetworkConfig(installDir, network);
    const fName = `${installDir}/${logFileName}`;

    const { stderr, stdout } = childProcess.spawn('tail', ['-f', fName]);

    stdout.on('data', (data) => {
      this.log(data.toString('utf-8').replace(/\n/, ''));
    });

    stderr.on('error', (err) => {
      this.log(err.message);
    });
  }
}
