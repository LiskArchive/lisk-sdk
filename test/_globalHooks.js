import os from 'os';
import lockfile from 'lockfile';

afterEach(function globalAfterEach() {
	const { vorpal } = this.test.ctx;
	// See https://github.com/dthree/vorpal/issues/230
	if (vorpal && vorpal.ui) {
		vorpal.ui.removeAllListeners();
	}

	sandbox.restore();
});

after(() => {
	const configLockfilePath = `${os.homedir()}/.lisky/config.lock`;
	lockfile.unlock(configLockfilePath);
});
