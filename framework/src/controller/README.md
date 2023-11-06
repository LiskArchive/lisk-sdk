# Controller

The controller is responsible for initialization the communication bus and any other dependencies required to load the plugins. If any plugin is configured to load as a child process, then it is the controller's responsibility to do so.
The controller defines a set of events, that each component can subscribe to:

### Default Events & Actions

The following events and actions are available for all enabled plugins and are at the same time accessible by all enabled plugins.

#### Actions

Most of the data flow will be handled through the propagation of such events.
Each plugin can also define its own custom events or actions and will register that list with the controller at the time of initialization.
The controller contains a complete list of events that may occur in the plugins of the Lisk Framework at any given time.
