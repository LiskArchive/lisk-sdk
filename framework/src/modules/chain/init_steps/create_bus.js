const changeCase = require('change-case');

module.exports = async () => {
	const Bus = function() {
		this.modules = null;

		this.registerModules = modules => {
			this.modules = modules;
		};

		this.message = function(...args) {
			const topic = args.shift();
			const eventName = `on${changeCase.pascalCase(topic)}`;

			// Iterate over modules and execute event functions (on*)
			Object.keys(this.modules).forEach(key => {
				const module = this.modules[key];

				if (typeof module[eventName] === 'function') {
					module[eventName].apply(module[eventName], args);
				}

				if (module.submodules) {
					Object.keys(module.submodules).forEach(subModuleKey => {
						const submodule = module.submodules[subModuleKey];

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
