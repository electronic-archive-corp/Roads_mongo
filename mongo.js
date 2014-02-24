
var mongo = require('mongodb');
var host = 'memorial02.cloudapp.net';
var port = mongo.Connection.DEFAULT_PORT;
port=8080

console.log("a");

var db = new mongo.Db( 'Podvig', 
                        new mongo.Server(host, port, {}), 
                        {safe:false} 
                    );
console.log("b");

db.open( function(err,db ) {
    console.log(err," Connected!");
    
    db.collection("people").findOne( {id:"6021217"}, function(err,res){
            console.log(err,res);
            db.close();
        }
    );
} 
);

//db.close();

console.log("c");

