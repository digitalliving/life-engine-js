import Promise = require('bluebird');

const DEBUG = false;

function convertParams(params: any) {
    let paramString = "";
    let first = true;
    for (let p in params) {
        if (params.hasOwnProperty(p)) {
            if (!first) {
                paramString += "&";
            }
            paramString += p + "=" + encodeURIComponent(params[p]);
            first = false;
        }
    }
    return paramString;
}

function log(...args: any[]) {
    if (DEBUG) {
        args.unshift("[LifeEngine]", new Date().toISOString())
        if (console && console.log) {
            console.log.apply(console, args);
        }
    }
}

function replaceTokens(str: string, data: any) {
    for (let key in data) {
        let r = new RegExp('{' + key + '}', 'g');
        str = str.replace(r, data[key]);
    }

    return str;
}

interface AuthListener {
    (authenticated: boolean): void;
}

interface ProgressListener {
    (e: ProgressEvent): void;
}

interface Methods {
    [key: string]: string;
}

class Config {
    apiUrl: string;
    clientId: string;
}

class ApiWrapper {
    defaultUri: string;
    lifeEngine: LifeEngine;
    methods: Methods;

    constructor(lifeEngine: LifeEngine, defaultUri: string, methods: Methods = {}) {
        this.lifeEngine = lifeEngine;
        this.defaultUri = defaultUri;
        this.methods = methods;
    }

    _getApiUrl(method: string, args: any) {
        let path = this.defaultUri;

        if (this.methods[method]) {
            path = this.methods[method];
        }

        path = replaceTokens(path, args);

        let uri = `${this.lifeEngine.getApiUrl()}/${path}`;

        if (uri.indexOf("{") !== -1) {
            throw new Error(`You are probably missing an argument, the API URL ended up as ${uri} when trying to make a ${method} request`);
        }

        return uri;
    }

    _call(method: string, data: any = {}, formData: FormData = undefined, listener: ProgressListener = undefined): Promise<{}> {
        if (method === "GET" && formData) {
            throw new Error("Can't use FormData on GET requests");
        }

        let _wrapper = this;
        return new Promise(function (resolve: { (data: any): void }, reject: { (data: any): void }) {
            let request = new XMLHttpRequest();
            let args = JSON.parse(JSON.stringify(data));

            let uri = _wrapper._getApiUrl(method, args);

            if (method === "GET") {
                let params = convertParams(args);
                if (params !== "") {
                    uri += '?' + params;
                }
            }

            if (formData) {
                for(let key in data) {
                    if (data.hasOwnProperty(key)) {
                        formData.append(key, data[key]);
                    }
                }
            }

            if (listener) {
                request.upload.onprogress = listener;
            }

            log(`Making a ${method} request to ${uri}`);

            request.open(method, uri, true);

            let token = _wrapper.lifeEngine.getAuthToken();
            if (token) {
                request.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            if (method === "GET") {
                request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                request.send();
            } else if (formData) {
                request.send(formData);
            } else {
                request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                request.send(convertParams(data));
            }

            request.onload = function () {
                let status = request.status;
                let data = undefined;
                if (request.responseText !== '') {
                    data = JSON.parse(request.responseText);
                }

                if (status >= 400) {
                    reject({data: data, status: status});
                } else {
                    resolve({data: data, status: status});
                }
            };

            request.onerror = function () {
                let data = undefined;
                if (request.responseText !== '') {
                    JSON.parse(request.responseText);
                }
                reject({data: data, status: request.status});
            };
        });
    }

    post(data: any): Promise<{}> {
        return this._call("POST", data);
    }

    get(data: any): Promise<{}> {
        return this._call("GET", data);
    }

    put(data: any): Promise<{}> {
        return this._call("PUT", data);
    }

    delete(data: any): Promise<{}> {
        return this._call("DELETE", data);
    }
}

class LifeEngine {
    _authToken: string;
    _config: Config;
    _authChangeListeners: AuthListener[] = [];
    _authenticated: boolean = false;

    // acceptTerms: ApiWrapper;
    // auth: ApiWrapper;

    // Create or delete calendar entries
    calendar: ApiWrapper;

