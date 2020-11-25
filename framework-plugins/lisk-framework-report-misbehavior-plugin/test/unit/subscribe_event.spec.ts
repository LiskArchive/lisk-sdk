/*
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
 */

import { codec } from '@liskhq/lisk-codec';
import { ReportMisbehaviorPlugin } from '../../src';

describe('subscribe to event', () => {
	let reportMisbehaviorPlugin: ReportMisbehaviorPlugin;
	let subscribeMock: jest.Mock;
	beforeEach(() => {
		subscribeMock = jest.fn();
		const channelMock = {
			subscribe: subscribeMock,
		};
		reportMisbehaviorPlugin = new (ReportMisbehaviorPlugin as any)();
		(reportMisbehaviorPlugin as any)._channel = channelMock;
	});

	it('should register listener to network:event', () => {
		// Act
		reportMisbehaviorPlugin['_subscribeToChannel']();
		// Assert
		expect(subscribeMock).toHaveBeenCalledTimes(1);
		expect(subscribeMock).toHaveBeenCalledWith('app:network:event', expect.any(Function));
	});

	it('should not decode block when data is invalid', () => {
		jest.spyOn(codec, 'decode');
		// Act
		reportMisbehaviorPlugin['_subscribeToChannel']();
		subscribeMock.mock.calls[0][1]({ event: 'postBlock', data: null });
		// Assert
		expect(codec.decode).not.toHaveBeenCalled();
	});
});
