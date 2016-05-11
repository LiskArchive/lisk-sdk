var Validator = require('./validator/validator.js');
var extend = require('extend');
var inherits = require('util').inherits;

module.exports = RequestSanitizer;

function RequestSanitizer(options) {
    Validator.call(this, options);
}

inherits(RequestSanitizer, Validator);

RequestSanitizer.prototype.rules = {};
extend(RequestSanitizer, Validator);

RequestSanitizer.options = extend({
    reporter : SanitizeReporter
}, Validator.options);

RequestSanitizer.addRule("empty", {
    validate : function(accept, value, field) {
        if (accept !== false) return;

        return !field.isEmpty();
    }
});

RequestSanitizer.addRule("string", {
    filter : function(accept, value, field){
        if (field.isEmpty() && field.rules.empty) return null;

        return String(value||'');
    }
});

RequestSanitizer.addRule("regexp", {
    message : "value should match template",
    validate : function(accept, value) {
        if (typeof value !== 'string') return false;

        return accept.test(value);
    }
});

RequestSanitizer.addRule("boolean", {
    filter : function(accept, value, field){
        if (field.isEmpty() && field.rules.empty) return null;

        switch(String(value).toLowerCase()) {
            case "false":
            case "f":
                return false;
            default:
                return !!value;
        }
    }
});

RequestSanitizer.addRule("int", {
    filter : function(accept, value , field) {
        if (field.isEmpty() && field.rules.empty) return null;

		if (isNaN(value) || parseInt(value) != value || isNaN(parseInt(value, 10))) {
			return 0;
		}

		return parseInt(value);
    }
});

RequestSanitizer.addRule("float", {
    filter : function(accept, value , field) {
        if (field.isEmpty() && field.rules.empty) return null;

        value = parseFloat(value);

        return isNaN(value) ? 0 : value;
    }
});

RequestSanitizer.addRule("object", {
    filter : function(accept, value , field) {
        if (field.isEmpty() && field.rules.empty) return null;

       return Object.prototype.toString.call(value) == "[object Object]" ? value : {};
    }
});

RequestSanitizer.addRule("array", {
    filter: function (accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return null;

        if (typeof value === "string" && (typeof accept === "string" || accept instanceof RegExp )) {
            return value.length ? value.split(accept) : [];
        } else if (Array.isArray(value)) {
            return value;
        } else {
            return [];
        }
    }
});

RequestSanitizer.addRule("arrayOf", {
    validate : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return null;
        if (! Array.isArray(value)) return false;

        var l = value.length;
        var i = -1;
        var child;

        while (++i < l) {
            field.child(i, value[i], accept, value).validate();
        }
    }
});

RequestSanitizer.addRule("hex", {
    filter : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return null;

        return value;
    },
    validate : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return;

        return /^([A-Fa-f0-9]{2})*$/.test(String(value||''));
    }
});

RequestSanitizer.addRule("buffer", {
    filter : function(accept, value) {
        if (typeof accept !== "string") {
            accept = 'utf8';
        }

        try {
            return new Buffer(value||'', accept);
        } catch (err) {
            return new Buffer();
        }
    }
});

RequestSanitizer.addRule("variant", {
    filter : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return null;

        return typeof value === 'undefined' ? '' : value;
    }
});

RequestSanitizer.addRule("required", {
    message : "value is required",
    validate : function(accept, value) {
        return (typeof value !== 'undefined') == accept;
    }
});

RequestSanitizer.addRule("default", {
    filter : function(accept, value) {
        return (typeof value === 'undefined') ? accept : value;
    }
});

RequestSanitizer.addRule("properties", {
    validate : function(accept, value, field) {
        if (! field.isObject()) return false;

        Object.getOwnPropertyNames(accept).forEach(function(name){
            var childAccept = accept[name];
            if (typeof childAccept === "string") {
                childAccept = convertStringRule(childAccept);
            }
            var child = field.child(name, value[name], childAccept, value);
            child.validate(function(err, report, output){
                if (err) throw err;

                value[name] = output;
            });
        });
    }
});

RequestSanitizer.addRule("minLength", {
    message : "minimum length is ${accept}.",
    validate : function(accept, value) {
        return value.length >= accept;
    }
});

RequestSanitizer.addRule("case", {
    message : "case is ${accept}.",
    validate : function(accept, value) {
        return typeof value === "string" && ((accept==="lower" && value===value.toLowerCase())||(accept==="upper" && value===value.toUpperCase()));
    },
    filter : function(accept, value, field){
        if (field.isEmpty() && field.rules.empty) return null;

        if(accept==="lower"){
          return String(value||'').toLowerCase();
        }
        else if(accept==="upper"){
          return String(value||'').toUpperCase();
        }
    }
});

