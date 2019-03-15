# Modules

## Description

Modules are individual building blocks for Lisk Core.

### Core Modules

Core Modules are shipped along with the Lisk Core distribution itself. These modules constitute the minimum requirements to run a functional Lisk Core instance.

#### List of Core Modules

* **Chain Module:** The Chain Module takes care of all events and actions, that are related to the blockchain itself.
* **HTTP API Module:** The HTTP API Module provides API endpoints, that enable users and other programms to comunicate with the Lisk blockchain through the API.

### Custom Modules

> The implementation of each module is up-to user but it must inherit from base module and implement the methods.

Custom Modules can be plugged into Lisk Core and can be removed/disabled at any time.
They extend the existing instance with a specific (and circumscribed) set of features.
They can be distributed separately as [npm](https://www.npmjs.com/) packages.
In order to be able to communicate with Lisk Core in the intended way, it is needed to
To finally integrate the Module into Lisk Core, create a PR that incorporates the following:

1. Add the npm package which contains the module logic to the `dependencies` in `package.json`
2. Create a file `framework/src/modules/<MyModule>/index.js`, which exports a class of the module. The class must inherit from `BaseModule` parent class.
3. In `framework/src/modules/application` register your Module to the application: `this.registerModule(MyModule, options);`

> To view a list of already existing custom modules for Lisk Core, see xyz

### Base Module

The Base Module is the parent class for all modules of Lisk Core.

| Method                         | Description                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------- |
| **alias()** _(required)_       | Returns the module name.                                                      |
| **info()** _(required)_        | Returns meta information about the module.                                    |
| **load(channel)** _(required)_ | This method which will be invoked by a controller to load the module.         |
| **defaults()**                 | Supported configurations for the module with default values.                  |
| **events()**                   | List of valid events which this module wants to register with the controller. |
| **unload()**                   | Method to be invoked by controller to perform the cleanup.                    |

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
	async load(channel) {},

	/**
	 * Method to be invoked by controller to perform the cleanup
	 *
	 * @return {Promise<void>}
	 */
	async unload() {},
};
```

## Managing Modules

### Enable module

### Disable module

### Add module

### Remove module

### Create module

### Module Life Cycle

Module life cycle consists of following events in the right order:

**Loading**

* _module_:registeredToBus
* _module_:loading:started
* _module_:loading:finished

**Unloading**

* _module_:unloading:started
* _module_:unloading:finished
