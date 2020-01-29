const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const open = require("open");
const build_index = require("./lib/build_index.js");
const {exec} = require("child_process");

// index folder for the documents
const INDEX_FOLDER = "1quPjq6yvbPtr6ropnlfAQbUoFg5f0Eug";
/*
  Notes:
  If the file is a PDF, it'll be downloaded raw.
  If the file is a google doc, it'll be converted by the Drive API

  Format for the description field:
  order include watermark title
  01    ja    links       A file that will be included, watermarked left
  02    nein  rechts      A file that will not be included
  03    ja    kein        A file that will be included, not watermarked
*/


// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly', 'https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), build_pdf);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}


function download_file(drive, file) {

  function get_file(file, done) {
    var dest = fs.createWriteStream("./pdf/" + file.id + ".pdf");
    drive.files.get({
      fileId: file.id,
      alt: 'media'
    }, {responseType: 'stream'},
      function(err, res) {
          res.data
          .on("end", () => {
            done(file)
          })
          .on("error", (e) => {
              console.og(e)
          })
          .pipe(dest)
      }
    )
  }

  function export_pdf(file, done) {
    const dest = fs.createWriteStream("./pdf/" + file.id + ".pdf");
    drive.files.export({
        fileId: file.id,
        mimeType: 'application/pdf'
    }, {
        responseType: 'stream'
    }, function(err, response){ 

      if(err)return done(err);
      
      response.data.on('error', err => {
          done(err);
      }).on('end', ()=>{
          done(file);
      })
      .pipe(dest);
   });
  }

  return new Promise((resolve, reject) => {
    let fparts = file.name.split(".");
    let extension = fparts[fparts.length-1];
    if (extension === "pdf") {
      // get file
      console.log("Downloading pdf: " + file.name);
      get_file(file, resolve);
    } else {
      console.log("Converting to PDF: " + file.name);
      export_pdf(file, resolve);
    }
  });
}


function pdf_cat(toc) {
  return new Promise((resolve, reject) => {
    let pdf_list = toc.reduce((cmds, file) => {
      cmds += ` ./pdf/${file.id}.pdf`;
      return cmds;
    }, "");
    let cmd = `pdftk ${pdf_list} cat output ./pdf/output.pdf`;
    exec(cmd, resolve);
  });
}

/**
 * Downloads and builds a PDF from a specified folder
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function build_pdf(auth) {
  const drive = google.drive({version: 'v3', auth});

  build_index(drive, INDEX_FOLDER, function (pdf_toc) {
    // download each file
    let files_to_download = pdf_toc.included.map((file) => download_file(drive, file));
    //console.log(files_to_download);
    Promise.all(files_to_download).then((stuff) => {
      console.log("all things done");
      pdf_cat(pdf_toc.included).then(function () {
        open("./pdf/output.pdf");
      })
    });
  });

}
