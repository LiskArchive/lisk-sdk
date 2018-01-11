import lockfile from 'lockfile';

afterEach(function globalAfterEach() {
	const { vorpal } = this.test.ctx;
	// See https://github.com/dthree/vorpal/issues/230
	// istanbul ignore next
	if (vorpal && vorpal.ui) {
		vorpal.ui.removeAllListeners();
	}

	sandbox.restore();
});

after(() => {
	const configLockfilePath = `${process.env.LISKY_CONFIG_DIR}/config.lock`;
	lockfile.unlock(configLockfilePath);
});
