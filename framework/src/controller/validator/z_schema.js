const ZSchema = require('z-schema');
const formats = require('./formats');

// Register the formats
Object.keys(formats).forEach(formatName => {
	ZSchema.registerFormat(formatName, formats[formatName]);
});
ZSchema.formatsCache = formats;

module.exports = ZSchema;
