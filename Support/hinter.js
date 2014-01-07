/*jshint node:true*/
var hinter = process.env.TM_HINTMATE_HINTER || process.env.TM_BUNDLE_SUPPORT + '/node_modules/.bin/jshint';
var cp = require('child_process');
var path = require('path');
var fs = require('fs');
var cwd = process.env.TM_PROJECT_DIRECTORY || process.env.TM_BUNDLE_SUPPORT;

module.exports = {
    simple: function(source, cb) {
        hint(source, function(result) {
            cb(formatSimple(result));
        });
    },
    html: function(source, cb) {
        hint(source, function(result) {
            cb(formatHtml(result));
        });
    }
};

// Takes source code and a callback function, returns an array of JSHint errors.
function hint(source, cb) {
    var called = false;
    var args = ['-'];
    var config = process.env.TM_HINTMATE_CONFIG || findConfigFile(cwd);
    if (config) {
        args.unshift('--config', config);
    }
    var h = cp.spawn(hinter, args, {
        cwd: cwd
    });
    if (process.env.TM_HINTMATE_TRANSFORM) {
        var t = cp.exec(process.env.TM_HINTMATE_TRANSFORM, {
            cwd: cwd
        }, function(err, stdout, stderr) {
            if (err && err.code !== 0) {
                if (process.env.TM_HINTMATE_TRANSFORM_ERROR) {
                    var error = stderr.match(new RegExp(process.env.TM_HINTMATE_TRANSFORM_ERROR));
                    if (error && !called) {
                        called = true;
                        cb(error[0]);
                        return;
                    }
                }
                if (!called) {
                    called = true;
                    cb('Error during transform');
                }
            }
        });
        t.stdout.pipe(h.stdin);
        t.stdin.end(prepareSource(source));
    } else {
        h.stdin.end(prepareSource(source));
    }
    h.stdout.on('data', function(data) {
        if (!called) {
            called = true;
            cb(parse(data.toString()));
        }
    });
    h.on('close', function() {
        if (!called) {
            called = true;
            cb([]);
        }
    });
}

var lineRegex = /^.*?: line (\d+), col (\d+), (.+)$/;

// Takes raw JSHint output and parses it into a nice array of error messages
function parse(data) {
    return data.split('\n').slice(0, -2).reduce(function(memo, raw) {
        var matches = raw.match(lineRegex);
        if (matches) {
            memo.push({
                line: parseInt(matches[1], 10),
                col: parseInt(matches[2], 10),
                message: matches[3]
            });
        }
        return memo;
    }, []).sort(function(a, b) {
        return a.line - b.line;
    });
}

// Strip everything but newlines
function stripEverythingButNewlines(text) {
    return text.replace(/.*/g, '');
}

// If input is an HTML file, strip out all HTML (leave only newlines)
function prepareSource(source) {
    if (process.env.TM_SCOPE.match('text.html')) {
        if (true||source.match(/<script[^>]*>.*<\/script[^>]*>/m)) {
            return source.replace(/^(.|\r?\n)*?<script[^>]*>/m, stripEverythingButNewlines)
                .replace(/<\/script[^>]*>(.|\r?\n)*?<script[^>]*>/gm, stripEverythingButNewlines)
                .replace(/<\/script[^>]*>(.|\r?\n)*$/m, stripEverythingButNewlines);
        } else {
            return '';
        }
    }
    return source;
}

// Return a simple textual representation of error messages
function formatSimple(errors, limit) {
    if (limit === undefined) {
        limit = 5;
    }
    if (typeof errors === 'string') {
        return errors;
    } else {
        return errors.slice(0, limit).map(function(error) {
            return 'Line ' + error.line + ', col ' + error.col + ': ' + error.message;
        }).join('\n') + (errors.length > limit ? '\nFound ' + errors.length + ' errors total.' : '');
    }
}

function wrapHtml(content) {
    return '<!DOCTYPE html>' +
    '<html lang="en">' +
    '<head>' +
    '<meta charset="UTF-8" />' +
    '<title>Hintmate</title>' +
    '<style type="text/css">' +
    'body { font-family: helvetica, sans-serif; background-color: #222; color: #ddd }' +
    'a, a:visited, a:active { color: white }' +
    'a { display: block; margin: 5px; padding: 6px 4px; border: 1px solid #444; border-radius: 5px; text-decoration: none; }' +
    '.dim { color: #999 }' +
    'ul { list-style-type: none; margin: 0; padding: 0 }' +
    '</style>' +
    '</head>' +
    '<body>' +

    content +

    '</body>' +
    '</html>';
}

// Return HTML formatted error messages
function formatHtml(errors) {
    if (errors.length === 0) {
        return wrapHtml('<p>No errors!</p>');
    } else if (typeof errors === 'string') {
        return wrapHtml('<p>' + errors.replace('\n', '<br>') + '</p>');
    } else {
        return wrapHtml('<p>' + errors.length + ' error' + (errors.length === 1 ? '' : 's') + '</p><ul>' + errors.reduce(function(html, error) {
            return html + '<li><a href="txmt://open?url=file://' + process.env.TM_FILEPATH + '&line=' + error.line + '&column=' + error.col + '"><span class="dim">Line ' + error.line + ', col ' + error.col + ':</span> ' + error.message + '</a></li>';
        }, '') + '</ul>');
    }
}

function findConfigFile(dir) {
    var filename = path.normalize(path.join(dir, '.jshintrc'));
    if (fs.existsSync(filename)) {
        return filename;
    }

    var parent = path.resolve(dir, '../');
    if (dir === parent) {
        return null;
    }

    return findConfigFile(parent);
}