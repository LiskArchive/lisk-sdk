import lockfile from 'lockfile';

/* eslint-disable mocha/no-top-level-hooks */
afterEach(function globalAfterEach(done) {
	const { vorpal } = this.test.ctx;
	// See https://github.com/dthree/vorpal/issues/230
	// istanbul ignore next
	if (vorpal && vorpal.ui) {
		vorpal.ui.removeAllListeners();
	}

	sandbox.restore();
	done();
});

after(done => {
	const configLockfilePath = `${process.env.LISKY_CONFIG_DIR}/config.lock`;
	lockfile.unlock(configLockfilePath, done);
});
/* eslint-enable mocha/no-top-level-hooks */
