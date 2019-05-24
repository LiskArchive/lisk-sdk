# Controller

The controller is responsible for initialization the communication bus and any other dependencies required to load the modules. If any module is configured to load as a child process, then it is the controller's responsibility to do so.
The controller defines a set of events, that each component can subscribe to:

### Default Events & Actions

The following events and actions are available for all enabled modules and are at the same time accessible by all enabled modules.

#### Events

| Event                       | Description                                                                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _module_:registeredToBus    | Triggered when the module has completed registering its events and actions with the controller. So when this event is triggered, the subscriber of the event can be sure that the controller has whitelisted its requested events and actions. |
| _module_:loading:started    | Triggered just before the controller calls the module’s `load` method.                                                                                                                                                                         |
| _module_:loading:error      | Triggered if any error occurred during the call of the module's `load` method.                                                                                                                                                                 |
| _module_:loading:finished   | Triggered just after the module’s `load` method has completed execution.                                                                                                                                                                       |
| _module_:unloading:started  | Triggered just before the controller calls the module’s `unload` method.                                                                                                                                                                       |
| _module_:unloading:error    | Triggered if any error occurred during the call of module’s `unload` method.                                                                                                                                                                   |
| _module_:unloading:finished | Triggered just after the module’s `unload` method has completed execution.                                                                                                                                                                     |
| app:ready                   | Triggered when the controller has finished initializing the modules and each module has been successfully loaded.                                                                                                                              |

#### Actions

| Action                 | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| app:getComponentConfig | A controller action to get the configuration of any component defined in controller space. |

Most of the data flow will be handled through the propagation of such events.
Each module can also define its own custom events or actions and will register that list with the controller at the time of initialization.
The controller contains a complete list of events which may occur in the modules of Lisk Core at any given time.