    //connectionRequest: ApiWrapper;
    //connectionRequestAction: ApiWrapper;
    data: ApiWrapper;
    entity: ApiWrapper;
    entities: ApiWrapper;
    //favorites: ApiWrapper;
    files: ApiWrapper;
    folders: ApiWrapper;
    //images: ApiWrapper;
    keyvalue: ApiWrapper;
    mail: ApiWrapper;
    me: ApiWrapper;
    messageComments: ApiWrapper;
    messageRead: ApiWrapper;
    messages: ApiWrapper;
    notes: ApiWrapper;
    notifications: ApiWrapper;
    password: ApiWrapper;
    personal: ApiWrapper;
    pushNotifications: ApiWrapper;
    relations: ApiWrapper;
    roles: ApiWrapper;
    search: ApiWrapper;
    sepa: ApiWrapper;
    signIn: ApiWrapper;
    signOut: ApiWrapper;
    staff: ApiWrapper;
    taskAction: ApiWrapper;
    taskComments: ApiWrapper;
    taskInbox: ApiWrapper;
    taskList: ApiWrapper;
    taskTemplates: ApiWrapper;
    taxReport: ApiWrapper;
    userAdd: ApiWrapper;
    _upload: ApiWrapper;

    constructor(config: Config) {
        this.setConfig(config);
        this.me = new ApiWrapper(this, "me");
        this.calendar = new ApiWrapper(this, "tasks/{DLId}", {
            "POST": "tasks",
        });
        this.files = new ApiWrapper(this, "files/{DLId}");
        this.folders = new ApiWrapper(this, "files/folder/{DLId}", {
            "POST": "entities/{DLId}/folder",
        });
        this.taskInbox = new ApiWrapper(this, "inbox/tasks");
        this.taskList = new ApiWrapper(this, "tasks");
        this.taskComments = new ApiWrapper(this, "tasks/{DLId}/comment", {
            "DELETE": "tasks/{DLId}/comment/{commentId}"
        });
        this.data = new ApiWrapper(this, "data");
        this.entity = new ApiWrapper(this, "entities/{DLId}");
        this.entities = new ApiWrapper(this, "entities", {
            "DELETE": "entities/{DLId}"
        });
        this.messages = new ApiWrapper(this, "messages", {
            "PUT": "messages/{DLId}",
            "DELETE": "messages/{DLId}"
        });
        this.messageComments = new ApiWrapper(this, "messages/{DLId}/comment", {
            "DELETE": "messages/{DLId}/comment/{commentId}"
        });
        this.messageRead = new ApiWrapper(this, "messages/{DLId}/read");
        this._upload = new ApiWrapper(this, "entities/{DLId}/upload");
    }

    upload(file: File, data: any, onprogress: ProgressListener) {
        let form = <HTMLFormElement>document.createElement("FORM");
        form.setAttribute("enctype", "multipart/form-data");
        let fd = new FormData(form);
        fd.append("upload", file);

        return this._upload._call("POST", data, fd, onprogress);
    }

    setConfig(config: Config) {
        if (typeof config.apiUrl !== "string" || (config.apiUrl.indexOf("http://") === -1 && config.apiUrl.indexOf("https://") === -1)) {
            throw new Error(`Cannot set LifeEngine configuration. Invalid apiUrl in config: ${config.apiUrl}`);
        }
        if (typeof config.clientId !== "string" || config.clientId.length === 0) {
            throw new Error(`Cannot set LifeEngine configuration. Invalid clientId: ${config.clientId}`);
        }
        this._config = config;
    }

    getApiUrl(): string {
        return this._config.apiUrl;
    }

    getClientId(): string {
        return this._config.clientId;
    }

    authenticate() {
        throw new Error("Not implemented. Please refer to https://github.com/digitalliving/life-engine-oauth-example/blob/master/index.html");
    }

    clearAuth() {
        this._authToken = undefined;
        this._authenticated = false;
        this._emitAuthChange();
    }

    refreshAuthToken() {
        this._emitAuthChange();
    }

    getAuthToken(): string {
        return this._authToken;
    }

    setAuthToken(token: string) {
        this._authToken = token;
        this._authenticated = !!token;

        this._emitAuthChange();
    }

    addAuthChangeListener(listener: AuthListener) {
        this._authChangeListeners.push(listener);
    }

    removeAuthChangeListener(listener: AuthListener) {
        let index = this._authChangeListeners.indexOf(listener);
        if (index >= 0) {
            this._authChangeListeners.splice(index, 1);
        }
    }

    _emitAuthChange() {
        this._authChangeListeners.forEach(function (l: AuthListener) {
            l(this._authenticated)
        }.bind(this));
    }

}

// WebPack 'exports' -object
declare let module: any;
module.exports = LifeEngine;

log("LifeEngine loaded");
