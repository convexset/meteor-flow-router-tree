/* global FlowRouterTree: true */

if (Meteor.isClient) {
	Template.Footer.helpers({
		nodes: function() {
			return FlowRouterTree.nodes;
		},
		randomParams: function() {
			var pArr = [];
			while (Math.random() < 0.6) {
				pArr.push(_.range(1, 5).map(function() {
					return String.fromCharCode(_.random(97, 97 + 25));
				}).join("") + Math.floor(1000 * Math.random()) + "=" + Math.floor(1000 * Math.random()));
			}
			return (pArr.length > 0 ? "?" : "") + pArr.join("&");
		}
	});

	Template.NodeTree.helpers({
		childNodes: function() {
			var childNodes = _.map(FlowRouterTree.nodes, v => v).filter(
				node => (!!node.parent) && (node.parent.name === Template.instance().data.nodeName)
			).map(node => node.name);
			return childNodes;
		},
	});
}

FlowRouterTree.showDebugOutputOnServer();

var root = FlowRouterTree.createNode({
	parent: null,
	name: 'rootNode',
	description: "Main",
	path: '',
	params: {
		layout: "MainLayout",
		header: "Header",
		content: "Main",
		footer: "Footer"
	},
	actionFactory: FlowRouterTree.SampleParameterizedActions.blazeLayoutRenderThreeComponent,
	triggersEnter: {
		enterTrigger: function(context) {
			console.log('Default Entry Trigger');
			console.log('Context:', context);
		}
	},
	triggersExit: {
		exitTrigger: function() {
			console.log('Default Exit Trigger');
		}
	},
	providesParentRoutePrefix: true,
	makeRoute: true,
});

var sectionA = FlowRouterTree.createNode({
	parent: root,
	name: 'SectionA',
	description: "Section A",
	path: 'SectionA',
	params: {
		content: "SectionA",
	},
	triggersEnter: {
		enterTrigger: function(context) {
			console.log('Section A Entry Trigger');
			console.log('Context:', context);
		}
	},
	triggersExit: {
		exitTrigger: function() {
			console.log('Section A Exit Trigger');
		}
	},
	providesParentRoutePrefix: true,
});

FlowRouterTree.createNode({
	parent: root,
	name: 'SectionB',
	description: "Section B",
	path: 'SectionB',
	params: {
		content: "SectionB",
	},
	providesParentRoutePrefix: true,
	triggersEnter: {
		enterTrigger: function(context) {
			console.log('Section B Entry Trigger');
			console.log('Context:', context);
		},
		additionalEnterTrigger: function(context) {
			console.log('Section B (Additional Entry Trigger');
			console.log('Context:', context);
		}
	},
	triggersExit: {
		exitTrigger: function() {
			console.log('Section B Exit Trigger');
		}
	},
});

FlowRouterTree.createNode({
	parent: sectionA,
	name: 'SectionAA',
	description: "Subsection A-A",
	path: 'SectionAA',
	params: {
		content: "SectionAA",
	},
	triggersEnter: {
		enterTrigger: function(context) {
			console.log('Subsection A-A Entry Trigger');
			console.log('Exit Trigger overwritten with null');
			console.log('Context:', context);
		}
	},
	triggersExit: {
		exitTrigger: null
	},
});

FlowRouterTree.createNode({
	parent: sectionA,
	name: 'SectionAB',
	description: "Subsection A-B",
	path: 'SectionAB',
	params: {
		content: "SectionAB",
	},
	triggersEnter: {
		enterTrigger: function(context) {
			console.log('Subsection A-B Entry Trigger');
			console.log('Exit Trigger overwritten with null');
			console.log('Context:', context);
		}
	},
	triggersExit: {
		exitTrigger: null
	},
});