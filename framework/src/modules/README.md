## Modules

Modules are individual building blocks for the lisk. The implementation of each module is up-to user but it must inherit from base module and implement the methods.

```js
// Exported as main file to javascript package
export default class MyModule extends BaseModule {
	/**
	*
 	* @param {Object} options - An object of module options
	*/
	constructor(options) {
	 super(options);
	}

	/**
	 * A unique module name accessed through out the system.
	 * If some module already registered with same alias, it will throw error
	 */
	static get alias(){ return 'moduleAlias'; },

	/**
	 * Package detail referring the version and other details
	 * Easiest way is to directly refer to package.json for all details
	 */

	static get info(){
		return {
			author: '',
			version: '',
			name: '',
			};
	},

	/**
	 * Supported configurations for the module with default values
	 */

	get defaults() { return {}; },

	/**
	 * List of valid events which this module want to register with the controller
	 * Each event name will be prefixed by module alias, e.g. moduleName:event1
	 * Listing event means to register a valid event in the eco-system
	 * Any module can subscribe or publish that event in the eco-system
	 */

	get events() { return []; },

	/**
	 * Object of valid actions which this module want to register with the controller
	 * Each action name will be prefixed by module alias, e.g. moduleName:action1
	 * Action definition can be provided on module load with the help of the channels
	 * Source module can define the action while others can invoke that action
	 */

	get actions() {
		return {
			action1: action => {},
		}
	},

	/**
	 * Method which will be invoked by controller to load the module
	 * make sure all loading logic get completed during the life cycle of load.
	 * Controller emit an event `lisk:ready` which you can use to perform
	 * some activities which you want to perform when every other module is loaded
	 *
	 * @param {Channel} channel - An interface to channel
	 * @return {Promise<void>}
	 */
	async load(channel){ },

	/**
	 * Method to be invoked by controller to perform the cleanup
	 *
	 * @return {Promise<void>}
	 */
	async unload() {},
};
```

### Module Life Cycle

Module life cycle consists of following events in the right order:

**Loading**

* _module_:registeredToBus
* _module_:loading:started
* _module_:loading:finished

**Unloading**

* _module_:unloading:started
* _module_:unloading:finished
