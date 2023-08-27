import {
    ReasonPhrases,
    StatusCodes,
    getReasonPhrase,
    getStatusCode,
} from 'http-status-codes';

export default {
    success: function ({ body, statusCode = StatusCodes.OK }) {
        return {
            statusCode: statusCode,
            body: JSON.stringify(body)
        }
    },

    error: function ({ body, statusCode = StatusCodes.BAD_REQUEST }) {
        return {
            statusCode: statusCode,
            body: JSON.stringify(body)
        }
    }
}