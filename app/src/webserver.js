const http80 = require('http');

http80.createServer(function(req, res) {
	console.log(req);
	res.writeHead(200, {'Content-Type':'text/plain'});
	res.end("hello world(port:3001)\n");

// VM上にコンテナを構築してホスト側からアクセスできるよう、ループバックにしない
//}).listen(8100, '127.0.0.1');
}).listen(3001, '0.0.0.0');

