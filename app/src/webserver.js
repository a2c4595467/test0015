var http = require('http');

http.createServer(function(req, res) {
	res.writeHead(200, {'Content-Type':'text/plain'});

	res.end("hello world\n");

//}).listen(8100, '127.0.0.1');
}).listen(3001, '0.0.0.0');
