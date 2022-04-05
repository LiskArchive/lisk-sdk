/*
 * Copyright © 2022 Lisk Foundation
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
 */

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { CCChannelTerminatedCommand } from '../../../../../src/modules/interoperability/cc_commands/channel_terminated';
import { testing } from '../../../../../src';

describe('Cross chain channel terminated command', () => {
	const ccm = {
		nonce: BigInt(0),
		moduleID: 1,
		crossChainCommandID: 1,
		sendingChainID: 2,
		receivingChainID: 3,
		fee: BigInt(20000),
		status: 0,
		params: Buffer.alloc(0),
	};
	let ccChannelTerminatedCommand: CCChannelTerminatedCommand;

	describe('execute', () => {
		it('should call validators API registerValidatorKeys', async () => {
			ccChannelTerminatedCommand = new CCChannelTerminatedCommand();
			jest.spyOn(ccChannelTerminatedCommand, '_createTerminatedStateAccount' as any);
			const executeCCMContext = testing.createExecuteCCMsgAPIContext({
				ccm,
				feeAddress: getRandomBytes(32),
			});
			await ccChannelTerminatedCommand.execute(executeCCMContext);

			expect(ccChannelTerminatedCommand['_createTerminatedStateAccount']).toHaveBeenCalledWith(
				executeCCMContext.ccm.sendingChainID,
			);
		});
	});
});
