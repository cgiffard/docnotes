#!/usr/bin/env node

var codeSearch = require("./index");

var map = [
	{
		condition: /TO\s*DO/,
		kind: "TODO"
	},
	{
		condition: /(FIX\s*ME|Bug)/,
		kind: "Bug"
	},
	{
		condition: /^\s*\[\s*[a-z0-9]{2,4}\s*\]\s+/,
		kind: "Named Commit"
	}
];

function exclude(input, cb) {
	input = input.fullPath;

	cb(
		!~input.indexOf("node_modules")
	);
}

codeSearch(
	process.argv[2] || process.cwd(),
	exclude,
	map,
	function(err, results) {
		if (err) throw err;

		console.log(JSON.stringify(results, null, 4));
	});