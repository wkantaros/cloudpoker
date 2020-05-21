module.exports.asyncErrorHandler = function(f) {
    return async function(req, res, next) {
        try {
            await f(req, res, next);
        } catch (error) {
            next(error)
        }
    }
}

module.exports.sleep = function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports.asyncSchemaValidator = function(schema, asyncCallback) {
    return async function(data) {
        console.log(data);
        let value;
        try {
            value = await schema.validateAsync(data);
        } catch (validationError) {
            console.log(validationError);
            return;
        }
        try {
            await asyncCallback(value);
        } catch(e) {
            console.error(e);
        }
    }
}

module.exports.formatJoiError = function(error) {
    let message = error.details[0].message;
    const errorType = error.details[0].type
    if (errorType.includes("string.pattern")) {
        message = `\"${error.details[0].context.key}\"`
        const regexName = error.details[0].context.name;
        if (regexName === 'no-punctuation') {
            message += ' cannot contain punctuation'
        } else if (regexName === 'no-whitespace') {
            message += ' cannot contain whitespace'
        } else {
            console.log('ERROR: unknown regex pattern failure. data:', error)
            message += ' is invalid'
        }
    }
    return message
}