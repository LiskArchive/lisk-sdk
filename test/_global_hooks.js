/* eslint-disable mocha/no-top-level-hooks */
import lockfile from 'lockfile';

afterEach(function globalAfterEach() {
	const { vorpal } = this.test.ctx;
	// See https://github.com/dthree/vorpal/issues/230
	// istanbul ignore next
	if (vorpal && vorpal.ui) {
		vorpal.ui.removeAllListeners();
	}

	return sandbox.restore();
});

after(() => {
	const configLockfilePath = `${
		process.env.LISK_COMMANDER_CONFIG_DIR
	}/config.lock`;
	return lockfile.unlockSync(configLockfilePath);
});
