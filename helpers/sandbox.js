function callMethod(shared, call, args, cb) {
	if (typeof shared[call] !== "function") {
		return cb("Function not found in module: " + call);
	}

	var callArgs = [args, cb];
	shared[call].apply(null, callArgs);
}

module.exports = {
	callMethod: callMethod
};
