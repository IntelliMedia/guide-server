/**
 * GET /
 * Monitor page.
 */
exports.index = (req, res) => {

  var sessions = [
    {
      'id': '3ea659df-03f1-4e52-b021-53f7c39adc7f',
      'student': {
        'id': '433535225',
      },
      'duration': 7163,
      'totalEvents': 124
    },
    {
      'id': 'b67479c4-8f8f-4cc6-904b-8e535cc9e673',
      'student': {
        'id': '3237983',
      },
      'duration': 12,
      'totalEvents': 5
    },
    {
      'id': 'ac95dac2-c2b8-4f79-9dcb-c45bb4a46581',
      'student': {
        'id': '1238973',
      },
      'duration': 2739,
      'totalEvents': 176
    }        
  ];

  res.render('monitor', {
    title: 'Monitor',
    sessions: sessions
  });
};
