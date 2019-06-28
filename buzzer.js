//Lädt Abhängigkeiten.
var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//Globale Variable
var BuzzerStatus = true;
var Playerlist = [];
var CurrentPress = new Object();
var CurrentQuestion = "";

//Weiterleitung zur Buzzer Page
app.get('/buzzer', function (req, res) {
    res.sendFile(__dirname + '/buzzer.html');
});

//Weiterleitung zur Admin Page
app.get('/admin', function (req, res) {
    res.sendFile(__dirname + '/buzzer_admin.html');
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// IO Logik
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//Logik für alle verbundenen Clienten/Spieler
io.on('connection', function (socket) {

    //Schickt beim erstmaligen laden der Seite die Info des Spieler, der aktuell gedrückt hat, falls vorhanden
    socket.emit('update ranking', Playerlist);
    socket.emit('load buzzer', CurrentPress);
    socket.emit('set question', CurrentQuestion);

    //Logik wenn der Buzzer gedrückt worden ist
    socket.on('buzzer press', function (msg) {
        if (BuzzerStatus == true) {
            BuzzerStatus = false;
            CurrentPress = Playerlist.find(function (element) { return element.SocketID == socket.id });
            console.log(CurrentPress.Name);
            //Nachricht an den Spieler, der Erfolgreich gedrückt hat
            socket.emit('successful pressed', "");
            //Nachricht an ale anderen das jemand gedrückt hat
            socket.broadcast.emit('failed pressed', "");
            //Schickt Info des Spielers der erfolgreich gedrückt hat an alle Spieler
            io.emit('buzzer press', CurrentPress);
        }
    });

    //Schaltet den Buzzer wieder frei
    socket.on('buzzer unlocked', function (msg) {
        BuzzerStatus = true;
        io.emit('buzzer unlocked', CurrentPress);
        CurrentPress = new Object();
    });

    //Löscht die aktuelle frage
    socket.on('clear question', function (msg) {
        CurrentQuestion = "";
        io.emit('clear question', "");
    });

    //Sendet eine neue Frage zu den Clienten
    socket.on('send question', function (msg) {
        CurrentQuestion = msg;
        io.emit('set question', msg);
    });

    //Startet ein neues Spiel
    socket.on('new game', function (msg) {
        BuzzerStatus = true;
        Playerlist = [];
        CurrentPress = new Object();
        CurrentQuestion = "";
        io.emit('new game', msg);
    });

    //fügt Punkte zum aktuellem Clienten hinzu
    socket.on('add points', function (msg) {
        Playerlist.find(function (element) { return element.SocketID == CurrentPress.SocketID }).Points += parseInt(msg);
        UpdateRanking();
    });

    //Logik wenn ein neue Spieler sich einträgt
    socket.on('new player', function (msg) {
        Playerlist.push(NewPlayer(msg.split(";")[0], msg.split(";")[1], socket.id));
        console.log("Player " + msg.split(";")[0] + " joint the game. [" + socket.id + "]");
        UpdateRanking();
    });

    //Logik falls ein Spieler die Seite verlässt
    socket.on('disconnect', function () {
        if (Playerlist.find(function (element) { return element.SocketID == socket.id }) != null) {
            console.log('User ' + Playerlist.find(function (element) { return element.SocketID == socket.id }).Name + ' disconnected. [' + socket.id + ']');
            Playerlist = Playerlist.filter(function (obj) {
                return obj.SocketID != socket.id;
            });
            UpdateRanking();
        }
    });
});

//Listener auf Port 3000
http.listen(3000, function () {
    console.log('listening on *:3000');
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//Functions
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


//Funktion um ein neuen Spieler zu erstellen
function NewPlayer(name, color, socketID) {
    var player = new Object();
    player.Name = name;
    player.Color = color;
    player.Points = 0;
    player.SocketID = socketID;

    return player;
}

//Sortiert die Spielerliste/Rangliste nach Punkten und sendet sie zu allen Clienten/Spieler
function UpdateRanking() {
    Playerlist.sort((a, b) => (a.Points < b.Points) ? 1 : ((b.Points < a.Points) ? -1 : 0));
    io.emit('update ranking', Playerlist);
    if (JSON.stringify(CurrentPress) != JSON.stringify(new Object())) {
        io.emit('buzzer press', CurrentPress);
    }
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//// Load Resource Files
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/sounds/Game_Over_Robot_Hit_8.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/Game_Over_Robot_Hit_8.mp3');
});

app.get('/sounds/Negative_Dongs_5.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/Negative_Dongs_5.mp3');
});

app.get('/sounds/Negative_Hit_Wrong_Ball.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/Negative_Hit_Wrong_Ball.mp3');
});

app.get('/sounds/Player_Change_4.mp3', function (req, res) {
    res.sendFile(__dirname + '/sounds/Player_Change_4.mp3');
});
