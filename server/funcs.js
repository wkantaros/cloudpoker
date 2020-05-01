module.exports.asyncErrorHandler = function(f) {
    return async function(req, res, next) {
        try {
            await f(req, res, next);
        } catch (error) {
            next(error)
        }
    }
};

module.exports.sleep = async function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

module.exports.asyncSchemaValidator = function(schema, asyncCallback) {
    return async function(data) {
        console.log(data);
        let value;
        try {
            value = await schema.validateAsync(data);
        } catch (validationError) {
            return;
        }
        try {
            await asyncCallback(value);
        } catch(e) {
            console.error(e);
        }
    }
}