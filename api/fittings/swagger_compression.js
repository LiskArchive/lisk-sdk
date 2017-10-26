var compression = require('compression');


module.exports = function create(fittingDef, bagpipes) {
	var middleware = compression(fittingDef);
	
	return function compression(context, cb) {
		middleware(context.request, context.response, cb);
	}
};