# Modules

### Table of contents

* [Description](#description)
  * [Core Modules](#core-modules)
  * [Custom Modules](#custom-modules)
* [Module Communication](#module-communication)
  * [InMemory Channel](#inmemory-channel)
  * [ChildProcess Channel](#childprocess-channel)
* [Module Lifecycle](#module-life-cycle)

## Description

Modules are individual building blocks for Lisk Core.

### Core Modules

Core Modules are shipped along with the Lisk Core distribution itself. These modules constitute the minimum requirements to run a functional Lisk Core instance.

#### List of Core Modules

* **Chain Module:** handles all events and actions, that are related to the blockchain system.
* **HTTP API Module:** provides API endpoints, that enable users and other programs to communicate with the Lisk blockchain through the API.

### Custom Modules

> The implementation of each module is up-to user but it must inherit from `BaseModule` class and implement its methods.

Custom Modules can be plugged into Lisk Core and may offer new features/capabilities for the application, or replace Core modules functionalities.
They extend the existing instance with a specific (and circumscribed) set of features.

```js
// Exported as main file to javascript package
export default class MyModule extends BaseModule {
    /**
    * Constructor of the module.
    *
     * @param {Object} options - An object of module options
    */
    constructor(options) {
     super(options);
    }

    /**
    * Required.
    *
    * A unique module identifier, that can be accessed through out the system.
    * If some module already registered with the same alias, it will throw an error.
    *
    * @return {string} alias - Return the module alias as string.
    * */
    static get alias(){ return 'moduleAlias'; },

    /**
    * Required.
    *
    * Package meta information.
    *
    * @return {Object} info - JSON object referring the version, module name and module author.  
    */
    static get info(){
        return {
            author: '',
            version: '',
            name: '',
            };
    },

    /**
    * Required.
    *
    * Method which will be invoked by controller to load the module.
    * Make sure all loading logic get completed during the life cycle of load.
    * Controller emit an event `lisk:ready` which you can use to perform
    * some activities which you want to perform when every other module is loaded.
    *
    * @param {Channel} channel - An instance of a communication channel.
    * @return {Promise<void>}
    */
    async load(channel) {},


    /**
     * Supported configurations for the module with default values.
     *
     * @return {Object} defaults - JSON object with default options for the module.
     */
    get defaults() { return {}; },

    /**
     * List of valid events which this module wants to register with the controller.
     * Each event name will be prefixed by module alias, e.g. moduleName:event1.
     * Listing an event means to register the event in the application.
     * Any module can subscribe or publish that event in the application.
     *
     * @return {Array} events - String Array of events.
     */
    get events() { return []; },

    /**
     * Object of valid actions which this module want to register with the controller.
     * Each action name will be prefixed by module alias, e.g. moduleName:action1.
     * Source module can define the action while others can invoke that action.
     *
     * @return {Object} actions - Contains all available action names as key, and the corresponding function as value.
     */
    get actions() {
        return {
            action1: action => {},
        }
    },

    /**
     * Method to be invoked by controller to perform the cleanup.
     *
     * @return {Promise<void>}
     */
    async unload() {},
};
```

## Module Communication

Modules communicate with each other through event-based channels.
Modules running in different processes communicate with each other over IPC channels.

### InMemory Channel

Communicates with modules which reside in the same process as the [controller](../controller/README.md).

By default, modules will load in the same process as the controller.

### Child Process Channel

Communicates with modules which do not reside in the same process as the Controller.

To load a module in a child process, make sure you have `ipc` enabled in the config file and set the environment variable `LISK_CHILD_PROCESS_MODULES` with the module alias. Multiple modules can be defined by using commas like `LISK_CHILD_PROCESS_MODULES=httpApi,chain`.

## Module Life Cycle

The controller will load/unload each module one after another.
A modules' life cycle consists of following events in the right order:

**Loading**

* _module_:registeredToBus
* _module_:loading:started
* _module_:loading:finished

**Unloading**

* _module_:unloading:started
* _module_:unloading:finished
