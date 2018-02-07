/*
 * angular-ui-bootstrap
 * http://angular-ui.github.io/bootstrap/

 * Version: 0.13.0 - 2015-05-02
 * License: MIT
 */
angular.module("ui.bootstrap", ["ui.bootstrap.accordion", "ui.bootstrap.collapse", "ui.bootstrap.dropdown", "ui.bootstrap.position", "ui.bootstrap.modal", "ui.bootstrap.transition", "ui.bootstrap.tooltip", "ui.bootstrap.bindHtml"]), angular.module("ui.bootstrap.accordion", ["ui.bootstrap.collapse"]).constant("accordionConfig", {closeOthers: !0}).controller("AccordionController", ["$scope", "$attrs", "accordionConfig", function (e, t, n) {
    this.groups = [], this.closeOthers = function (o) {
        var i = angular.isDefined(t.closeOthers) ? e.$eval(t.closeOthers) : n.closeOthers;
        i && angular.forEach(this.groups, function (e) {
            e !== o && (e.isOpen = !1)
        })
    }, this.addGroup = function (e) {
        var t = this;
        this.groups.push(e), e.$on("$destroy", function () {
            t.removeGroup(e)
        })
    }, this.removeGroup = function (e) {
        var t = this.groups.indexOf(e);
        -1 !== t && this.groups.splice(t, 1)
    }
}]).directive("accordion", function () {
    return {
        restrict: "EA",
        controller: "AccordionController",
        transclude: !0,
        replace: !1,
        templateUrl: "template/accordion/accordion.html"
    }
}).directive("accordionGroup", function () {
    return {
        require: "^accordion",
        restrict: "EA",
        transclude: !0,
        replace: !0,
        templateUrl: "template/accordion/accordion-group.html",
        scope: {heading: "@", isOpen: "=?", isDisabled: "=?"},
        controller: function () {
            this.setHeading = function (e) {
                this.heading = e
            }
        },
        link: function (e, t, n, o) {
            o.addGroup(e), e.$watch("isOpen", function (t) {
                t && o.closeOthers(e)
            }), e.toggleOpen = function () {
                e.isDisabled || (e.isOpen = !e.isOpen)
            }
        }
    }
}).directive("accordionHeading", function () {
    return {
        restrict: "EA",
        transclude: !0,
        template: "",
        replace: !0,
        require: "^accordionGroup",
        link: function (e, t, n, o, i) {
            o.setHeading(i(e, angular.noop))
        }
    }
}).directive("accordionTransclude", function () {
    return {
        require: "^accordionGroup", link: function (e, t, n, o) {
            e.$watch(function () {
                return o[n.accordionTransclude]
            }, function (e) {
                e && (t.html(""), t.append(e))
            })
        }
    }
}), angular.module("ui.bootstrap.collapse", []).directive("collapse", ["$animate", function (e) {
    return {
        link: function (t, n, o) {
            function i() {
                n.removeClass("collapse").addClass("collapsing"), e.addClass(n, "in", {to: {height: n[0].scrollHeight + "px"}}).then(r)
            }

            function r() {
                n.removeClass("collapsing"), n.css({height: "auto"})
            }

            function a() {
                n.css({height: n[0].scrollHeight + "px"}).removeClass("collapse").addClass("collapsing"), e.removeClass(n, "in", {to: {height: "0"}}).then(l)
            }

            function l() {
                n.css({height: "0"}), n.removeClass("collapsing"), n.addClass("collapse")
            }

            t.$watch(o.collapse, function (e) {
                e ? a() : i()
            })
        }
    }
}]), angular.module("ui.bootstrap.dropdown", ["ui.bootstrap.position"]).constant("dropdownConfig", {openClass: "open"}).service("dropdownService", ["$document", "$rootScope", function (e, t) {
    var n = null;
    this.open = function (t) {
        n || (e.bind("click", o), e.bind("keydown", i)), n && n !== t && (n.isOpen = !1), n = t
    }, this.close = function (t) {
        n === t && (n = null, e.unbind("click", o), e.unbind("keydown", i))
    };
    var o = function (e) {
        if (n && (!e || "disabled" !== n.getAutoClose())) {
            var o = n.getToggleElement();
            if (!(e && o && o[0].contains(e.target))) {
                var i = n.getElement();
                e && "outsideClick" === n.getAutoClose() && i && i[0].contains(e.target) || (n.isOpen = !1, t.$$phase || n.$apply())
            }
        }
    }, i = function (e) {
        27 === e.which && (n.focusToggleElement(), o())
    }
}]).controller("DropdownController", ["$scope", "$attrs", "$parse", "dropdownConfig", "dropdownService", "$animate", "$position", "$document", function (e, t, n, o, i, r, a, l) {
    var c, s = this, u = e.$new(), p = o.openClass, d = angular.noop, f = t.onToggle ? n(t.onToggle) : angular.noop, m = !1;
    this.init = function (o) {
        s.$element = o, t.isOpen && (c = n(t.isOpen), d = c.assign, e.$watch(c, function (e) {
            u.isOpen = !!e
        })), m = angular.isDefined(t.dropdownAppendToBody), m && s.dropdownMenu && (l.find("body").append(s.dropdownMenu), o.on("$destroy", function () {
            s.dropdownMenu.remove()
        }))
    }, this.toggle = function (e) {
        return u.isOpen = arguments.length ? !!e : !u.isOpen
    }, this.isOpen = function () {
        return u.isOpen
    }, u.getToggleElement = function () {
        return s.toggleElement
    }, u.getAutoClose = function () {
        return t.autoClose || "always"
    }, u.getElement = function () {
        return s.$element
    }, u.focusToggleElement = function () {
        s.toggleElement && s.toggleElement[0].focus()
    }, u.$watch("isOpen", function (t, n) {
        if (m && s.dropdownMenu) {
            var o = a.positionElements(s.$element, s.dropdownMenu, "bottom-left", !0);
            s.dropdownMenu.css({top: o.top + "px", left: o.left + "px", display: t ? "block" : "none"})
        }
        r[t ? "addClass" : "removeClass"](s.$element, p), t ? (u.focusToggleElement(), i.open(u)) : i.close(u), d(e, t), angular.isDefined(t) && t !== n && f(e, {open: !!t})
    }), e.$on("$locationChangeSuccess", function () {
        u.isOpen = !1
    }), e.$on("$destroy", function () {
        u.$destroy()
    })
}]).directive("dropdown", function () {
    return {
        controller: "DropdownController", link: function (e, t, n, o) {
            o.init(t)
        }
    }
}).directive("dropdownMenu", function () {
    return {
        restrict: "AC", require: "?^dropdown", link: function (e, t, n, o) {
            o && (o.dropdownMenu = t)
        }
    }
}).directive("dropdownToggle", function () {
    return {
        require: "?^dropdown", link: function (e, t, n, o) {
            if (o) {
                o.toggleElement = t;
                var i = function (i) {
                    i.preventDefault(), t.hasClass("disabled") || n.disabled || e.$apply(function () {
                        o.toggle()
                    })
                };
                t.bind("click", i), t.attr({
                    "aria-haspopup": !0,
                    "aria-expanded": !1
                }), e.$watch(o.isOpen, function (e) {
                    t.attr("aria-expanded", !!e)
                }), e.$on("$destroy", function () {
                    t.unbind("click", i)
                })
            }
        }
    }
}), angular.module("ui.bootstrap.position", []).factory("$position", ["$document", "$window", function (e, t) {
    function n(e, n) {
        return e.currentStyle ? e.currentStyle[n] : t.getComputedStyle ? t.getComputedStyle(e)[n] : e.style[n]
    }

    function o(e) {
        return "static" === (n(e, "position") || "static")
    }

    var i = function (t) {
        for (var n = e[0], i = t.offsetParent || n; i && i !== n && o(i);)i = i.offsetParent;
        return i || n
    };
    return {
        position: function (t) {
            var n = this.offset(t), o = {top: 0, left: 0}, r = i(t[0]);
            r != e[0] && (o = this.offset(angular.element(r)), o.top += r.clientTop - r.scrollTop, o.left += r.clientLeft - r.scrollLeft);
            var a = t[0].getBoundingClientRect();
            return {
                width: a.width || t.prop("offsetWidth"),
                height: a.height || t.prop("offsetHeight"),
                top: n.top - o.top,
                left: n.left - o.left
            }
        }, offset: function (n) {
            var o = n[0].getBoundingClientRect();
            return {
                width: o.width || n.prop("offsetWidth"),
                height: o.height || n.prop("offsetHeight"),
                top: o.top + (t.pageYOffset || e[0].documentElement.scrollTop),
                left: o.left + (t.pageXOffset || e[0].documentElement.scrollLeft)
            }
        }, positionElements: function (e, t, n, o) {
            var i, r, a, l, c = n.split("-"), s = c[0], u = c[1] || "center";
            i = o ? this.offset(e) : this.position(e), r = t.prop("offsetWidth"), a = t.prop("offsetHeight");
            var p = {
                center: function () {
                    return i.left + i.width / 2 - r / 2
                }, left: function () {
                    return i.left
                }, right: function () {
                    return i.left + i.width
                }
            }, d = {
                center: function () {
                    return i.top + i.height / 2 - a / 2
                }, top: function () {
                    return i.top
                }, bottom: function () {
                    return i.top + i.height
                }
            };
            switch (s) {
                case"right":
                    l = {top: d[u](), left: p[s]()};
                    break;
                case"left":
                    l = {top: d[u](), left: i.left - r};
                    break;
                case"bottom":
                    l = {top: d[s](), left: p[u]()};
                    break;
                default:
                    l = {top: i.top - a, left: p[u]()}
            }
            return l
        }
    }
}]), angular.module("ui.bootstrap.modal", []).factory("$$stackedMap", function () {
    return {
        createNew: function () {
            var e = [];
            return {
                add: function (t, n) {
                    e.push({key: t, value: n})
                }, get: function (t) {
                    for (var n = 0; n < e.length; n++)if (t == e[n].key)return e[n]
                }, keys: function () {
                    for (var t = [], n = 0; n < e.length; n++)t.push(e[n].key);
                    return t
                }, top: function () {
                    return e[e.length - 1]
                }, remove: function (t) {
                    for (var n = -1, o = 0; o < e.length; o++)if (t == e[o].key) {
                        n = o;
                        break
                    }
                    return e.splice(n, 1)[0]
                }, removeTop: function () {
                    return e.splice(e.length - 1, 1)[0]
                }, length: function () {
                    return e.length
                }
            }
        }
    }
}).directive("modalBackdrop", ["$timeout", function (e) {
    function t(t) {
        t.animate = !1, e(function () {
            t.animate = !0
        })
    }

    return {
        restrict: "EA", replace: !0, templateUrl: "template/modal/backdrop.html", compile: function (e, n) {
            return e.addClass(n.backdropClass), t
        }
    }
}]).directive("modalWindow", ["$modalStack", "$q", function (e, t) {
    return {
        restrict: "EA",
        scope: {index: "@", animate: "="},
        replace: !0,
        transclude: !0,
        templateUrl: function (e, t) {
            return t.templateUrl || "template/modal/window.html"
        },
        link: function (n, o, i) {
            o.addClass(i.windowClass || ""), n.size = i.size, n.close = function (t) {
                var n = e.getTop();
                n && n.value.backdrop && "static" != n.value.backdrop && t.target === t.currentTarget && (t.preventDefault(), t.stopPropagation(), e.dismiss(n.key, "backdrop click"))
            }, n.$isRendered = !0;
            var r = t.defer();
            i.$observe("modalRender", function (e) {
                "true" == e && r.resolve()
            }), r.promise.then(function () {
                n.animate = !0;
                var t = o[0].querySelectorAll("[autofocus]");
                t.length ? t[0].focus() : o[0].focus();
                var i = e.getTop();
                i && e.modalRendered(i.key)
            })
        }
    }
}]).directive("modalAnimationClass", [function () {
    return {
        compile: function (e, t) {
            t.modalAnimation && e.addClass(t.modalAnimationClass)
        }
    }
}]).directive("modalTransclude", function () {
    return {
        link: function (e, t, n, o, i) {
            i(e.$parent, function (e) {
                t.empty(), t.append(e)
            })
        }
    }
}).factory("$modalStack", ["$animate", "$timeout", "$document", "$compile", "$rootScope", "$$stackedMap", function (e, t, n, o, i, r) {
    function a() {
        for (var e = -1, t = m.keys(), n = 0; n < t.length; n++)m.get(t[n]).value.backdrop && (e = n);
        return e
    }

    function l(e) {
        var t = n.find("body").eq(0), o = m.get(e).value;
        m.remove(e), s(o.modalDomEl, o.modalScope, function () {
            t.toggleClass(f, m.length() > 0), c()
        })
    }

    function c() {
        if (p && -1 == a()) {
            var e = d;
            s(p, d, function () {
                e = null
            }), p = void 0, d = void 0
        }
    }

    function s(n, o, r) {
        function a() {
            a.done || (a.done = !0, n.remove(), o.$destroy(), r && r())
        }

        o.animate = !1, n.attr("modal-animation") && e.enabled() ? n.one("$animate:close", function () {
            i.$evalAsync(a)
        }) : t(a)
    }

    function u(e, t, n) {
        return !e.value.modalScope.$broadcast("modal.closing", t, n).defaultPrevented
    }

    var p, d, f = "modal-open", m = r.createNew(), g = {};
    return i.$watch(a, function (e) {
        d && (d.index = e)
    }), n.bind("keydown", function (e) {
        var t;
        27 === e.which && (t = m.top(), t && t.value.keyboard && (e.preventDefault(), i.$apply(function () {
            g.dismiss(t.key, "escape key press")
        })))
    }), g.open = function (e, t) {
        var r = n[0].activeElement;
        m.add(e, {
            deferred: t.deferred,
            renderDeferred: t.renderDeferred,
            modalScope: t.scope,
            backdrop: t.backdrop,
            keyboard: t.keyboard
        });
        var l = n.find("body").eq(0), c = a();
        if (c >= 0 && !p) {
            d = i.$new(!0), d.index = c;
            var s = angular.element('<div modal-backdrop="modal-backdrop"></div>');
            s.attr("backdrop-class", t.backdropClass), t.animation && s.attr("modal-animation", "true"), p = o(s)(d), l.append(p)
        }
        var u = angular.element('<div modal-window="modal-window"></div>');
        u.attr({
            "template-url": t.windowTemplateUrl,
            "window-class": t.windowClass,
            size: t.size,
            index: m.length() - 1,
            animate: "animate"
        }).html(t.content), t.animation && u.attr("modal-animation", "true");
        var g = o(u)(t.scope);
        m.top().value.modalDomEl = g, m.top().value.modalOpener = r, l.append(g), l.addClass(f)
    }, g.close = function (e, t) {
        var n = m.get(e);
        return n && u(n, t, !0) ? (n.value.deferred.resolve(t), l(e), n.value.modalOpener.focus(), !0) : !n
    }, g.dismiss = function (e, t) {
        var n = m.get(e);
        return n && u(n, t, !1) ? (n.value.deferred.reject(t), l(e), n.value.modalOpener.focus(), !0) : !n
    }, g.dismissAll = function (e) {
        for (var t = this.getTop(); t && this.dismiss(t.key, e);)t = this.getTop()
    }, g.getTop = function () {
        return m.top()
    }, g.modalRendered = function (e) {
        var t = m.get(e);
        t && t.value.renderDeferred.resolve()
    }, g
}]).provider("$modal", function () {
    var e = {
        options: {animation: !0, backdrop: !0, keyboard: !0},
        $get: ["$injector", "$rootScope", "$q", "$templateRequest", "$controller", "$modalStack", function (t, n, o, i, r, a) {
            function l(e) {
                return e.template ? o.when(e.template) : i(angular.isFunction(e.templateUrl) ? e.templateUrl() : e.templateUrl)
            }

            function c(e) {
                var n = [];
                return angular.forEach(e, function (e) {
                    (angular.isFunction(e) || angular.isArray(e)) && n.push(o.when(t.invoke(e)))
                }), n
            }

            var s = {};
            return s.open = function (t) {
                var i = o.defer(), s = o.defer(), u = o.defer(), p = {
                    result: i.promise,
                    opened: s.promise,
                    rendered: u.promise,
                    close: function (e) {
                        return a.close(p, e)
                    },
                    dismiss: function (e) {
                        return a.dismiss(p, e)
                    }
                };
                if (t = angular.extend({}, e.options, t), t.resolve = t.resolve || {}, !t.template && !t.templateUrl)throw new Error("One of template or templateUrl options is required.");
                var d = o.all([l(t)].concat(c(t.resolve)));
                return d.then(function (e) {
                    var o = (t.scope || n).$new();
                    o.$close = p.close, o.$dismiss = p.dismiss;
                    var l, c = {}, s = 1;
                    t.controller && (c.$scope = o, c.$modalInstance = p, angular.forEach(t.resolve, function (t, n) {
                        c[n] = e[s++]
                    }), l = r(t.controller, c), t.controllerAs && (o[t.controllerAs] = l)), a.open(p, {
                        scope: o,
                        deferred: i,
                        renderDeferred: u,
                        content: e[0],
                        animation: t.animation,
                        backdrop: t.backdrop,
                        keyboard: t.keyboard,
                        backdropClass: t.backdropClass,
                        windowClass: t.windowClass,
                        windowTemplateUrl: t.windowTemplateUrl,
                        size: t.size
                    })
                }, function (e) {
                    i.reject(e)
                }), d.then(function () {
                    s.resolve(!0)
                }, function (e) {
                    s.reject(e)
                }), p
            }, s
        }]
    };
    return e
}), angular.module("ui.bootstrap.transition", []).value("$transitionSuppressDeprecated", !1).factory("$transition", ["$q", "$timeout", "$rootScope", "$log", "$transitionSuppressDeprecated", function (e, t, n, o, i) {
    function r(e) {
        for (var t in e)if (void 0 !== l.style[t])return e[t]
    }

    i || o.warn("$transition is now deprecated. Use $animate from ngAnimate instead.");
    var a = function (o, i, r) {
        r = r || {};
        var l = e.defer(), c = a[r.animation ? "animationEndEventName" : "transitionEndEventName"], s = function () {
            n.$apply(function () {
                o.unbind(c, s), l.resolve(o)
            })
        };
        return c && o.bind(c, s), t(function () {
            angular.isString(i) ? o.addClass(i) : angular.isFunction(i) ? i(o) : angular.isObject(i) && o.css(i), c || l.resolve(o)
        }), l.promise.cancel = function () {
            c && o.unbind(c, s), l.reject("Transition cancelled")
        }, l.promise
    }, l = document.createElement("trans"), c = {
        WebkitTransition: "webkitTransitionEnd",
        MozTransition: "transitionend",
        OTransition: "oTransitionEnd",
        transition: "transitionend"
    }, s = {
        WebkitTransition: "webkitAnimationEnd",
        MozTransition: "animationend",
        OTransition: "oAnimationEnd",
        transition: "animationend"
    };
    return a.transitionEndEventName = r(c), a.animationEndEventName = r(s), a
}]), angular.module("ui.bootstrap.tooltip", ["ui.bootstrap.position", "ui.bootstrap.bindHtml"]).provider("$tooltip", function () {
    function e(e) {
        var t = /[A-Z]/g, n = "-";
        return e.replace(t, function (e, t) {
            return (t ? n : "") + e.toLowerCase()
        })
    }

    var t = {placement: "top", animation: !0, popupDelay: 0, useContentExp: !1}, n = {
        mouseenter: "mouseleave",
        click: "click",
        focus: "blur"
    }, o = {};
    this.options = function (e) {
        angular.extend(o, e)
    }, this.setTriggers = function (e) {
        angular.extend(n, e)
    }, this.$get = ["$window", "$compile", "$timeout", "$document", "$position", "$interpolate", function (i, r, a, l, c, s) {
        return function (i, u, p, d) {
            function f(e) {
                var t = e || d.trigger || p, o = n[t] || t;
                return {show: t, hide: o}
            }

            d = angular.extend({}, t, o, d);
            var m = e(i), g = s.startSymbol(), v = s.endSymbol(), h = "<div " + m + '-popup title="' + g + "title" + v + '" ' + (d.useContentExp ? 'content-exp="contentExp()" ' : 'content="' + g + "content" + v + '" ') + 'placement="' + g + "placement" + v + '" popup-class="' + g + "popupClass" + v + '" animation="animation" is-open="isOpen"origin-scope="origScope" ></div>';
            return {
                restrict: "EA", compile: function () {
                    var e = r(h);
                    return function (t, n, o) {
                        function r() {
                            S.isOpen ? p() : s()
                        }

                        function s() {
                            (!D || t.$eval(o[u + "Enable"])) && ($(), S.popupDelay ? O || (O = a(m, S.popupDelay, !1), O.then(function (e) {
                                e()
                            })) : m()())
                        }

                        function p() {
                            t.$apply(function () {
                                g()
                            })
                        }

                        function m() {
                            return O = null, T && (a.cancel(T), T = null), (d.useContentExp ? S.contentExp() : S.content) ? (v(), y.css({
                                top: 0,
                                left: 0,
                                display: "block"
                            }), S.$digest(), U(), S.isOpen = !0, S.$apply(), U) : angular.noop
                        }

                        function g() {
                            S.isOpen = !1, a.cancel(O), O = null, S.animation ? T || (T = a(h, 500)) : h()
                        }

                        function v() {
                            y && h(), E = S.$new(), y = e(E, function (e) {
                                A ? l.find("body").append(e) : n.after(e)
                            }), E.$watch(function () {
                                a(U, 0, !1)
                            }), d.useContentExp && E.$watch("contentExp()", function (e) {
                                !e && S.isOpen && g()
                            })
                        }

                        function h() {
                            T = null, y && (y.remove(), y = null), E && (E.$destroy(), E = null)
                        }

                        function $() {
                            b(), w(), C()
                        }

                        function b() {
                            S.popupClass = o[u + "Class"]
                        }

                        function w() {
                            var e = o[u + "Placement"];
                            S.placement = angular.isDefined(e) ? e : d.placement
                        }

                        function C() {
                            var e = o[u + "PopupDelay"], t = parseInt(e, 10);
                            S.popupDelay = isNaN(t) ? d.popupDelay : t
                        }

                        function k() {
                            var e = o[u + "Trigger"];
                            H(), x = f(e), x.show === x.hide ? n.bind(x.show, r) : (n.bind(x.show, s), n.bind(x.hide, p))
                        }

                        var y, E, T, O, A = angular.isDefined(d.appendToBody) ? d.appendToBody : !1, x = f(void 0), D = angular.isDefined(o[u + "Enable"]), S = t.$new(!0), U = function () {
                            if (y) {
                                var e = c.positionElements(n, y, S.placement, A);
                                e.top += "px", e.left += "px", y.css(e)
                            }
                        };
                        S.origScope = t, S.isOpen = !1, S.contentExp = function () {
                            return t.$eval(o[i])
                        }, d.useContentExp || o.$observe(i, function (e) {
                            S.content = e, !e && S.isOpen && g()
                        }), o.$observe("disabled", function (e) {
                            e && S.isOpen && g()
                        }), o.$observe(u + "Title", function (e) {
                            S.title = e
                        });
                        var H = function () {
                            n.unbind(x.show, s), n.unbind(x.hide, p)
                        };
                        k();
                        var q = t.$eval(o[u + "Animation"]);
                        S.animation = angular.isDefined(q) ? !!q : d.animation;
                        var M = t.$eval(o[u + "AppendToBody"]);
                        A = angular.isDefined(M) ? M : A, A && t.$on("$locationChangeSuccess", function () {
                            S.isOpen && g()
                        }), t.$on("$destroy", function () {
                            a.cancel(T), a.cancel(O), H(), h(), S = null
                        })
                    }
                }
            }
        }
    }]
}).directive("tooltipTemplateTransclude", ["$animate", "$sce", "$compile", "$templateRequest", function (e, t, n, o) {
    return {
        link: function (i, r, a) {
            var l, c, s, u = i.$eval(a.tooltipTemplateTranscludeScope), p = 0, d = function () {
                c && (c.remove(), c = null), l && (l.$destroy(), l = null), s && (e.leave(s).then(function () {
                    c = null
                }), c = s, s = null)
            };
            i.$watch(t.parseAsResourceUrl(a.tooltipTemplateTransclude), function (t) {
                var a = ++p;
                t ? (o(t, !0).then(function (o) {
                    if (a === p) {
                        var i = u.$new(), c = o, f = n(c)(i, function (t) {
                            d(), e.enter(t, r)
                        });
                        l = i, s = f, l.$emit("$includeContentLoaded", t)
                    }
                }, function () {
                    a === p && (d(), i.$emit("$includeContentError", t))
                }), i.$emit("$includeContentRequested", t)) : d()
            }), i.$on("$destroy", d)
        }
    }
}]).directive("tooltipClasses", function () {
    return {
        restrict: "A", link: function (e, t, n) {
            e.placement && t.addClass(e.placement), e.popupClass && t.addClass(e.popupClass), e.animation() && t.addClass(n.tooltipAnimationClass)
        }
    }
}).directive("tooltipPopup", function () {
    return {
        restrict: "EA",
        replace: !0,
        scope: {content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&"},
        templateUrl: "template/tooltip/tooltip-popup.html"
    }
}).directive("tooltip", ["$tooltip", function (e) {
    return e("tooltip", "tooltip", "mouseenter")
}]).directive("tooltipTemplatePopup", function () {
    return {
        restrict: "EA",
        replace: !0,
        scope: {contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&", originScope: "&"},
        templateUrl: "template/tooltip/tooltip-template-popup.html"
    }
}).directive("tooltipTemplate", ["$tooltip", function (e) {
    return e("tooltipTemplate", "tooltip", "mouseenter", {useContentExp: !0})
}]).directive("tooltipHtmlPopup", function () {
    return {
        restrict: "EA",
        replace: !0,
        scope: {contentExp: "&", placement: "@", popupClass: "@", animation: "&", isOpen: "&"},
        templateUrl: "template/tooltip/tooltip-html-popup.html"
    }
}).directive("tooltipHtml", ["$tooltip", function (e) {
    return e("tooltipHtml", "tooltip", "mouseenter", {useContentExp: !0})
}]).directive("tooltipHtmlUnsafePopup", function () {
    return {
        restrict: "EA",
        replace: !0,
        scope: {content: "@", placement: "@", popupClass: "@", animation: "&", isOpen: "&"},
        templateUrl: "template/tooltip/tooltip-html-unsafe-popup.html"
    }
}).value("tooltipHtmlUnsafeSuppressDeprecated", !1).directive("tooltipHtmlUnsafe", ["$tooltip", "tooltipHtmlUnsafeSuppressDeprecated", "$log", function (e, t, n) {
    return t || n.warn("tooltip-html-unsafe is now deprecated. Use tooltip-html or tooltip-template instead."), e("tooltipHtmlUnsafe", "tooltip", "mouseenter")
}]), angular.module("ui.bootstrap.bindHtml", []).directive("bindHtmlUnsafe", function () {
    return function (e, t, n) {
        t.addClass("ng-binding").data("$binding", n.bindHtmlUnsafe), e.$watch(n.bindHtmlUnsafe, function (e) {
            t.html(e || "")
        })
    }
});
