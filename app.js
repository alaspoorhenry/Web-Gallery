/* jshint esversion: 6 */
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var multer = require('multer');
var upload = multer({dest: 'uploads/'});

const cookie = require('cookie');

const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

//generates salt for salted hash
function generateSalt(){
    return crypto.randomBytes(16).toString('base64');
};

function generateHash (password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

//add authentication middleware later

app.use(express.static('static'));

var Datastore = require('nedb');
var comments = new Datastore({ filename: 'db/comments.db', autoload: true, timestampData: true});
var images = new Datastore({ filename: path.join(__dirname,'db', 'images.db'), autoload: true});
var users = new Datastore({ filename: 'db/users.db', autoload: true });

users.loadDatabase();
comments.loadDatabase();
images.loadDatabase();

let page = 10;

app.use(function(req, res, next){
    req.user = (req.session.user)? req.session.user : null;
    req.username = (req.user)? req.user._id: '';
    var username = (req.user)? req.user._id : '';
    res.setHeader('Set-Cookie', cookie.serialize('username', username, {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

var isAuthenticated = function(req, res, next){
    if (!req.username) return res.status(401).end("access denied");
    next();
};

var Image = (function(){
    var id = 1;
    return function item(poster, username, imagePosted){
        this._id = id++;
        this.authorname = username;
        this.imagename = poster.image_name;
        this.imageUrl = imagePosted; 
        this.date = Date.now();
    };
}());

var Comment = (function(){
    var id = 0;
    return function item(poster, poster_name){
        this._id = id++;
        this.imageId = poster.imageId;
        this.author = poster_name;
        this.content = poster.content; 
        this.date = Date.now();
    };
}());

//signup request handler
// curl -X POST -d yadayada
app.post('/signup/', function(req, res, next){
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    var username = req.body.username;
    var password = req.body.password;
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        // generate a new salt and hash
        var salt = generateSalt();
        var hash = generateHash(password, salt);
        // insert new user into the database
        users.update({_id: username},{_id: username, hash: hash, salt: salt}, {upsert: true}, function(err){
            if (err) return res.status(500).end(err);
            return res.redirect("/");
        });
    });
});

app.post('/signin/', function (req, res, next) {
    // extract data from HTTP request
    if (!('username' in req.body)) return res.status(400).end('username is missing');
    if (!('password' in req.body)) return res.status(400).end('password is missing');
    var username = req.body.username;
    var password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("No user found with that username");
        if (user.hash !== generateHash(password, user.salt)) return res.status(401).end("access denied"); // invalid password
        // start a session
        req.session.user = user;
        //user._id is the username which is unique
        res.setHeader('Set-Cookie', cookie.serialize('username', user._id, {
              path : '/', 
              maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
        }));
        return res.redirect("/");
    });
});

//comment post
app.post('/api/comments/', isAuthenticated, function(req, res, next){
    var comment = new Comment(req.body, req.username); //response body should have all relevant info
    comments.insert(comment, function(err, doc){
        if (err) return res.status(500).end(err);
        return res.json(doc);
    });
});

//get users
app.get('/api/users/', function(req, res, next){
    users.find({}, function(err, doc){
        return res.json(doc);
    });
});

//get all comments
app.get('/api/comments/', function(req,res,next){
    comments.find({}, function(err, doc){  
        if (err) return res.status(500).end(err);
        //code below by Phrogz at https://stackoverflow.com/questions/10123953/sort-javascript-object-array-by-date
        doc.sort(function(a,b){
            // Turn your strings into dates, and then subtract them
            // to get a value that is either negative, positive, or zero.
            return new Date(b.date) - new Date(a.date);
        });
        return res.json(doc);
    });
});

//signout
app.get('/signout/', function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    res.redirect('/');
});

//get comments with associated imageId and pageNo (this info should be in url as params)
app.get('/api/comments/:id/', function(req,res,next){
    // query string should be here too
    // assume page always >= 1 as a precondition
    var pg = req.query.page;
    var intP = parseInt(req.params.id);
    comments.find({_id : intP}).skip((pg-1)*page).limit(page).exec(function (err, doc){
        if (err) return res.status(500).end(err);
        return res.json(doc);
    });
});

//returns all images with given username
//curl -X GET
app.get("/api/images/:username", function(req, res, next){
    var loc_username = req.params.username;
    images.find({authorname: loc_username}, function(err, doc){
        if (err) return res.status(500).end(err);
        if (!doc) return res.status(404).end(err);
        return res.json(doc);
    });
});

//delete comment given id
app.delete("/api/comments/:id", isAuthenticated, function(req,res,next){
    var intP = parseInt(req.params.id);
    comments.findOne({_id: intP}, function(err, doc){
        if (err) return res.status(500).end(err);
        if (!doc) return res.status(404).end(err);
        if (req.username !== doc.author) return res.status(401).end("Forbidden");
        comments.remove({_id: doc._id}, {multi: false}, function(err, doc){
            return res.json(doc);
        });
    });
});

app.post('/api/images/', isAuthenticated , upload.single('image_url'), function(req, res, next){
    var image = new Image(req.body, req.username, req.file);
    images.insert(image, function(err, doc){
        if (err) return res.status(500).end(err);
        return res.redirect('/');
    });
});

app.get('/api/images/', function(req, res, next){
    images.find({}, function(err, doc){
        if (err) return res.status(500).end(err);
        return res.json(doc);
    });
});

app.get('/api/images/:id/profile/picture/', function(req, res, next){
    var intId = parseInt(req.params.id);
    images.findOne({_id :intId}, function(err,doc){
        if (err) return resizeTo.status(500).end(err);
        if (!(doc)) return res.status(404).end(err);
        var profile = doc.imageUrl;
        res.setHeader('Content-Type', profile.mimetype);
        res.sendFile(profile.path, {root: __dirname});
    });
});

app.get('/api/images/:id', function(req, res, next){
    images.findOne({_id: req.params.id}, function(err, doc){
        if (err) return res.status(500).end(err);
        if (!doc) return res.status(404).end(err);
        return res.json(doc);
    });
});

app.delete('/api/images/:id', function(req, res, next){
    // does delete but doesn't change state of page
    var intId = parseInt(req.params.id);
    images.findOne({_id: intId}, function(err, doc){
        if (err) return res.status(500).end(err);
        if (!doc) return res.status(404).end(err);
        if (req.username !== doc.authorname) return res.status(401).end("Forbidden");
        comments.remove({imageId: doc._id}, {multi: true}, function(err, doc){
            if (err) return res.status(500).end(err);
        });
        var profile = doc.imageUrl;
        fs.unlink(profile.path, function(err){
            if (err) return res.status(500).end(err);
        });
        images.remove({_id: doc._id}, {multi: false}, function(err, doc){
            return res.json(doc);
        });
    });
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});