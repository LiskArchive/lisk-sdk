/* eslint-disable mocha/no-pending-tests */

describe('__subscribeToEvent()', () => {
	it(
		'should subscribe to "blocks:change" on channel and emit "blocks/change" event on wsServer with proper data'
	);
	it(
		'should subscribe to "signature:change" on channel and emit "signature/change" event on wsServer with proper data'
	);
	it(
		'should subscribe to "transactions:change" on channel and emit "transactions/change" event on wsServer with proper data'
	);
	it(
		'should subscribe to "rounds:change" on channel and emit "rounds/change" event on wsServer with proper data'
	);
	it(
		'should subscribe to "multisignatures:signature:change" on channel and emit "multisignatures/signature/change" event on wsServer with proper data'
	);
	it(
		'should subscribe to "delegates:fork" on channel and emit "delegates/fork" event on wsServer with proper data'
	);
	it(
		'should subscribe to "loader:sync" on channel and emit "loader/sync" event on wsServer with proper data'
	);
});
