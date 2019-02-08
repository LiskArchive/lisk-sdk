## Modules

Modules are individual building blocks for the lisk. The implementation of each module is up-to user but by default it should generate an object with this structure.

```js
// Exported as main file to javascript package
export default {
	/**
	 * A unique module name accessed through out the system.
	 * If some module already registered with same alias, it will throw error
	 */
	alias: 'moduleAlias',

	/**
	 * Package detail referring the version and other details
	 * Easiest way is to directly refer to package.json for all details
	 */

	info: {
		author: '',
		version: '',
		name: '',
	},

	/**
	 * Supported configurations for the module with default values
	 */

	defaults: {},

	/**
	 * List of valid events which this module want to register with the controller
	 * Each event name will be prefixed by module alias, e.g. moduleName:event1
	 * Listing event means to register a valid event in the eco-system
	 * Any module can subscribe or publish that event in the eco-system
	 */

	events: [],

	/**
	 * Object of valid actions which this module want to register with the controller
	 * Each action name will be prefixed by module alias, e.g. moduleName:action1
	 * Action definition can be provided on module load with the help of the channels
	 * Source module can define the action while others can invoke that action
	 */

	actions: {
		action1: action => {},
	},

	/**
	 * Method which will be invoked by controller to load the module
	 * make sure all loading logic get completed during the life cycle of load.
	 * Controller emit an event `lisk:ready` which you can use to perform
	 * some activities which you want to perform when every other module is loaded
	 *
	 * @param {Channel} channel - An interface to channel
	 * @param {Object} options - An object of module options
	 * @return {Promise<void>}
	 */
	load: async (channel, options) => {},

	/**
	 * Method to be invoked by controller to perform the cleanup
	 *
	 * @return {Promise<void>}
	 */
	unload: async () => {},
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
