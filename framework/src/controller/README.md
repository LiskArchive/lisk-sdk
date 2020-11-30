# Controller

The controller is responsible for initialization the communication bus and any other dependencies required to load the plugins. If any plugin is configured to load as a child process, then it is the controller's responsibility to do so.
The controller defines a set of events, that each component can subscribe to:

### Default Events & Actions

The following events and actions are available for all enabled plugins and are at the same time accessible by all enabled plugins.

#### Events

| Event                       | Description                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _plugin_:registeredToBus    | Triggered when the plugin has completed registering its events and actions with the controller. So when this event is triggered, the subscriber of the event can be sure that the controller has whitelisted its requested events and actions. |
| _plugin_:loading:started    | Triggered just before the controller calls the plugin’s `load` method.                                                                                                                                                                         |
| _plugin_:loading:finished   | Triggered just after the plugin’s `load` method has completed execution.                                                                                                                                                                       |
| _plugin_:unloading:started  | Triggered just before the controller calls the plugin’s `unload` method.                                                                                                                                                                       |
| _plugin_:unloading:error    | Triggered if any error occurred during the call of plugin’s `unload` method.                                                                                                                                                                   |
| _plugin_:unloading:finished | Triggered just after the plugin’s `unload` method has completed execution.                                                                                                                                                                     |
| app:ready                   | Triggered when the controller has finished initializing the plugins and each plugin has been successfully loaded.                                                                                                                              |

#### Actions

Most of the data flow will be handled through the propagation of such events.
Each plugin can also define its own custom events or actions and will register that list with the controller at the time of initialization.
The controller contains a complete list of events that may occur in the plugins of the Lisk Framework at any given time.
