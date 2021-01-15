import { GeneratorConstructor, GeneratorOptions } from 'yeoman-generator';

export interface BootstrapGeneratorOptions extends GeneratorOptions {
	template: string;
	version: string;
	projectPath?: string;
}

export interface LiskTemplate {
	generators: {
		init: GeneratorConstructor;
		module: GeneratorConstructor;
		asset: GeneratorConstructor;
		plugin: GeneratorConstructor;
	};
}
