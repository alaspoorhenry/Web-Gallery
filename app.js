/* jshint esversion: 6 */
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var multer = require('multer');
var upload = multer({dest: 'uploads/'});

app.use(express.static('static'));

var Datastore = require('nedb');

var comments = new Datastore({ filename: 'db/comments.db', autoload: true, timestampData: true});
var images = new Datastore({ filename: path.join(__dirname,'db', 'images.db'), autoload: true});

comments.loadDatabase();
images.loadDatabase();

let page = 10;

var Image = (function(){
    var id = 1;
    return function item(poster, imagePosted){
        this._id = id++;
        this.authorname = poster.author_name;
        this.imagename = poster.image_name;
        this.imageUrl = imagePosted; 
        this.date = Date.now();
    };
}());

var Comment = (function(){
    var id = 0;
    return function item(poster){
        this._id = id++;
        this.imageId = poster.imageId;
        this.author = poster.imagename;
        this.content = poster.content; 
        this.date = Date.now();
    };
}());

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

//comment post
app.post('/api/comments/', function(req, res, next){
    var comment = new Comment(req.body); //response body should have all relevant info
    comments.insert(comment, function(err, doc){
        if (err) return res.status(500).end(err);
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

//delete comment given id
app.delete("/api/comments/:id", function(req,res,next){
    var intP = parseInt(req.params.id);
    comments.findOne({_id: intP}, function(err, doc){
        if (err) return res.status(500).end(err);
        if (!doc) return res.status(404).end(err);
        comments.remove({_id: doc._id}, {multi: false}, function(err, doc){
            return res.json(doc);
        });
    });
});

app.post('/api/images/', upload.single('image_url'), function(req, res, next){
    var image = new Image(req.body, req.file);
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