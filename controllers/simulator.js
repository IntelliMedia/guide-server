var fs = require('fs');

const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'SendGrid',
  auth: {
    user: process.env.SENDGRID_USER,
    pass: process.env.SENDGRID_PASSWORD
  }
});

var current = 0;
var loadedEvents = []; 
var sentEvents = []; 

/**
 * GET /simulator
 * Simulator form page.
 */
exports.getSimulator = (req, res) => {
    
  res.render('simulator', {
    title: 'Simulator',
    sentEvents
  });
};

/**
 * POST /simulator
 * Send a simulator form via Nodemailer.
 */
exports.postFileUpload = (req, res, next) => {
  
  try
  {
    current = 0;
    sentEvents = [];
    loadedEvents = JSON.parse(fs.readFileSync(req.file.path), 'utf8');
    fs.unlink(req.file.path);
    req.flash('success', { msg: 'File was uploaded successfully.' });
  }
  catch(e)
  {
    req.flash('errors', { msg: 'Unable to parse log file. ' + e.message }); 
  }  
  
  res.redirect('/simulator'); 
};

function sendToIts() {
    sentEvents.push(events[++current])
}

exports.postSimulator = (req, res) => {
  req.assert('name', 'Name cannot be blank').notEmpty();
  req.assert('email', 'Email is not valid').isEmail();
  req.assert('message', 'Message cannot be blank').notEmpty();

  const errors = req.validationErrors();

  if (errors) {
    req.flash('errors', errors);
    return res.redirect('/simulator');
  }

  const mailOptions = {
    to: 'your@email.com',
    from: `${req.body.name} <${req.body.email}>`,
    subject: 'Simulator Form | Guide',
    text: req.body.message
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      req.flash('errors', { msg: err.message });
      return res.redirect('/simulator');
    }
    req.flash('success', { msg: 'Email has been sent successfully!' });
    res.redirect('/simulator');
  });
};
