function callMethod(shared, call, args, cb) {
	if (typeof shared[call] !== "function") {
		return cb("This call not found in this module: " + call);
	}

	var callArgs = [args, cb];
	shared[call].apply(null, callArgs);
}

module.exports = {
	callMethod: callMethod
};
