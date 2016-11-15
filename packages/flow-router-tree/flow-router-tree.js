import { Meteor } from 'meteor/meteor';
import { FlowRouter } from 'meteor/kadira:flow-router';

let BlazeLayout = { render: () => null };
if (Meteor.isClient) {
	import { BlazeLayout as _BlazeLayout } from 'meteor/kadira:blaze-layout';
	BlazeLayout = _BlazeLayout;
}

import { checkNpmVersions } from 'meteor/tmeasday:check-npm-versions';
checkNpmVersions({
	'package-utils': '^0.2.1',
	'underscore': '^1.8.3'
});
const PackageUtilities = require('package-utils');
const _ = require('underscore');

import { AccessCheck } from 'meteor/convexset:access-check';

/* eslint-disable no-console */

const _FlowRouterTree = (function() {
	///////////////////////////////////////////////////////////////////////////
	// Set Up
	///////////////////////////////////////////////////////////////////////////
	// Route names and routes
	const _flowRouterRouteNames = [];
	const _flowRouterRoutes = [];
	const __frt = function FlowRouterTree() {};
	const __nd = function NodeDictionary() {};
	const __ed = function EdgeDictionary() {};

	// Flow Router Tree
	const FlowRouterTree = new __frt();

	// Node dictionary
	const _flowRouterNodes = new __nd();
	PackageUtilities.addImmutablePropertyValue(FlowRouterTree, 'nodes', _flowRouterNodes);

	// Node tree
	const _flowRouterTree = new __ed();
	PackageUtilities.addImmutablePropertyValue(FlowRouterTree, 'tree', _flowRouterTree);
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'roots', function roots() {
		return _.map(_flowRouterTree, function getItemsWithNoParent(v, k) {
			return {
				key: k,
				value: v
			};
		}).filter(x => x.value === null).map(x => x.key);
	});

	///////////////////////////////////////////////////////////////////////////
	// Debug Mode
	///////////////////////////////////////////////////////////////////////////
	let SHOW_DEBUG_OUTPUT = false;
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'showDebugOutputOnServer', function showDebugOutputOnServer() {
		SHOW_DEBUG_OUTPUT = true;
	});
	PackageUtilities.addImmutablePropertyFunction(FlowRouterTree, 'hideDebugOutput', function hideDebugOutput() {
		SHOW_DEBUG_OUTPUT = false;
	});

	///////////////////////////////////////////////////////////////////////////
	// Sort Functions
	///////////////////////////////////////////////////////////////////////////
	let _triggersEnterSortFunction = function ancestorsFirst(n1, n2) {
		if (n1.sourceLevelsUp === n2.sourceLevelsUp) {
			return 0;
		} else {
			return n1.sourceLevelsUp < n2.sourceLevelsUp ? 1 : -1;
		}
	};
	PackageUtilities.addPropertyGetterAndSetter(FlowRouterTree, 'triggersEnterSortFunction', {
		get: () => _triggersEnterSortFunction,
		set: (fn) => {
			if (_.isFunction(fn)) {
				_triggersEnterSortFunction = fn;
			}
		}
	});

	let _triggersExitSortFunction = function descendantsFirst(n1, n2) {
		if (n1.sourceLevelsUp === n2.sourceLevelsUp) {
			return 0;
		} else {
			return n1.sourceLevelsUp < n2.sourceLevelsUp ? -1 : 1;
		}
	};
	PackageUtilities.addPropertyGetterAndSetter(FlowRouterTree, 'triggersExitSortFunction', {
		get: () => _triggersExitSortFunction,
		set: (fn) => {
			if (_.isFunction(fn)) {
				_triggersExitSortFunction = fn;
			}
		}
	});

	///////////////////////////////////////////////////////////////////////////
	// FlowRouterTreeNode
	///////////////////////////////////////////////////////////////////////////
	function FlowRouterTreeNode(options) {
		const self = this;

		if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
			console.log(' ');
			console.log('****************************************');
			console.log(`* ${options.name}`);
			console.log('****************************************');
		}
		if ((typeof options.path === 'undefined') || (typeof options.path !== 'string')) {
			throw new Meteor.Error('argument-error', 'options.path is required and should be a string.');
		}

		if ((typeof options.name === 'undefined') || (typeof options.name !== 'string') || (options.name.length === 0)) {
			throw new Meteor.Error('argument-error', 'options.name is required and should be a string with positive length.');
		}
		if (_flowRouterRouteNames.indexOf(options.name) === -1) {
			_flowRouterRouteNames.push(options.name);
		} else {
			throw new Meteor.Error('argument-error', 'options.name should be unique.');
		}

		const _options = _.extend({
			parent: null,
			params: {},
			actionFactory: null,
			triggersEnter: {},
			triggersExit: {},
			providesParentRoutePrefix: false,
			makeRoute: true,
			description: '',
			accessChecks: void 0, // See: https://atmospherejs.com/convexset/access-check
		}, options);

		if (Meteor.isServer) {
			_options.triggersEnter = {};
			_options.triggersExit = {};
		}

		_.forEach(_options, (v, k) => {
			if (PackageUtilities.isKindaUncloneable(v)) {
				PackageUtilities.addImmutablePropertyValue(self, k, v);
			} else if (_.isArray(v)) {
				PackageUtilities.addImmutablePropertyArray(self, k, v);
			} else {
				PackageUtilities.addImmutablePropertyObject(self, k, v);
			}
		});

		if (typeof this.makeRoute !== 'boolean') {
			throw new Meteor.Error('argument-error', 'options.makeRoute should be a boolean.');
		}

		if (this.isGroup && this.makeRoute) {
			throw new Meteor.Error('argument-error', 'options.makeRoute should not be true when options.isGroup is true.');
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
				if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
					console.log(`[Action Factory] Found on ${node.name}`, node.actionFactory);
				}
				return node.actionFactory;
			} else {
				if (node.parent !== null) {
					// Has parent, so traverse
					return getActionFactory(node.parent);
				} else {
					// Not found
					throw new Meteor.Error('action-factory-not-found');
				}
			}
		}

		function getParam(node, name) {
			if (typeof node.params[name] !== 'undefined') {
				// Param found
				if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
					console.log(`[Action Parameter] ${name}: ${node.params[name]} (from: ${node.name})`);
				}
				return node.params[name];
			} else {
				if (!!node.parent) {
					// Has parent, so traverse
					return getParam(node.parent, name);
				} else {
					// Not found
					throw new Meteor.Error('route-parameter-not-found', `Parameter ${name} not found`);
				}
			}
		}

		function getParams(node, requiredActionParams) {
			const params = {};
			requiredActionParams.forEach(name => {
				params[name] = getParam(node, name);
			});
			return params;
		}

		function getTriggers(node, level = 0) {
			if (!!node) {
				// Update parent's list
				const triggers = getTriggers(node.parent, level + 1);
				['triggersEnter', 'triggersExit'].forEach(k => {
					_.extend(triggers[k], node[k]);
					_.map(node[k], (fn, triggerName) => {
						triggers.source[k][triggerName] = {
							name: node.name,
							node: node,
							levelsUp: level
						};
					});
				});
				return triggers;
			} else {
				// Not actual node
				return { // This is the starting point.
					triggersEnter: {},
					triggersExit: {},
					source: {
						triggersEnter: {},
						triggersExit: {},
					}
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
			const prePrefix = getParentPathPrefix(node.parent);
			if (prePrefix[prePrefix.length - 1] !== '/') {
				return `${prePrefix}/${node.path}`;
			} else {
				return prePrefix + node.path;
			}
		}

		const ACCESS_CHECK_KEY = '[[[convexset:access-check]]]';

		function makeTriggerList(o, sources, type) {
			const priorityList = [];
			const unsortedList = [];

			_.forEach(o, (v, k) => {
				if (v === null) {
					return;
				}
				if (k === ACCESS_CHECK_KEY) {
					// run access-check trigger first
					priorityList.unshift({
						triggerName: k,
						triggerFunction: v,
						sourceName: sources[k].name,
						sourceLevelsUp: sources[k].levelsUp,
						sourceNode: sources[k].node
					});
				} else {
					unsortedList.push({
						triggerName: k,
						triggerFunction: v,
						sourceName: sources[k].name,
						sourceLevelsUp: sources[k].levelsUp,
						sourceNode: sources[k].node
					});
				}
			});

			if (type === 'enter') {
				return priorityList.concat(unsortedList.sort(_triggersEnterSortFunction));
			} else if (type === 'exit') {
				return priorityList.concat(unsortedList.sort(_triggersExitSortFunction));
			}
			throw new Meteor.Error('invalid-make-trigger-call');
		}

		function extendWithAccessChecks(triggers, params) {
			const ret = PackageUtilities.shallowCopy(triggers);

			if (this.accessChecks === null) {
				ret[ACCESS_CHECK_KEY] = null;
				return ret;
			}

			if (typeof this.accessChecks === 'undefined') {
				return ret;
			}

			ret[ACCESS_CHECK_KEY] = function accessCheckTrigger(_context, redirect, stop) {
				const context = {
					contextType: 'flow-router-tree',
					context: _context,
					redirect: redirect,
					stop: stop
				};
				let allChecksPassed = true;

				this.accessChecks
					.map(o => typeof o === 'string' ? {
						name: o
					} : o)
					.forEach(function runCheck({
						name,
						argumentMap = x => x
					}) {
						if (!allChecksPassed) {
							// stop on first failure
							return;
						}
						let outcome;
						try {
							outcome = AccessCheck.executeCheck.call(context, {
								checkName: name,
								where: AccessCheck.CLIENT_ONLY,
								params: argumentMap(params),
								executeFailureCallback: true
							});
						} catch (e) {
							allChecksPassed = false;
						}
						if (outcome.checkDone && !outcome.result) {
							allChecksPassed = false;
						}
					});
			};

			return ret;
		}

		if (this.makeRoute) {
			// Make a route!!!
			PackageUtilities.addImmutablePropertyValue(this, 'route', makeRoute(this));
			if (_flowRouterRoutes.indexOf(this.route) !== -1) {
				throw new Meteor.Error('repeated-route', `${this.route} is already listed.`);
			}
			_flowRouterRoutes.push(this.route);
			if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
				console.log(`Route: ${this.route}`);
				console.log(`Lineage: ${_.map(getLineage(this), node => {
					return node.name;
				}).join(' > ')}`);
			}
		}

		if (this.providesParentRoutePrefix) {
			// Generate group path
			PackageUtilities.addImmutablePropertyValue(this, 'routePrefix', makeRoute(this));
			if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
				console.log(`Parent-Route-Prefix: ${this.routePrefix}`);
			}
		}

		if (this.makeRoute) {
			if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
				console.log('');
			}
			const rawTriggers = getTriggers(this);
			const actionFactory = getActionFactory(this);
			const params = getParams(this, actionFactory.requiredActionParams);
			const triggers = {
				triggersEnter: makeTriggerList(
					extendWithAccessChecks(rawTriggers.triggersEnter, params),
					rawTriggers.source.triggersEnter,
					'enter'
				),
				triggersExit: makeTriggerList(
					rawTriggers.triggersExit,
					rawTriggers.source.triggersExit,
					'exit'
				),
			};

			if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
				console.log('Triggers: ', triggers);
			}
			FlowRouter.route(this.route, {
				name: this.name,
				triggersEnter: Meteor.isServer ? [] : triggers.triggersEnter.map(x => x.triggerFunction),
				triggersExit: Meteor.isServer ? [] : triggers.triggersExit.map(x => x.triggerFunction),
				action: Meteor.isServer ? () => null : actionFactory.makeAction(params)
			});

			PackageUtilities.addImmutablePropertyObject(_flowRouterNodes, this.name, this);
			PackageUtilities.addImmutablePropertyValue(_flowRouterTree, this.name, this.parent && this.parent.name);
		}

		if (SHOW_DEBUG_OUTPUT && Meteor.isDevelopment) {
			console.log('****************************************');
			console.log(' ');
		}
	}


	///////////////////////////////////////////////////////////////////////////
	// FlowRouterTree
	///////////////////////////////////////////////////////////////////////////
	function configureParameterizedAction(parameterizedAction, requiredActionParams) {
		// Require parameterizedAction to be a function
		if (!_.isFunction(parameterizedAction) || (parameterizedAction.length !== 3)) {
			throw new Meteor.Error('argument-error', 'parameterizedAction should be a function taking 3 parameters with the 3rd being for action parameters.');
		}

		// Require requiredActionParams to be an array
		if (!_.isArray(requiredActionParams) || (requiredActionParams.filter(p => typeof p !== 'string').length > 0)) {
			throw new Meteor.Error('argument-error', 'requiredActionParams should be an array of strings.');
		}

		// Append requiredActionParams
		PackageUtilities.addImmutablePropertyArray(parameterizedAction, 'requiredActionParams', requiredActionParams);

		// Create an action given params
		function makeAction(actionParams) {
			parameterizedAction.requiredActionParams.forEach(p => {
				if (typeof actionParams[p] === 'undefined') {
					throw new Meteor.Error('required-parameter-absent', `Required parameter ${p} missing.`);
				}
			});
			const _actionParams = _.extend({}, actionParams);

			// curry and return
			return function action(params, queryParams) {
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
		redirectAfterLoginFactory: Meteor.isServer ? () => () => null : function redirectAfterLoginFactory(loginRouteName, sessionVariableNameForRedirectPath) {
			import { Session } from 'meteor/session';
			return function redirectAfterLogin() {
				if (!(Meteor.loggingIn() || Meteor.userId())) {
					const path = FlowRouter.current().path;
					if (path !== FlowRouter.path(loginRouteName)) {
						Session.set(sessionVariableNameForRedirectPath, path);
					}
					Meteor.defer(() => FlowRouter.go(loginRouteName));
				}
			};
		},
	});

	return FlowRouterTree;
})();

export { _FlowRouterTree as FlowRouterTree };
