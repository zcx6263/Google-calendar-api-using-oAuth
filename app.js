var express = require('express');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var Session = require('express-session');
var mysql = require('mysql');
var dbconfig = require(__dirname + '/config/database');
var connection = mysql.createConnection(dbconfig);

var app = express();

app.set("view engine", "ejs");
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));

/**
 * why we saved the token in session?
 * ==> if we didn't save the token in session, 
 * it would have been gone by next request as every router hit creates the oauth2Client again.
 */
app.use(Session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));


const ClientId = "678860274860-ecbtjub1dkd9qn7u7dljfesgifk5ahjn.apps.googleusercontent.com";
const ClientSecret = "";
const RedirectionUrl = "http://localhost:3007/receiveCode";

var oauth2Client;
var session;
var calendar;
var startDate;
var endDate;
const maxDate = new Date(8640000000000000); // default max date if input value is empty
const minDate = new Date(-8640000000000000); // // default min date if input value is empty

// sope is action to use function such as getting calendar list
var SCOPES = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar'
];
function getOAuthClient() {
    var auth = new googleAuth();
    var client = new auth.OAuth2(ClientId, ClientSecret, RedirectionUrl);
    return client;
}

function getAuthUrl() {
    var client = getOAuthClient();

    var url = client.getOAuthClient({
        acess_type: 'offline',
        scope: SCOPES
    });
    return url;
}

function isValidDate(checkDate) { // check date format YYYY-MM-DD

    var pattern = /[0-9]{4}-[0-9]{2}-[0-9]{2}/; // regular expression
    if(pattern.test(checkDate)) return true;
    else return false;
}

function rsvTokenSnd(res, err, response) {
    if (err) {
        console.log("The API returned an error: " + err);
        return;
    }
    var events = response.items; // JSON format output !!
    if (events.length == 0) { // in case searching events not found
        console.log("No events found. ");
        res.send("No events found. ");
    } else {
        console.log("Events List");
        console.log(events); // print JSON format Output !!
        var printEvents = JSON.stringify(events); // convert to String object to print in ejs page

        connection.query('select * from schedule', function (err, rows) { 
            if (err) {
                //throw err;
                console.log(err);
                res.status(500).send('Internal Server Error');
            }
            res.render('receiveCode', {
                rows: rows,
                printEvents: printEvents
            });
        });
    }
}
var getResult = function (req, res) {
    
    var searchStartDate;
    var searchEndDate;

    // to escape error value and null value
    searchStartDate = (startDate == null) ? minDate.toISOString() : new Date(startDate).toISOString();
    searchEndDate = (endDate == null) ? maxDate.toISOString() : new Date(endDate).toISOString();
    
    
    calendar.events.list({
        auth: oauth2Client,
        calendarId: 'zcx5674@gmail.com',
        //timeMin: (new Date()).toISOString(),
        timeMin: searchStartDate,
        timeMax: searchEndDate,
        //maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
    }, function (err, response) {
        rsvTokenSnd(res,err,response);
    });
    
}

app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.use('/login', function (req, res) {
    res.render('login'); // login.ejs rendering
});

app.use('/setDates', function (req, res) { // in case of search ( startDate, endDate )
    
    console.log("///////////" + req.query.startDate+" "+req.query.endDate);
    startDate = req.query.startDate;
    endDate = req.query.endDate;
    if(isValidDate(req.query.startDate) == false) {
        startDate = null;
    }
    if(isValidDate(req.query.endDate) == false ) {
        endDate = null;
    }

    oauth2Client.setCredentials(req.session["tokens"]);
    res.redirect("/receiveCode");
});

app.use('/receiveCode', function (req, res) {

    var code = req.query.code; // fetch code in total url
    session = req.session;
    console.log("code : "+code);
    console.log(session);
    if (code == null) { //in case of searching date, use function because the code can only be used once
        getResult(req, res);
    }
    else { // in case of receiving the code for the first time
        oauth2Client = getOAuthClient();

        oauth2Client.getToken(code, function (err, tokens) {
            if (!err) {
                oauth2Client.credentials = tokens;
                session["tokens"] = tokens;
                //console.log(tokens);
                //console.log(tokens.access_token);
                calendar = google.calendar('v3');
                
                calendar.events.list({
                    auth: oauth2Client,
                    calendarId: 'zcx5674@gmail.com',
                    //timeMin: (new Date()).toISOString(),
                    timeMin: minDate.toISOString(),
                    timeMax: maxDate.toISOString(),
                    //maxResults: 10,
                    singleEvents: true,
                    orderBy: 'startTime'
                }, function (err, response) {
                    rsvTokenSnd(res,err,response);
                    
                });

            } else {
                console.log("fail");
                res.redirect("login");

            }
            // GET https://www.googleapis.com/calendar/v3/users/me/calendarList?key={YOUR_API_KEY}
            //res.redirect('https://www.googleapis.com/calendar/v3/users/me/calendarList?access_token='+tokens.access_token);
        });
    }
});

// to practice receiving refresh token
app.get('/refreshToken', function (req, res) {
    res.render('refreshToken');
});

app.listen(3007, function () {
    console.log('Example app listening on port 3007!');
    console.log('http://localhost:3007/');
});


/*
 * Google api process study
 * Resource owner / Resource Server / client
 * 1. Client regists to Resource Server to use Resource owner's info 
 *    and Resource Server give Client id and secret key value 
 * 2. if Resource owner access to client then show the agreeable screen
 * 3. if Resource owner agree, Resource owner access to Resource Server automatically
 * 4. Resource server will show the agreeable screen for the client to use data of owner
 *   - if login info is not, redirect login screen
 * 5. Resource server give client code that client agree date browsing
 * 6. client send code, id, secret values to Resource server 
 * 7. Resource Server check values that received from client
 * 8. if correct, give client access token
 * 9. client use access token to get data info  
 */