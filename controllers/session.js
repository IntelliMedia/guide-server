/**
 * GET /
 * Session page.
 */
exports.index = (req, res) => {

  var session = 
    {
      'id': '3ea659df-03f1-4e52-b021-53f7c39adc7f',
      'student': {
        'id': '433535225',
      },
      'events': [
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440239107,
          "prettyTime": "Wed Nov 25 2015 00:30:39 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "Started session"
        },
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440240719,
          "prettyTime": "Wed Nov 25 2015 00:30:40 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "User logged in",
          "parameters": {
            "UniqueID": "STUG1"
          }
        },
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440240752,
          "prettyTime": "Wed Nov 25 2015 00:30:40 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "Moved to",
          "parameters": {
            "title": "Office"
          }
        },
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440299496,
          "prettyTime": "Wed Nov 25 2015 00:31:39 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "Moved to",
          "parameters": {
            "title": "Case Log"
          }
        },
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440319956,
          "prettyTime": "Wed Nov 25 2015 00:31:59 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "Moved to",
          "parameters": {
            "title": "Case 1: Playground"
          }
        },
        {
          "session": "c901d890-a52c-3c7c-12b9-b222dbc2aa5d",
          "time": 1448440319973,
          "prettyTime": "Wed Nov 25 2015 00:31:59 GMT-0800 (PST)",
          "timeDrift": -28799070.5,
          "event": "Started challenge",
          "parameters": {
            "title": "Case 1: Playground",
            "route": "case1/playground",
            "case": 1,
            "challenge": 1
          }
        }
      ],
      'actions': [
        {
          'type': 'dialog',
          'text': 'Hello World!',
          'date': Date.now()
        },
        {
          'type': 'dialog',
          'text': 'Is this working?',
          'date': Date.now()
        }        
      ],
      'duration': 13,
      'totalEvents': 6
    };

  res.render('session', {
    title: 'Session',
    session: session
  });
};
