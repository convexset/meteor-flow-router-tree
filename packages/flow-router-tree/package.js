Package.describe({
	// [validatis:stack]
	name: 'convexset:flow-router-tree',
	version: '0.1.4_1',
	summary: 'A tool for facilitating the maintenance of FlowRouter routes cleanly.',
	git: 'https://github.com/convexset/meteor-flow-router-tree',
	documentation: '../../README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.3.1');
	api.use([
		'ecmascript',
		'check',
		'session',
		'kadira:flow-router@2.12.1',
		'kadira:blaze-layout@2.3.0',
		'convexset:access-check@0.1.0',
		'tmeasday:check-npm-versions@0.3.1'
	]);
	api.addFiles(['flow-router-tree.js']);
	api.export('FlowRouterTree');
});
