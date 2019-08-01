'use strict';

describe('integration test (delegates) - synchronous tasks', () => {
	describe('when events are emitted after any of synchronous task starts', () => {
		describe('when "attempt to forge" synchronous task runs every 100 ms and takes 101 ms', () => {
			describe('when "blockchain synchronization" synchronous task runs every 100 ms and takes 101 ms', () => {
				describe('within 5000 ms', () => {
					it.todo(
						'should never execute "attempt to forge" task when "blockchain synchronization" task is running'
					);

					it.todo(
						'should never execute "blockchain synchronization" task when "attempt to forge" task is already running'
					);
				});
			});
		});
	});
});
