![Lisk Logo](https://lisk.io/i/mediakit/logo_1.png)

# Lisk JSDoc Source code documentation

This is an ongoing process

## Syntax
### General
`@description <some description>`:
Can omit this tag if description is located at the beginning

### Membership
`@namespace [[{<type>}] <SomeName>]`:
an object creates a namespace for its members.

`@memberof <parentNamepath>`:
identifies a member symbol that belongs to a parent symbol.  
`@memberof! <parentNamepath>`:
 forces JSDoc to document a property of an object that is an instance member of a class.
[Examples](http://usejsdoc.org/tags-memberof.html#examples)

### Relational
`@implements {typeExpression}`:
a symbol implements an interface.

`@interface [<name>]`:
marks a symbol as an interface that other symbols can implement.

`@external <NameOfExternal>`:
identifies a class, namespace, or module that is defined outside of the current package.
`@see <text|namepath>` to add a link

### Entities
`@class [<type> <name>]`:
marks a function as being a constructor, meant to be called with the new keyword to return an instance.

`@function [<FunctionName>]`:
marks an object as being a function, even though it may not appear to be one to the parser

`@module [[{<type>}] module:<moduleName>]`:
marks the current file as being its own module. All symbols in the file are assumed to be members of the module unless documented otherwise.

`@static`:
symbol is contained within a parent and can be accessed without instantiating the parent.

#### Symbols, Parameters, Variables
`@type {typeName}`:
allows you to provide a type expression identifying the type of value that a symbol may contain, or the type of value returned by a function.
[examples](http://usejsdoc.org/tags-type.html)

`@typedef [<type>] <namepath>`:
custom types, particularly if you wish to refer to them repeatedly.

`@private | @public | @protected`:
* public: JSDoc treats all symbols as public
* proceted: a symbol is only available, or should only be used, within the current module.

`@inner vs @global`:

### Beavior
`@param {type} name - description`:
name, type, and description of a function parameter.
[examples](http://usejsdoc.org/tags-param.html)

`@returns`:

`@callback`:
callback function that can be passed to other functions.

`@throws {<type>} free-form description`:
an error that a function might throw.

### Events
`@event <className>#[event:]<eventName>`:

`@listens <eventName>`:
 indicates that a symbol listens for the specified event.

`@fires <className>#[event:]<eventName>`:

`@mixin`:
This provides methods used for event handling

## Examples

#### document namespaces

``` js
/** @namespace */
hgm = {};

/** @namespace */
hgm.cookie = {
    /** describe me */
    get: function (name) {  },

    /** describe me */
    set: function (name, value) {  },

    /** describe me */
    remove: function (name) {  }
};
```

#### Documenting large apps, group modules into categories

> This is to represent and explore functional behavior.

Example: Account module is composed by:
* api
* modules
* logic
* schema
* helpers

``` js
/**Parent module
* @module package-name
*/

/**Child of the parent module
* @namespace firstChild
* @memberof module:package-name
*/
```

#### ToDO

- [ ] JSDoc template
- [ ] Markdown plugin
- [ ] Use categories tag: `@categories`
- [ ] Patterns examples
- [ ] More Lisk examples: callback, throws, class, nested objects
- [ ] JSDoc tutorials for best practices