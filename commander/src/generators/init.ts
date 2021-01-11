/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/*
 * LiskHQ/lisk-commander
 * Copyright © 2020 Lisk Foundation
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

import Generator, { GeneratorOptions } from 'yeoman-generator';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const npmGenerator = require('generator-npm');

export default class extends Generator {
	public constructor(args: string | string[], opts: GeneratorOptions) {
    super(args, opts);

    this.composeWith(npmGenerator);
  }

  public createSourceDirectories(): void {
    this.log('Creating directories...');
  }

  public createTestDirectories(): void {
    this.log('Creating directories...');
  }

  public createRCFile(): void {
    this.log('Creating directories...');
  }
}
