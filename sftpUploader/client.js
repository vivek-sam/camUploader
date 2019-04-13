var Client = require('ssh2').Client;

var UploadFile



// print process.argv
process.argv.forEach(function (val, index, array) {
    console.log(index + ': ' + val);
});

process.exit();

var conn = new Client();

conn.on('ready', function () {
    console.log('Client :: ready');
    conn.sftp(function (err, sftp) {
        if (err) throw err;
        sftp.readdir('/sftpuser/camData', function (err, list) {
            if (err) throw err;
            console.dir(list);
            // now that we have this.. lets upload a file...

            var fs = require("fs"); // Use node filesystem
            var readStream = fs.createReadStream('F:\\Vivek\\Church\\ChurchLoadSeriesImages\\LOAD Revise 2018\\cover page - volume 1.png');
            var writeStream = sftp.createWriteStream('/sftpuser/camData/cover page - volume 1.png');

            writeStream.on('close', function () {
                console.log("- file transferred succesfully");
            });

            writeStream.on('end', function () {
                console.log("sftp connection closed");
                conn.close();
                conn.end();
            });

            // initiate transfer of file
            readStream.pipe(writeStream);

        });

        sftp.on('end', () => {
            console.log('end event');
        });

        sftp.on('close', () => {
            console.log('close event');
        });
    });
}).connect({
    host: 'viveksam.southindia.cloudapp.azure.com',
    port: 22,
    username: 'sftpuser',
    privateKey: require('fs').readFileSync('C:\\Users\\Vivek\\.ssh\\sftp_id_rsa')
});