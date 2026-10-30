var http = require('http');
var os = require('os');
var fs = require('fs');
var url = require('url');
var process = require('process');

var server = http.createServer((request, response) => {
	var path = url.parse(request.url);
	if (path.pathname in pages) {
		if (typeof pages[path.pathname] == "function") {
			response.writeHead(200);
			pages[path.pathname](path, request, response);
		} else {
			response.writeHead(302, {
				'Location': String(pages[path.pathname])
			});
			response.end();
		}
	} else {
		response.writeHead(404);
		response.write('page not found');
		response.end();
	}
});

function buildFilePage(path) {
	return (url, request, response) => {
		fs.readFile(path, (err, data) => {
			if (err) throw err;
			response.end(data);
		});
	}
}

function addFilePath(pages, path, target) {
	var e, files = fs.readdirSync(path);
	for (e of files) {
		if (fs.statSync(path + '/' + e).isDirectory()) {
			addFilePath(pages, path + '/' + e, target + e + '/');
		} else {
			pages[target + e] = buildFilePage(path + '/' + e);
		}
	}
}

function buildEditableFilePage(path) {
	return (url, request, response) => {
		if (request.method == 'POST') {
			var body = "";
			request.on('data', (chunk) => {
				body += chunk;
			});
			request.on('end', () => {
				fs.writeFileSync(path, body, 'utf8');
				response.end('ok');
			});
		} else {
			fs.readFile(path, (err, data) => {
				if (err) throw err;
				response.end(data);
			});
		}
	}
}
function buildIndexPage() {
	return (url, request, response) => {
		var i;
		response.write('<!doctype html><html><body><ul>');
		for (i in pages) {
			response.write('<li><a href="' + i + '">' + i + '</a></li>');
		}
		response.write('</ul></body></html>');
		response.end();
	}
}

var pages = {
	'/': buildIndexPage()
};

addFilePath(pages, process.cwd(), '/');

server.listen({
	port: 8888
}, function() {
	var addr = server.address();
	console.log('Server Running on ' + os.hostname() + ':' + addr.port);
});

