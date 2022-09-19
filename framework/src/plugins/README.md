# Plugins

### Table of contents

- [Description](#description)
  - [Custom Plugins](#custom-plugins)
- [Plugin Communication](#plugin-communication)
  - [InMemory Channel](#inmemory-channel)
  - [ChildProcess Channel](#childprocess-channel)
- [Plugin Lifecycle](#plugin-life-cycle)

## Description

Plugins define an off-chain logic which are not part of the blockchain protocol, but which enhance the application features.

### Custom Plugins

> The implementation of each plugin is up-to user but it must inherit from `BasePlugin` class and implement its methods.

Custom Plugin can be plugged into Lisk Framework and may offer new features/capabilities for the application.
They extend the existing instance with a specific (and circumscribed) set of features.

```js
// Exported as main file to javascript package
export class MyPlugin extends BasePlugin {
    /**
    * Constructor of the plugin.
    *
     * @param {Object} options - An object of plugin options
    */
    constructor(options) {
     super(options);
    }

    /**
    * Required.
    *
    * Package meta information.
    *
    * @return {Object} info - JSON object referring the version, plugin name, and plugin author.
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
    * Method which will be invoked by controller to load the plugin.
    * Make sure all loading logic get completed during the life cycle of load.
    * Controller emit an event `app_ready` which you can use to perform
    * some activities which you want to perform when every other plugin is loaded.
    *
    * @param {Channel} channel - An instance of a communication channel.
    * @return {Promise<void>}
    */
    async load(channel) {},


    /**
     * Supported configurations for the plugin with default values.
     *
     * @return {Object} defaults - JSON object with default options for the plugin.
     */
    get defaults() { return {}; },

    /**
     * List of valid events which this plugin wants to register with the controller.
     * Each event name will be prefixed by plugin name, e.g. pluginName_event1.
     * Listing an event means to register the event in the application.
     * Any plugin can subscribe or publish that event in the application.
     *
     * @return {Array} events - String Array of events.
     */
    get events() { return []; },

    /**
     * Object of valid actions which this plugin want to register with the controller.
     * Each action name will be prefixed by plugin name, e.g. pluginName_action1.
     * Source plugin can define the action while others can invoke that action.
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

## Plugin Communication

Plugins communicate with each other through event-based channels.
Plugins running in different processes communicate with each other over IPC channels.

### InMemory Channel

Communicates with plugins which reside in the same process as the [controller](../controller/README.md).

By default, plugins will load in the same process as the controller.

### Child Process Channel

Communicates with plugins which do not reside in the same process as the Controller.

To load a plugin as a child process, make sure you have `ipc` enabled in the config file and set the option `loadAsChildProcess: true` when registering the plugin using the Application method `registerPlugin`.

Currently, the only Lisk native plugin supported is HTTP Method plugin which will be loaded as child process if you have `ipc` enabled.
