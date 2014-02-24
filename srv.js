var http = require('http');
var connect = require('connect');

function setCorsHeaders( res ) {
    res.setHeader( 'Access-Control-Allow-Credenditals', 'true' );
    res.setHeader( 'Access-Control-Allow-Headers', 'content-type,x-requested-with' );
    res.setHeader( 'Access-Control-Allow-Methods', 'GET, POST, PUT' );
    res.setHeader( 'Access-Control-Allow-Origin', '*' );
}

var app = connect()
  //.use(connect.logger('dev'))
  //.use(connect.static('public'))
  .use(connect.query())
  .use(connect.json())
  .use(function(req, res){
    //if()
	//console.log('======================');
        
    if( req.method == 'OPTIONS' ) {
        setCorsHeaders(res);
        res.end();
        return;
    }
    //res.write('_parsedUrl.pathname='+req._parsedUrl.pathname+'\n');
    //res.write('fuck='+req.query.fuck+'\n');
    //res.end('hello world\n');
    
    
    setCorsHeaders(res);
    res.setHeader( 'Content-Type', 'application/json; charset=UTF-8' );
    res.end('{"result":"OK","entity1":"'+req.body.entity+'"}');
    //res.end('{"result":"OK","entity1":"1111"}');
  })

http.createServer(app).listen(80);

