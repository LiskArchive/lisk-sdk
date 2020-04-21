import lockfile from 'lockfile';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as sandbox from 'sinon';

// eslint-disable-next-line mocha/no-top-level-hooks
afterEach(() => sandbox.restore());

// eslint-disable-next-line mocha/no-top-level-hooks
after(() => {
	// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
	const configLockfilePath = `${process.env.LISK_COMMANDER_CONFIG_DIR}/config.lock`;

	return lockfile.unlockSync(configLockfilePath);
});
