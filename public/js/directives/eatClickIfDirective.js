require('angular');
angular.module('liskApp').directive('eatClickIf', ['$parse', '$rootScope',
    function ($parse, $rootScope) {
        return {
            // This ensures eatClickIf is compiled before ngClick
            priority: 100,
            restrict: 'A',
            compile: function ($element, attr) {
                var fn = $parse(attr.eatClickIf);
                return {
                    pre: function link(scope, element) {
                        var eventName = 'click';
                        element.on(eventName, function (event) {
                            var callback = function () {
                                if (fn(scope, {$event: event})) {
                                    // Prevents ng-click from being executed
                                    event.stopImmediatePropagation();
                                    // Prevents href
                                    event.preventDefault();
                                    return false;
                                }
                            };
                            if ($rootScope.$$phase) {
                                scope.$evalAsync(callback);
                            } else {
                                scope.$apply(callback);
                            }
                        });
                    },
                    post: function () {}
                }
            }
        }
    }
]);
