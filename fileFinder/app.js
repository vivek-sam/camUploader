'use strict';
const winston = require('winston');
const fs = require('fs');

var dirwatch = require("./modules/DirectoryWatcher.js");

const env = process.env.NODE_ENV || 'development';
const logDir = '../../working/log';
const locksDir = '../../working/lock';

// Create the log directory if it does not exist
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Create the locks directory if it does not exist
if (!fs.existsSync(locksDir)) {
    fs.mkdirSync(locksDir);
}

const tsFormat = () => (new Date()).toLocaleTimeString();
var logger = new (winston.Logger)({
    transports: [
    // colorize the output to the console
    new (winston.transports.Console)({
      timestamp: tsFormat,
      colorize: true,
      level: 'info'
    }),
    new (winston.transports.File)({
      filename: `${logDir}/results.log`,
      timestamp: tsFormat,
      datePattern: 'yyyy-MM-dd',
      prepend: true,
      level: env === 'development' ? 'verbose' : 'info'
    })
    ]
});
  
// Create a monitor object that will watch a directory
// and all it's sub-directories (recursive) in this case
// we'll assume you're on a windows machine with a folder 
// named "sim" on your c: drive.
// should work on both linux and windows, update the path
// to some appropriate test directory of your own.
// you can monitor only a single folder and none of its child
// directories by simply changing the recursive parameter to
// to false
var directoryMonitor = new dirwatch.DirectoryWatcher("/srv/dev-disk-by-label-MyDrive/mydrive/camvideos", true);

// start the monitor and have it check for updates
// every half second.
directoryMonitor.start(500);

// Log to the console when a file is removed
directoryMonitor.on("fileRemoved", function (filePath) {
    logger.info("File Deleted: " + filePath);
});

// Log to the console when a folder is removed
directoryMonitor.on("folderRemoved", function (folderPath) {
    logger.info("Folder Removed: " + folderPath);
});

// log to the console when a folder is added
directoryMonitor.on("folderAdded", function (folderPath) {
    logger.info("Folder Added: " + folderPath);
});

// Log to the console when a file is changed.
directoryMonitor.on("fileChanged", function (fileDetail, changes) {
    logger.info("File Changed: " + fileDetail.fullPath);
  for (var key in changes) {
    logger.info("  + " + key + " changed...");
    logger.info("    - From: " + ((changes[key].baseValue instanceof Date) ? 
    changes[key].baseValue.toISOString() : changes[key].baseValue));
    logger.info("    - To  : " + ((changes[key].comparedValue instanceof Date) ? 
    changes[key].comparedValue.toISOString() : changes[key].comparedValue));
  }
});

// log to the console when a file is added.
directoryMonitor.on("fileAdded", function (fileDetail) {
    logger.info("File Added: " + fileDetail.fullPath);

    //Now that a file is added.. 
});

// Let us know that directory monitoring is happening and where.
logger.info("Directory Monitoring of " + directoryMonitor.root + " has started");