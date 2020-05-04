export function asyncErrorHandler(f) {
    return async function(req, res, next) {
        try {
            await f(req, res, next);
        } catch (error) {
            next(error)
        }
    }
}

export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function asyncSchemaValidator(schema, asyncCallback) {
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