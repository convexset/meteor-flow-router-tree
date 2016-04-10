Package.describe({
	name: 'convexset:flow-router-tree',
	version: '0.1.3_1',
	summary: 'A tool for facilitating the maintenance of FlowRouter routes cleanly.',
	git: 'https://github.com/convexset/meteor-flow-router-tree',
	documentation: '../../README.md'
});

Package.onUse(function(api) {
	api.versionsFrom('1.2.0.2');
	api.use([
		'ecmascript',
		'underscore',
		'check',
		'kadira:flow-router@2.9.0',
		'kadira:blaze-layout@2.2.0',
		'convexset:package-utils@0.1.13',
		'convexset:match-extensions@0.1.1'
	]);
	api.addFiles(['flow-router-tree.js']);
	api.export('FlowRouterTree');
});

Package.onTest(function(api) {
	api.use(['tinytest', 'test-helpers'], 'client');
	api.use(['ecmascript', 'underscore', 'convexset:flow-router-tree']);
	api.addFiles(['tests.js'], 'client');
});