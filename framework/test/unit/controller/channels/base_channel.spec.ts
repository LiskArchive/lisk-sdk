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

jest.mock('../../../../src/controller/action');

// eslint-disable-next-line import/first
import { EventCallback } from '../../../../src/controller/event';
// eslint-disable-next-line import/first
import { BaseChannel } from '../../../../src/controller/channels';
// eslint-disable-next-line import/first
import { INTERNAL_EVENTS } from '../../../../src/constants';
// eslint-disable-next-line import/first
import { Action } from '../../../../src/controller/action';

class MyChannel extends BaseChannel {
	public once(_eventName: string, _cb: EventCallback): void {}
	public subscribe(_eventName: string, _cb: EventCallback): void {}
	public publish(_eventName: string, _data: object): void {}
	public async registerToBus(_arg: any): Promise<void> {}
	public async invoke<T>(_actionName: string, _params?: object): Promise<T> {
		return {} as T;
	}
}

describe('Base Channel', () => {
	// Arrange
	const actionHandler = jest.fn();
	const params = {
		moduleAlias: 'alias',
		events: ['event1', 'event2'],
		actions: {
			action1: actionHandler,
			action2: actionHandler,
			action3: actionHandler,
		},
		options: {},
	};
	let baseChannel: BaseChannel;

	beforeEach(() => {
		// Act
		baseChannel = new MyChannel(params.moduleAlias, params.events, params.actions, params.options);
	});

	describe('#constructor', () => {
		it('should create the instance with given arguments.', () => {
			// Assert
			expect(baseChannel['moduleAlias']).toBe(params.moduleAlias);
			expect(baseChannel['options']).toBe(params.options);

			Object.keys(params.actions).forEach(action => {
				expect(Action).toHaveBeenCalledWith(
					null,
					`${params.moduleAlias}:${action}`,
					undefined,
					actionHandler,
				);
			});
		});
	});

	describe('getters', () => {
		it('base.actions should contain list of Action Objects', () => {
			// Assert
			expect(Object.keys(baseChannel['actions'])).toHaveLength(3);
			Object.keys(baseChannel['actions']).forEach(action => {
				expect(baseChannel['actions'][action]).toBeInstanceOf(Action);
			});
		});

		it('base.actionList should contain list of actions', () => {
			// Assert
			expect(baseChannel.actionsList).toHaveLength(3);
			baseChannel.actionsList.forEach(action => {
				expect(typeof action).toBe('string');
			});
		});

		it('base.eventsList be list of events', () => {
			// Arrange & Act
			baseChannel = new MyChannel(params.moduleAlias, params.events, params.actions);

			// Assert
			expect(baseChannel.eventsList).toHaveLength(params.events.length + INTERNAL_EVENTS.length);
			baseChannel.eventsList.forEach(event => {
				expect(typeof event).toBe('string');
			});
		});

		it('base.eventsList should contain internal events when skipInternalEvents option was set to FALSE', () => {
			// Arrange & Act
			baseChannel = new MyChannel(params.moduleAlias, params.events, params.actions, {
				skipInternalEvents: false,
			});

			// Assert
			expect(baseChannel.eventsList).toHaveLength(params.events.length + INTERNAL_EVENTS.length);
		});

		it('base.eventsList must NOT contain internal events when skipInternalEvents option was set TRUE', () => {
			// Arrange & Act
			baseChannel = new MyChannel(params.moduleAlias, params.events, params.actions, {
				skipInternalEvents: true,
			});

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
			expect(baseChannel.isValidEventName(`${params.moduleAlias}:${eventName}`)).toBe(true);
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
			expect(baseChannel.isValidActionName(`${params.moduleAlias}:${actionName}`)).toBe(true);
		});
	});
});
