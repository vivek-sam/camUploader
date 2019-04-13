const fs = require('fs');
var path = require("path");
var Sync = require('sync');

const winston = require('winston');

const readline = require('readline');

const logDir = '../../working/log';
const locksDir = '../../working/lock';
const sftpuploader = 'client.js';

const lock1 = `${locksDir}/filelist1.lock`
const lock2 = `${locksDir}/filelist2.lock`
const data1 = `${locksDir}/filelist1.data`
const data2 = `${locksDir}/filelist2.data`
const filedone = `${locksDir}/filelist.done`

var childProcess = require('child_process');

function runScript(scriptPath, callback) {

  // keep track of whether callback has been invoked to prevent multiple invocations
  var invoked = false;

  var process = childProcess.fork(scriptPath);

  // listen for errors as they may prevent the exit event from firing
  process.on('error', function (err) {
    if (invoked) return;
    invoked = true;
    callback(err);
  });

  // execute the callback once the process has finished running
  process.on('exit', function (code) {
    if (invoked) return;
    invoked = true;
    var err = code === 0 ? null : new Error('exit code ' + code);
    callback(err);
  });
}

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

function listFiles() {
  // check which file to be uploaded...
  if (fs.existsSync(lock1)) {
    //as such a lock must not exist.. as we will read, upload and unlock syncronously... 
  } else {
    if (fs.existsSync(data1)) {

      //no lock.. lock the file and take it for reading...
      fs.closeSync(fs.openSync(lock1, 'w'));
      logger.info('Created Lock 1 for uploading...');

      //read and upload everything from this file.... 
      Sync(function () {

        fs.readFileSync(data1).toString().split('\n').forEach(function (fullpath) {

          logger.info("File 1 : " + fullpath);

          fullpath = fullpath.trim();

          if (fullpath.trim()) {

            // upload this file.... 
            var filename = path.basename(fullpath);
            var mType = 'video/H264';
            if (path.extname(filename) === '.jpg') {
              mType = 'image/jpeg';
            } else if (path.extname(filename) === '.264') {
              mType = 'video/H264';
            }
            //for now upload only images...
            if (mType === 'image/jpeg') {
              var fileMetadata = {
                'name': filename
              };
              //add code to upload the file...
              runScript(sftpuploader, function (err) {
                if (err) throw err;
                console.log('finished running ' + sftpuploader);
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

    if (fs.existsSync(data2)) {
      //this means there is a data 2 which we need to work on

      //first lock the file... 
      fs.closeSync(fs.openSync(lock2, 'w'));
      logger.info('Created Lock 2 for uploading...');

      Sync(function () {
        fs.readFileSync(data2).toString().split('\n').forEach(function (fullpath) {
          logger.info("File 2 : " + fullpath);

          fullpath = fullpath.trim();

          if (fullpath.trim()) {
            // upload this file.... 
            var filename = path.basename(fullpath);
            logger.info("File Type : " + path.extname(filename));
            var mType = 'video/H264';
            if (path.extname(filename) === '.jpg') {
              mType = 'image/jpeg';
            }

            logger.info("mediaType : " + mType);


            if (mType === 'image/jpeg') {

              var fileMetadata = {
                'name': filename
              };

              logger.info("Uploading File : " + fullpath);
              //add code to upload the file
              runScript(sftpuploader, function (err) {
                if (err) throw err;
                console.log('finished running ' + sftpuploader);
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
      if (fs.existsSync(lock2)) {
        fs.unlinkSync(lock2); // delete it because the file does not exist...
        logger.info('Deleting Lock 2...');
      }
    }
  }
}

listFiles();