/* eslint-disable mocha/no-top-level-hooks */
/* eslint-disable import/no-extraneous-dependencies */
import lockfile from 'lockfile';

afterEach(() => {
	return sandbox.restore();
});

after(() => {
	const configLockfilePath = `${
		process.env.LISK_COMMANDER_CONFIG_DIR
	}/config.lock`;
	return lockfile.unlockSync(configLockfilePath);
});
