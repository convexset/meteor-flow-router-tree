/* global BlazeLayout: true */
/* global PackageUtilities: true */
/* global Match: true */
/* global FlowRouterTree: true */

FlowRouterTree = (function() {
	///////////////////////////////////////////////////////////////////////////
	// Set Up
	///////////////////////////////////////////////////////////////////////////
	// Route names and routes
	var _flowRouterRouteNames = [];
	var _flowRouterRoutes = [];
	var __frt = function FlowRouterTree() {};
	var __nd = function NodeDictionary() {};
	var __ed = function EdgeDictionary() {};

	// Flow Router Tree 
	var FlowRouterTree = new __frt();

	// Node dictionary
	var _flowRouterNodes = new __nd();
	PackageUtilities.addImmutablePropertyValue(FlowRouterTree, 'nodes', _flowRouterNodes);

	// Node tree
	var _flowRouterTree = new __ed();
	PackageUtilities.addImmutablePropertyValue(FlowRouterTree, 'tree', _flowRouterTree);
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'roots', function roots() {
		return _.map(_flowRouterTree, function(v, k) {
			return {
				key: k,
				value: v
			};
		}).filter(x => x.value === null).map(x => x.key);
	});

	///////////////////////////////////////////////////////////////////////////
	// Debug Mode
	///////////////////////////////////////////////////////////////////////////
	var SHOW_DEBUG_OUTPUT_ON_SERVER = false;
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'showDebugOutputOnServer', function showDebugOutputOnServer() {
		SHOW_DEBUG_OUTPUT_ON_SERVER = true;
	});
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'hideDebugOutput', function hideDebugOutput() {
		SHOW_DEBUG_OUTPUT_ON_SERVER = false;
	});

	///////////////////////////////////////////////////////////////////////////
	// FlowRouterTreeNode
	///////////////////////////////////////////////////////////////////////////
	function FlowRouterTreeNode(options) {
		var instance = this;

		if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
			console.log(" ");
			console.log("****************************************");
			console.log("* " + options.name);
			console.log("****************************************");
		}
		if ((typeof options.path === "undefined") || (typeof options.path !== "string")) {
			throw new Meteor.Error("argument-error", "options.path is required and should be a string.");
		}

		if ((typeof options.name === "undefined") || (typeof options.name !== "string") || (options.name.length === 0)) {
			throw new Meteor.Error("argument-error", "options.name is required and should be a string with positive length.");
		}
		if (_flowRouterRouteNames.indexOf(options.name) === -1) {
			_flowRouterRouteNames.push(options.name);
		} else {
			throw new Meteor.Error("argument-error", "options.name should be unique.");
		}

		var _options = _.extend({
			parent: null,
			params: {},
			actionFactory: null,
			triggersEnter: {},
			triggersExit: {},
			providesParentRoutePrefix: false,
			makeRoute: true,
			description: ""
		}, options);

		_.forEach(_options, function(v, k) {
			if (Match.test(v, Match.isPrimitive)) {
				PackageUtilities.addImmutablePropertyValue(instance, k, v);
			} else {
				PackageUtilities.addImmutablePropertyObject(instance, k, v);
			}
		});

		if (typeof this.makeRoute !== "boolean") {
			throw new Meteor.Error("argument-error", "options.makeRoute should be a boolean.");
		}

		if (this.isGroup && this.makeRoute) {
			throw new Meteor.Error("argument-error", "options.makeRoute should not be true when options.isGroup is true.");
		}

		function getLineage(node) {
			if (node.parent !== null) {
				// Has parent, so traverse
				return getLineage(node.parent).concat([node]);
			} else {
				// No parent
				return [node];
			}
		}

		function getActionFactory(node) {
			if (node.actionFactory !== null) {
				// Param found
				if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
					console.log("[Action Factory] Found on " + node.name);
					console.log(node.actionFactory);
				}
				return node.actionFactory;
			} else {
				if (node.parent !== null) {
					// Has parent, so traverse
					return getActionFactory(node.parent);
				} else {
					// Not found
					throw new Meteor.Error("action-factory-not-found");
				}
			}
		}

		function getParam(node, name) {
			if (typeof node.params[name] !== "undefined") {
				// Param found
				if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
					console.log("[Action Parameter] " + name + ": " + node.params[name] + " (from: " + node.name + ")");
				}
				return node.params[name];
			} else {
				if (!!node.parent) {
					// Has parent, so traverse
					return getParam(node.parent, name);
				} else {
					// Not found
					throw new Meteor.Error("route-parameter-not-found", "Parameter " + name + " not found ");
				}
			}
		}

		function getParams(node, requiredActionParams) {
			var params = {};
			requiredActionParams.forEach(function(name) {
				params[name] = getParam(node, name);
			});
			return params;
		}

		function getTriggers(node) {
			if (!!node) {
				// Update parent's list
				var triggers = getTriggers(node.parent);
				['triggersEnter', 'triggersExit'].forEach(function(k) {
					_.extend(triggers[k], node[k]);
					_.map(node[k], function(fn, triggerName) {
						triggers.source[triggerName] = node.name;
					});
				});
				return triggers;
			} else {
				// Not actual node
				return { // This is the starting point.
					triggersEnter: {},
					triggersExit: {},
					source: {}
				};
			}
		}

		function getParentPathPrefix(node) {
			if (!node) {
				return '/';
			}
			if (node.providesParentRoutePrefix) {
				// Param found
				return node.routePrefix;
			} else {
				if (!!node.parent) {
					// Has parent, so traverse
					return getParentPathPrefix(node.parent);
				} else {
					// Not found
					return '/';
				}
			}
		}

		function makeRoute(node) {
			var prePrefix = getParentPathPrefix(node.parent);
			if (prePrefix[prePrefix.length - 1] !== "/") {
				return prePrefix + '/' + node.path;
			} else {
				return prePrefix + node.path;
			}
		}

		function takeNonNullValues(o) {
			return _.map(o, function(v) {
				return v;
			}).filter(function(x) {
				return x !== null;
			});
		}

		if (this.makeRoute) {
			// Make a route!!!
			PackageUtilities.addImmutablePropertyValue(this, 'route', makeRoute(this));
			if (_flowRouterRoutes.indexOf(this.route) !== -1) {
				throw new Meteor.Error("repeated-route", this.route + " is already listed.");
			}
			_flowRouterRoutes.push(this.route);
			if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
				console.log("Route: " + this.route);
				console.log("Lineage: " + _.map(getLineage(this), function(node) {
					return node.name;
				}).join(" > "));
			}
		}

		if (this.providesParentRoutePrefix) {
			// Generate group path
			PackageUtilities.addImmutablePropertyValue(this, 'routePrefix', makeRoute(this));
			if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
				console.log("Parent-Route-Prefix: " + this.routePrefix);
			}
		}

		if (this.makeRoute) {
			if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
				console.log("");
			}
			var triggers = getTriggers(this);
			var actionFactory = getActionFactory(this);
			var params = getParams(this, actionFactory.requiredActionParams);

			if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
				console.log("Triggers: ", triggers);
			}
			FlowRouter.route(this.route, {
				name: this.name,
				triggersEnter: takeNonNullValues(triggers.triggersEnter),
				triggersExit: takeNonNullValues(triggers.triggersExit),
				action: actionFactory.makeAction(params)
			});

			PackageUtilities.addImmutablePropertyObject(_flowRouterNodes, this.name, this);
			PackageUtilities.addImmutablePropertyValue(_flowRouterTree, this.name, this.parent && this.parent.name);
		}

		if (SHOW_DEBUG_OUTPUT_ON_SERVER && Meteor.isServer) {
			console.log("****************************************");
			console.log(" ");
		}
	}


	///////////////////////////////////////////////////////////////////////////
	// FlowRouterTree
	///////////////////////////////////////////////////////////////////////////
	function configureParameterizedAction(parameterizedAction, requiredActionParams) {

		// Require parameterizedAction to be a function
		if (!(parameterizedAction instanceof Function)) {
			throw new Meteor.Error("argument-error", "parameterizedAction should be a function taking 3 parameters with the 3rd being for action parameters.");
		}
		var argumentList = (parameterizedAction).toString().split("{")[0].match(/\(([^\)]*)\)/i)[1].split(",");
		var numArgs = ((argumentList.length === 1) && (argumentList[0].trim() === "")) ? 0 : argumentList.length; // Yeah, this is ugly
		if (numArgs !== 3) {
			throw new Meteor.Error("argument-error", "parameterizedAction should be a function taking 3 parameters with the 3rd being for action parameters.");
		}

		// Require requiredActionParams to be an array
		if (requiredActionParams instanceof Array) {
			requiredActionParams.forEach(function(p) {
				if (typeof p !== "string") {
					throw new Meteor.Error("argument-error", "requiredActionParams should be an array of strings.");
				}
			});
		} else {
			throw new Meteor.Error("argument-error", "requiredActionParams should be an array of strings.");
		}

		// Append requiredActionParams
		PackageUtilities.addImmutablePropertyArray(parameterizedAction, 'requiredActionParams', requiredActionParams);

		// Create an action given params
		function makeAction(actionParams) {
			parameterizedAction.requiredActionParams.forEach(function(p) {
				if (typeof actionParams[p] === "undefined") {
					throw new Meteor.Error("required-parameter-absent", "Required parameter " + p + " missing.");
				}
			});
			var _actionParams = _.extend({}, actionParams);

			// curry and return
			return function(params, queryParams) {
				return parameterizedAction(params, queryParams, _actionParams);
			};
		}
		PackageUtilities.addImmutablePropertyFunction(parameterizedAction, 'makeAction', makeAction);

		return parameterizedAction;
	}
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'configureParameterizedAction', configureParameterizedAction);

	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'createNode', function createNode(options) {
		return new FlowRouterTreeNode(options);
	});

	// Useful Samples for Parameterized Actions
	PackageUtilities.addImmutablePropertyObject(FlowRouterTree, 'SampleParameterizedActions', {
		// one component layout
		blazeLayoutRenderOneComponent: FlowRouterTree.configureParameterizedAction(function blazeLayoutRenderOneComponent(params, queryParams, actionParams) {
			BlazeLayout.render(actionParams.layout, {
				content: actionParams.content,
				routeParams: {
					params: params,
					queryParams: queryParams
				}
			});
		}, ['layout', 'content']),

		// two component layout
		blazeLayoutRenderTwoComponent: FlowRouterTree.configureParameterizedAction(function blazeLayoutRenderTwoComponent(params, queryParams, actionParams) {
			BlazeLayout.render(actionParams.layout, {
				content: actionParams.content,
				footer: actionParams.footer,
				routeParams: {
					params: params,
					queryParams: queryParams
				}
			});
		}, ['layout', 'content', 'footer']),

		// three component layout
		blazeLayoutRenderThreeComponent: FlowRouterTree.configureParameterizedAction(function blazeLayoutRenderThreeComponent(params, queryParams, actionParams) {
			BlazeLayout.render(actionParams.layout, {
				header: actionParams.header,
				content: actionParams.content,
				footer: actionParams.footer,
				routeParams: {
					params: params,
					queryParams: queryParams
				}
			});
		}, ['layout', 'header', 'content', 'footer']),
	});

	// Useful Samples for Triggers
	PackageUtilities.addImmutablePropertyObject(FlowRouterTree, 'SampleTriggerFactories', {
		redirectAfterLoginFactory: function(loginRouteName, sessionVariableNameForRedirectPath) {
			return function redirectAfterLogin() {
				if (!(Meteor.loggingIn() || Meteor.userId())) {
					var path = FlowRouter.current().path;
					if (path !== FlowRouter.path(loginRouteName)) {
						Session.set(sessionVariableNameForRedirectPath, path);
					}
					return FlowRouter.go(FlowRouter.path(loginRouteName));
				}
			};
		},
		// trackRouteMovementFactory: function(logEntry, movementType) {
		// 	return function trackRouteMovement(context) {
		// 		var contextInfo = {
		// 			path: context.path,
		// 			params: context.params,
		// 			queryParams: context.queryParams,
		// 		};
		// 		if (logEntry) {
		// 			Meteor.call('requestLog', 'comment', movementType, contextInfo);
		// 		}
		// 	};
		// }
	});

	return FlowRouterTree;
})();