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
 */

import { EventCallback } from '../../../../src/controller/event';
import { BaseChannel } from '../../../../src/controller/channels';
import { fakeLogger } from '../../../utils/mocks';
import { InvokeRequest } from '../../../../src/controller/channels/base_channel';

class MyChannel extends BaseChannel {
	public once(_eventName: string, _cb: EventCallback): void {}
	public subscribe(_eventName: string, _cb: EventCallback): void {}
	public unsubscribe(_eventName: string, _cb: EventCallback): void {}
	public publish(_eventName: string, _data: Record<string, unknown>): void {}
	public async registerToBus(_arg: any): Promise<void> {}
	// eslint-disable-next-line @typescript-eslint/require-await
	public async invoke<T>(_req: InvokeRequest): Promise<T> {
		return {} as T;
	}
}

describe('Base Channel', () => {
	// Arrange
	const params = {
		namespace: 'name',
		logger: fakeLogger,
		events: ['event1', 'event2'],
		endpoints: new Map([
			['action1', jest.fn()],
			['action2', jest.fn()],
			['action3', jest.fn()],
		]),
		options: {},
	};
	let baseChannel: BaseChannel;

	beforeEach(() => {
		// Act
		baseChannel = new MyChannel(params.logger, params.namespace, params.events, params.endpoints);
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(baseChannel.namespace).toBe(params.namespace);
			expect(baseChannel.endpointsList).toEqual([...params.endpoints.keys()]);
		});
	});

	describe('getters', () => {
		it('base.endpointList should contain list of endpoints', () => {
			expect(Object.keys(baseChannel.endpointsList)).toHaveLength(3);
			baseChannel.endpointsList.forEach(endpoint => {
				expect(typeof endpoint).toBe('string');
			});
		});

		it('base.eventsList be list of events', () => {
			expect(baseChannel.eventsList).toHaveLength(params.events.length);
			baseChannel.eventsList.forEach(event => {
				expect(typeof event).toBe('string');
			});
		});

		it('base.eventsList should contain internal events when skipInternalEvents option was set to FALSE', () => {
			// Arrange & Act
			baseChannel = new MyChannel(params.logger, params.namespace, params.events, params.endpoints);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(params.events.length);
		});

		it('base.eventsList must NOT contain internal events when skipInternalEvents option was set TRUE', () => {
			// Arrange & Act
			baseChannel = new MyChannel(params.logger, params.namespace, params.events, params.endpoints);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(params.events.length);
		});
	});

	describe('#isValidEventName', () => {
		// Arrange
		const eventName = params.events[0];

		it('should return false when invalid event name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidEventName(eventName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidEventName(eventName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(baseChannel.isValidEventName(`${params.namespace}_${eventName}`)).toBe(true);
		});
	});

	describe('#isValidActionName', () => {
		// Arrange
		const actionName = 'actionName';

		it('should return false when invalid action name was provided', () => {
			//  Act & Assert
			expect(baseChannel.isValidActionName(actionName, false)).toBe(false);
		});

		it('should throw error when throwError was set to `true`.', () => {
			// Act & Assert
			expect(() => baseChannel.isValidActionName(actionName)).toThrow();
		});

		it('should return true when valid event name was provided.', () => {
			// Act & Assert
			expect(baseChannel.isValidActionName(`${params.namespace}_${actionName}`)).toBe(true);
		});
	});
});
