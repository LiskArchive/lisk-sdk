afterEach(function globalAfterEach() {
	const { vorpal } = this.test.ctx;
	// See https://github.com/dthree/vorpal/issues/230
	if (vorpal && vorpal.ui) {
		vorpal.ui.removeAllListeners();
	}

	sandbox.restore();
});
