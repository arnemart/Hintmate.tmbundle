Hintmate
========

Simple JSHint bundle for Textmate.

Installation
------------

    cd ~/Library/Avian/Bundles
    git clone https://github.com/arnemart/Hintmate.tmbundle.git

And that should do it.

Usage
-----

### Quick hint

JSHint will be run every time you save a Javascript file or an HTML file containing Javascript, and the results will be shown in a tooltip.

### Regular hint

Hit `^L` to run JSHint on the current file (it does not need to be saved). Nice clickable results will be shown in a separate window.

Options
-------

These configuration options can be added to your `.tm_properties` file, either globally or per project. Everything is optional.

- `TM_HINTMATE_HINTER` - Set this to the path of a JSHint executable if you want to use a custom one.
- `TM_HINTMATE_CONFIG` - By default, Hintmate tries to read your `.jshintrc` file. Set this option to something if you want to use a config file outside your project path.
- `TM_HINTMATE_TRANSFORM` - Set this to the path of an executable file that the Javascript code should be passed through before running JSHint. This is useful if the code needs to be transformed in some way to be valid, e.g the [React JSX parser](http://facebook.github.io/react/docs/jsx-in-depth.html). Executable must accept input on stdin and write output to stdout (or you can use [stdioify](https://github.com/arnemart/stdioify)). Line numbers may not match up after transform, column numbers certainly won’t.
- `TM_HINTMATE_TRANSFORM_ERROR` - If source transform fails, this regex will be used to extract a sensible error message from stderr. If this is not set a generic error message is used.

Limitations
-----------

Hintmate will only read configuration options from `.jshintrc` files, config in `package.json` is not supported.
