const {
	INTERNAL_EVENTS,
} = require('../../../../../../../src/controller/channels/base/constants');

describe('base/constants.js', () => {
	it('INTERNAL_EVENTS must match to the snapshot.', () => {
		expect(INTERNAL_EVENTS).toMatchSnapshot();
	});

	it('INTERNAL_EVENTS array should be immutable', () => {
		expect(() => INTERNAL_EVENTS.push('test')).toThrow(TypeError);
		expect(() => INTERNAL_EVENTS.pop()).toThrow(TypeError);
	});
});