RequestSanitizer.addRule("maxLength", {
    message : "maximum length is ${accept}.",
    validate : function(accept, value) {
        return value.length <= accept;
    }
});

RequestSanitizer.addRule("maxByteLength", {
    message : "maximum size is ${accept.length} bytes",
    accept : function(accept){
        if (typeof accept !== "object") {
            accept = {
                encoding : 'utf8',
                length : accept
            };
        }
        return accept;
    },
    validate : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return;

        if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
        }


        return Buffer.byteLength(value, 'utf8') <= accept.length;
    }
});

RequestSanitizer.addRule("minByteLength", {
    message : "minimum size is ${accept.length} bytes",
    accept : function(accept){
        if (typeof accept !== "object") {
            accept = {
                encoding : 'utf8',
                length : accept
            };
        }

        return accept;
    },
    validate : function(accept, value, field) {
        if (field.isEmpty() && field.rules.empty) return;

        if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
        }
        return Buffer.byteLength(value, 'utf8') >= accept.length;
    }
});

/**
 * Express middleware factory
 * @param {Object} options Validator constructor options
 * @returns {Function} Express middleware
 */
RequestSanitizer.express = function(options) {
    options = extend({}, RequestSanitizer.options, options);


    return function(req, res, next) {
        req.sanitize = sanitize;

        function sanitize(value, properties, callback) {
            var values = {};
            if (typeof value === "string") {
                value = req[value] || {};
            }

            Object.getOwnPropertyNames(properties).forEach(function(name){
                values[name] = value.hasOwnProperty(name) ? value[name] : undefined;
                if (typeof properties[name] === "string") {
                    properties[name] = convertStringRule(properties[name]);
                }
            });

            return (new RequestSanitizer(options)).validate(values, {properties:properties}, callback);
        }

        next();
    };
};

// Define filter rules as standalone methods
var rules = RequestSanitizer.prototype.rules;
[
    'string',
    'boolean',
    'int',
    'float',
    'variant',
    'array',
    'object',
    'hex',
    'buffer'
].forEach(function(name){
    var rule = rules[name];
    if (typeof rule.filter !== 'function') return;
    if (name in RequestSanitizer) return;

    RequestSanitizer[name] = function filter(value, extra) {
        var rules = {};
        if (typeof extra === "object") {
            extend(rules, extra);
        } else if (typeof extra !== 'undefined') {
            rules.empty = extra;
        }

        rules[name] = true;

        var report = (new RequestSanitizer(RequestSanitizer.options)).validate(value, rules);
        if (! report.isValid) {
            var error = new Error(report.issues);
            error.name = 'ValidationError';
            error.issues = report.issues;
            throw error;
        }

        return report.value;
    };
});

RequestSanitizer.options.reporter = SanitizeReporter;

function SanitizeReporter(validator) {
    this.validator = validator;
}

SanitizeReporter.prototype.format = function(message, values) {
    return String(message).replace(/\$\{([^}]+)}/g, function(match, id) {
        return getByPath(values, id.split('.')) || '';
    });
};

SanitizeReporter.prototype.convert = function(issues) {
    var self = this;

    var grouped = issues.reduce(function(result, item){
        var path = item.path.join('.');
        if (path in result === false) result[path] = [];

        result[path].push(item);

        return result;
    }, {});

    var result = "";

    Object.getOwnPropertyNames(grouped).forEach(function(path){
        result += "Property \"" + path + "\":\n";

        grouped[path].forEach(function(item){
            var rule = self.validator.getRule(item.rule);

            result += "\t- ";

            if (rule.hasOwnProperty('message')) {
                result += self.format(rule.message, item) + "\n";
            } else {
                result += "break rule \"" + item.rule + "\"\n";
            }
        });
    });

    return result;
};

function getByPath(target, path) {
    var segment;
    path = path.slice();
    var i = -1;
    var l = path.length - 1;
    while (++i < l) {
        segment = path[i];
        if (typeof target[segment] !== 'object') {
            return null;
        }

        target = target[segment];
    }

    return target[path[l]];
}

function convertStringRule(rule) {
    var result = {};

    if (rule.charAt(rule.length-1) === "!") {
        result.required = true;
        rule = rule.slice(0, -1);
    } else if (rule.charAt(rule.length-1) === "?") {
        result.empty = true;
        rule = rule.slice(0, -1);
    }

    result[rule] = true;
    return result;
}
