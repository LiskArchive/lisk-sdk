const changeCase = require('change-case');

module.exports = async modules => {
	const Bus = function() {
		this.message = function(...args) {
			const topic = args.shift();
			const eventName = `on${changeCase.pascalCase(topic)}`;

			// Iterate over modules and execute event functions (on*)
			Object.keys(modules).forEach(key => {
				const module = modules[key];

				if (typeof module[eventName] === 'function') {
					module[eventName].apply(module[eventName], args);
				}

				if (module.submodules) {
					module.submodules.forEach(submodule => {
						if (submodule && typeof submodule[eventName] === 'function') {
							submodule[eventName].apply(submodule[eventName], args);
						}
					});
				}
			});
		};
	};

	return new Bus();
};
