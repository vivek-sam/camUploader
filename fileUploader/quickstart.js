const fs = require('fs');
var path = require("path");
var Sync = require('sync');

const winston = require('winston');

const readline = require('readline');
const {google} = require('googleapis');

const logDir = '../../working/log';
const locksDir = '../../working/lock';

const lock1 = `${locksDir}/filelist1.lock`
const lock2 = `${locksDir}/filelist2.lock`
const data1 = `${locksDir}/filelist1.data`
const data2 = `${locksDir}/filelist2.data`
const filedone = `${locksDir}/filelist.done`

// If modifying these scopes, delete credentials.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const TOKEN_PATH = 'credentials.json';


// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const tsFormat = () => (new Date()).toLocaleTimeString();
var logger = new (winston.Logger)({
    transports: [
    // colorize the output to the console
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: 'silly'
    }),
    new (winston.transports.File)({
      filename: `${logDir}/uploadresults.log`,
      timestamp: tsFormat,
      datePattern: 'yyyy-MM-dd',
      prepend: true,
      level: 'silly'
    })
    ]
});


// Load client secrets from a local file.
fs.readFile('client_secret.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
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
      if (err) return callback(err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
  
  /*
  drive.files.list({
    pageSize: 10,
    fields: 'nextPageToken, files(id, name)',
  }, (err, {data}) => {
    if (err) return logger.error('The API returned an error: ' + err);
    const files = data.files;
    if (files.length) {
      console.info('Files:');
      files.map((file) => {
        console.info(`${file.name} (${file.id})`);
      });
    } else {
      console.info('No files found.');
    }
  });
  */


  // check which file to be uploaded...
  if (fs.existsSync(lock1)) {
    //as such a lock must not exist.. as we will read, upload and unlock syncronously... 
  } else {
    if (fs.existsSync(data1)) {

      //no lock.. lock the file and take it for reading...
      fs.closeSync(fs.openSync(lock1, 'w'));
      logger.info('Created Lock 1 for uploading...');
      
      //read and upload everything from this file.... 
      Sync(function(){

        fs.readFileSync(data1).toString().split('\n').forEach(function (fullpath) { 
          
          logger.info("File 1 : " + fullpath);

          fullpath = fullpath.trim();

          if(fullpath.trim()) {
    
            // upload this file.... 
            var filename = path.basename(fullpath);
            var mType = 'video/H264';
            if(path.extname(filename) === '.jpg') {
              mType = 'image/jpeg';
            } else if(path.extname(filename) === '.264') {
              mType = 'video/H264';
            }
            //for now upload only images...
            if(mType === 'image/jpeg') {
              var fileMetadata = {
                'name': filename
              };

              var media = {
                mimeType: mType,
                body: fs.createReadStream(fullpath)
              };
              
              drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
              }, function (err, file) {
                if (err) {
                  // Handle error
                  logger.info("Failed..." + fullpath);
                  logger.error("Error" + err);
                  fs.appendFileSync(filedone, "Error : " + `${file.name}` + "\r\n");
                } else {
                  logger.info("Succeeded... File Id: " + `${file.id}`);
                  fs.appendFileSync(filedone, "Uploaded : " + `${file.name}` + "\r\n");
                }
              }); 
            }
          }
        });
    });

      //delete the lock after uploading...
      fs.unlinkSync(lock1);
      logger.info('Deleting Lock 1...');
      //also delete the file 1.. since its over.. 
      fs.unlinkSync(data1);
      logger.info('Deleting File 1...');
    } else {
      //delete the lock
      fs.unlinkSync(lock1);
      logger.info('Deleting Lock 1...');
    }

    if(fs.existsSync(data2)) {
      //this means there is a data 2 which we need to work on
      
      //first lock the file... 
      fs.closeSync(fs.openSync(lock2, 'w'));
      logger.info('Created Lock 2 for uploading...');
      
      Sync(function(){
        fs.readFileSync(data2).toString().split('\n').forEach(function (fullpath) { 
          logger.info("File 2 : " + fullpath);

          fullpath = fullpath.trim();

          if(fullpath.trim()) {
            // upload this file.... 
            var filename = path.basename(fullpath);
            logger.info("File Type : " + path.extname(filename));
            var mType = 'video/H264';
            if(path.extname(filename) === '.jpg') {
              mType = 'image/jpeg';
            }

            logger.info("mediaType : " + mType);
            

            if(mType === 'image/jpeg') {
              
              var fileMetadata = {
                'name': filename
              };

              logger.info("Uploading File : " + fullpath);
              var media = {
                mimeType: mType,
                body: fs.createReadStream(fullpath)
              };
              
              drive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id'
              }, function (err, file) {
                if (err) {
                  // Handle error
                  logger.info("Failed..." + fullpath);
                  logger.error("Error" + err);
                  fs.appendFileSync(filedone, "Error : " + `${file.name}` + "\r\n");
                } else {
                  logger.info("Succeeded... File Id: " + `${file.id}` + "\r\n");
                  fs.appendFileSync(filedone, "Uploaded : " + `${file.name}` + "\r\n");
                }
              });
            }
          }
        });
      });
      //delete the lock after uploading...
      fs.unlinkSync(lock2);
      logger.info('Deleting Lock 2...');
      fs.unlinkSync(data2);
      logger.info('Deleting File 2...');
    } else {

      //check of lock exists.. if yes delete it...
      if(fs.existsSync(lock2)) {
        fs.unlinkSync(lock2); // delete it because the file does not exist...
        logger.info('Deleting Lock 2...');
      }
    }
  }
}
