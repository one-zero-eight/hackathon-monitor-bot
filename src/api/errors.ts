export class ApiError extends Error {}
export class NetworkError extends ApiError {}
export class RequestError extends ApiError {}
export class ResultParseError extends ApiError {}
