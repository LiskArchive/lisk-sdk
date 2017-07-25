module.exports = {
/**
 * @method trimObj
 * @param obj
 *
 * @return trimmed string
 */
	trimObj: function trimObj(obj) {
		if (!Array.isArray(obj) && typeof obj !== 'object') return obj;

		return Object.keys(obj).reduce((acc, key) => {
			acc[key.trim()] = typeof obj[key] === 'string'
				? obj[key].trim()
				: Number.isInteger(obj[key])
					? obj[key].toString()
					: trimObj(obj[key]);
			return acc;
		}, Array.isArray(obj) ? [] : {});
	},
	/**
	 * @method toQueryString
	 * @param obj
	 *
	 * @return query string
	 */
	toQueryString(obj) {
		const parts = [];

		for (const i in obj) {
			if (obj.hasOwnProperty(i)) {
				parts.push(`${encodeURIComponent(i)}=${encodeURI(obj[i])}`);
			}
		}

		return parts.join('&');
	},

	/**
	 * Extend a JavaScript object with the key/value pairs of another.
	 * @method extend
	 * @param obj
	 * @param src
	 *
	 * @return obj Object
	 */
	extend(obj, src) {
		// clone settings
		const cloneObj = JSON.parse(JSON.stringify(obj));
		Object.keys(src).forEach((key) => { cloneObj[key] = src[key]; });
		return cloneObj;
	},
};
