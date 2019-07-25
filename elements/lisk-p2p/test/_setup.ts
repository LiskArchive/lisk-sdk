/*
 * Copyright © 2019 Lisk Foundation
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
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import 'chai/register-expect';
import * as sinonChai from 'sinon-chai';
import * as sinon from 'sinon';

process.env.NODE_ENV = 'test';

[sinonChai, chaiAsPromised].forEach(plugin => chai.use(plugin));

global.sandbox = sinon.createSandbox({
	useFakeTimers: process.env.USE_REAL_TIMERS !== 'true',
});
