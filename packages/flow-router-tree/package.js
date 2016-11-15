Package.describe({
	// [validatis:stack]
	name: 'convexset:flow-router-tree',
	version: '0.1.6',
	summary: 'A tool for facilitating the maintenance of FlowRouter routes cleanly.',
	git: 'https://github.com/convexset/meteor-flow-router-tree',
	documentation: '../../README.md'
});

Package.onUse(function pkgSetup(api) {
	api.versionsFrom('1.3.2.4');
	api.use([
		'ecmascript',
		'check',
		'kadira:flow-router@2.12.1',
		'convexset:access-check@0.1.2_2',
		'tmeasday:check-npm-versions@0.3.1',
	]);

	api.use([
		'session',
		'kadira:blaze-layout@2.3.0',
	], 'client');

	api.mainModule('flow-router-tree.js');
});
