import { GeneratorOptions } from 'yeoman-generator';

export interface InitPrompts {
	name: string;
	description: string;
	author: string;
	license: string;
}

export interface BootstrapGeneratorOptions extends GeneratorOptions {
	template: string;
	version: string;
}
