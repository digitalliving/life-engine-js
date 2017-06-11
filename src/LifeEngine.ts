import Promise = require('bluebird');
import OAuth = require('@zalando/oauth2-client-js');

const DEBUG = true;

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

interface AuthListener {
    (authenticated: boolean): void;
}

class Config {
    apiUrl: string;
    clientId: string;
}

class ApiWrapper {
    endpoint: string;
    lifeEngine: LifeEngine;

    constructor(lifeEngine: LifeEngine, endpoint: string) {
        this.lifeEngine = lifeEngine;
        this.endpoint = `${lifeEngine.getApiUrl()}/${endpoint}`;
    }

    _call(method: string, data: any): Promise<{}> {
        let _wrapper = this;
        return new Promise(function (resolve: { (data: any): void }, reject: { (data: any): void }) {
            let request = new XMLHttpRequest();
            let uri = _wrapper.endpoint;
            if (method === "GET") {
                uri += '?' + convertParams(data);
            }

            log(`Making a ${method} request to ${uri}`);

            request.open(method, uri, true);

            let token = _wrapper.lifeEngine.getAuthToken();
            if (token) {
                request.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
            if (method === "GET") {
                request.send();
            } else {
                request.send(convertParams(data));
            }
            request.onload = function () {
                let status = request.status;
                let data = JSON.parse(request.responseText);
                resolve({data: data, status: status});
            };
            request.onerror = function () {
                let data = JSON.parse(request.responseText);
                reject(data);
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
    _oauthProvider: OAuth.Provider;

    // acceptTerms: ApiWrapper;
    // auth: ApiWrapper;
    calendar: ApiWrapper;
    //connectionRequest: ApiWrapper;
    //connectionRequestAction: ApiWrapper;
    data: ApiWrapper;
    entity: ApiWrapper;
    //favorites: ApiWrapper;
    files: ApiWrapper;
    images: ApiWrapper;
    keyvalue: ApiWrapper;
    mail: ApiWrapper;
    messageComments: ApiWrapper;
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
    taskTemplates: ApiWrapper;
    taxReport: ApiWrapper;
    userAdd: ApiWrapper;

    constructor(config: Config) {
        this.setConfig(config);
        this.calendar = new ApiWrapper(this, "tasks");
        this.data = new ApiWrapper(this, "data");
        this.entity = new ApiWrapper(this, "entities");
        this.messages = new ApiWrapper(this, "messages");
        this._oauthProvider = new OAuth.Provider({
            id: "digitalliving",
            authorization_url: `${this.getApiUrl()}/auth/authorize`,
            storage: undefined,
        });
    }

    checkOAuthReturn() {
        try {
            let response = this._oauthProvider.parse(window.location.href);
            this._authToken = this._oauthProvider.getAccessToken();
            this._emitAuthChange();
        } catch (e) {
            if (e.message.indexOf("access_token is not present") !== -1) {
                // Not a return url
                return;
            }

            log("Failed to parse OAuth response", e);
        }
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
        let request = new OAuth.Request({
            response_type: "token",
            metadata: {},
            scope: "",
            client_id: this._config.clientId,
            redirect_uri: String(window.location),
            state: String(Math.random())
        });

        let uri = this._oauthProvider.requestToken(request);
        this._oauthProvider.remember(request);
        window.location.href = uri;
    }

    clearAuth() {
        this._emitAuthChange();
    }

    refreshAuthToken() {
        this._emitAuthChange();
    }

    getAuthToken(): string {
        return this._authToken;
    }

    setAuthToken(token: string) {
        this._authToken = token
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
