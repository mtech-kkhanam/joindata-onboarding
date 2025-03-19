var MyJoinData;
(function (MyJoinData) {
    var Environment = (function () {
        function Environment() {
        }
        Environment.apiUrl = 'https://acc.join-data-global.net/purpose-registry/api/v1';
        Environment.keycloakAuthUrl = 'https://acc.join-data-global.net/auth';
        Environment.keycloakScriptUrl = 'https://acc.join-data-global.net/auth/js/keycloak.js';
        Environment.onboardingUrl = 'https://acc.join-data-global.net/onboarding';
        return Environment;
    }());
    MyJoinData.Environment = Environment;
})(MyJoinData || (MyJoinData = {}));
var MyJoinData;
(function (MyJoinData) {
    var HttpClient = (function () {
        function HttpClient(keycloak, baseUrl) {
            this.keycloak = keycloak;
            if (!baseUrl) {
                this.baseUrl = '/';
            }
            else if (!/.*\/$/.test(baseUrl)) {
                this.baseUrl = baseUrl + '/';
            }
            else {
                this.baseUrl = baseUrl;
            }
        }
        HttpClient.prototype.get = function (relativeUri) {
            return this.sendRequest('GET', relativeUri, null);
        };
        HttpClient.prototype.post = function (relativeUri, body) {
            return this.sendRequest('POST', relativeUri, body);
        };
        HttpClient.prototype.sendRequest = function (requestType, relativeUri, body) {
            var _this = this;
            return new PromiseLike(function (resolve, reject) {
                try {
                    var xhr_1 = _this.createXmlHttpRequest(requestType, relativeUri);
                    xhr_1.onreadystatechange = function () {
                        if (xhr_1.readyState === 4) {
                            if (xhr_1.status >= 200 && xhr_1.status < 300) {
                                _this.parseJsonAsync(xhr_1.responseText).then(function (data) { return resolve(data); }).catch(function (err) { return reject(err); });
                            }
                            else {
                                _this.parseJsonAsync(xhr_1.responseText).then(function (data) { return reject(data); }).catch(function () { return reject(xhr_1.responseText); });
                            }
                        }
                    };
                    if (typeof (body) !== 'string') {
                        body = JSON.stringify(body);
                    }
                    xhr_1.send(body);
                }
                catch (error) {
                    reject(error);
                }
            });
        };
        HttpClient.prototype.parseJsonAsync = function (input) {
            return new PromiseLike(function (resolve, reject) {
                if (input == null) {
                    resolve(input);
                }
                else if (typeof (input) === 'string') {
                    try {
                        var json = JSON.parse(input);
                        resolve(json);
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    resolve(input);
                }
            });
        };
        HttpClient.prototype.createXmlHttpRequest = function (requestType, relativeUri) {
            var url = this.baseUrl + relativeUri;
            var xhr = new XMLHttpRequest();
            xhr.open(requestType, url, true);
            xhr.setRequestHeader('Authorization', 'bearer ' + this.keycloak.token);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('Accept', 'application/json');
            return xhr;
        };
        return HttpClient;
    }());
    var PromiseLike = (function () {
        function PromiseLike(resolver) {
            var _this = this;
            this.resolvers = [];
            this.rejectors = [];
            this.isCompleted = false;
            this.hasError = false;
            resolver(function (res) { return _this.resolve(res); }, function (rej) { return _this.reject(rej); });
        }
        PromiseLike.prototype.then = function (resolve) {
            if (this.isCompleted) {
                if (!this.hasError) {
                    resolve(this.data);
                }
            }
            else if (resolve) {
                this.resolvers.push(resolve);
            }
            return this;
        };
        PromiseLike.prototype.catch = function (reject) {
            if (this.isCompleted) {
                if (this.hasError) {
                    reject(this.error);
                }
            }
            else if (reject) {
                this.rejectors.push(reject);
            }
            return this;
        };
        PromiseLike.prototype.resolve = function (data) {
            this.data = data;
            this.isCompleted = true;
            for (var i = 0; i < this.resolvers.length; i++) {
                var resolver = this.resolvers[i];
                resolver(data);
            }
        };
        PromiseLike.prototype.reject = function (error) {
            this.error = error;
            this.isCompleted = true;
            this.hasError = true;
            for (var i = 0; i < this.rejectors.length; i++) {
                var rejector = this.rejectors[i];
                rejector(error);
            }
        };
        return PromiseLike;
    }());
    MyJoinData.PromiseLike = PromiseLike;
    var App = (function () {
        function App() {
            this.messageCallbacks = new Array();
            this.isLoggedIn = false;
        }
        App.initialize = function (config, onSuccess, onError) {
            var _this = this;
            if (onError == null) {
                onError = function (e) { throw e; };
            }
            try {
                this.validateConfig(config);
            }
            catch (error) {
                onError(error);
                return;
            }
            if (this.isKeycloakLoaded) {
                this.initKeycloak(config, function (app) { return onSuccess(app); }, function (err) { return onError(err); });
            }
            else {
                var script = document.createElement('script');
                script.onload = function () {
                    _this.initKeycloak(config, function (app) {
                        _this.isKeycloakLoaded = true;
                        onSuccess(app);
                    }, function (err) { return onError(err); });
                };
                script.onerror = function (error) {
                    onError(error);
                };
                script.src = this.getKeycloakScriptUrl();
                document.head.appendChild(script);
            }
        };
        App.getKeycloakAuthUrl = function () {
            return MyJoinData.Environment.keycloakAuthUrl;
        };
        App.getKeycloakScriptUrl = function () {
            return MyJoinData.Environment.keycloakScriptUrl;
        };
        App.getRealm = function () {
            return 'datahub';
        };
        App.initKeycloak = function (config, onSuccess, onError) {
            var app = new App();
            window.addEventListener('message', function (msg) { return app.interceptMessage(msg); });
            app.onboardingUrl = this.getOnboardingUrl(config.desktop);
            app.clientId = config.clientId;
            app.participationId = config.participationId;
            app.purposeId = config.purposeId;
            app.keycloak = new Keycloak({
                clientId: config.clientId,
                realm: this.getRealm(),
                url: this.getKeycloakAuthUrl()
            });
            var initOptions = {
                onLoad: 'check-sso',
                flow: config.flow || 'implicit'
            };
            app.http = new HttpClient(app.keycloak, this.getApiUrl());
            app.keycloak.init(initOptions).then(function (authenticated) {
                app.token = app.keycloak.idToken;
                if (app.isLoggedIn !== authenticated) {
                    app.isLoggedIn = authenticated;
                    if (authenticated) {
                        var parsedToken = app.keycloak.tokenParsed || {};
                        app.applicationCompany = {
                            scheme: parsedToken['application_company_key_scheme'],
                            value: parsedToken['application_company_key_value']
                        };
                        app.userCompany = {
                            scheme: parsedToken['company_key_scheme'],
                            value: parsedToken['company_key_value']
                        };
                        app.initializeAutoReload(onSuccess);
                    }
                }
                onSuccess(app);
            }).catch(function (err) { return onError(err); });
        };
        App.getApiUrl = function () {
            return MyJoinData.Environment.apiUrl;
        };
        App.getOnboardingUrl = function (desktop) {
            if (desktop) {
                return MyJoinData.Environment.onboardingUrl + '/desktop';
            }
            return MyJoinData.Environment.onboardingUrl;
        };
        App.validateConfig = function (config) {
            if (!config) {
                throw new Error('config is required.');
            }
            if (!config.clientId) {
                throw new Error('config.clientId is required.');
            }
            if (!config.participationId && !config.purposeId) {
                throw new Error('Please supply either a purpose id or a participation id.');
            }
            if (config.participationId && config.purposeId) {
                throw new Error('Please supply either a purpose id or a participation id, but not both.');
            }
        };
        App.prototype.interceptMessage = function (message) {
            if (!message.origin) {
                return;
            }
            if (this.onboardingUrl.toUpperCase().indexOf(message.origin.toUpperCase()) !== 0) {
                return;
            }
            if (this.messageCallbacks.length === 0) {
                return;
            }
            if (message.data && message.data.signature === '99afb3fc-6e8a-4000-84a9-7a19cda75129') {
                this.messageCallbacks.forEach(function (cb) {
                    cb(message.data);
                });
            }
        };
        App.prototype.destroyOnboardingComponent = function () {
            if (this.onboardingComponent) {
                var comp = this.onboardingComponent;
                this.onboardingComponent = null;
                try {
                    comp.remove();
                }
                catch (error) {
                }
            }
        };
        App.prototype.login = function () {
            this.keycloak.login({
                prompt: 'login'
            });
        };
        App.prototype.logout = function () {
            this.destroyOnboardingComponent();
            this.keycloak.logout();
        };
        App.prototype.getParticipation = function () {
            var _this = this;
            var url;
            if (this.participationId) {
                url = "onboarding/participations/".concat(this.participationId);
            }
            else {
                url = "onboarding/purposes/".concat(this.purposeId, "/user-participation");
            }
            return new PromiseLike(function (resolve, reject) {
                _this.http.get(url).then(function (data) {
                    if (data.errors && data.errors.length) {
                        reject(data.errors);
                    }
                    else {
                        if (data.data && data.data.id) {
                            _this.participationId = data.data.id;
                        }
                        resolve(data.data);
                    }
                }).catch(function (error) {
                    reject(error);
                });
            });
        };
        App.prototype.createParticipation = function (providingCompanies) {
            var _this = this;
            var url = "purposes/".concat(this.purposeId, "/participations");
            var participation = {
                company: this.userCompany,
                providingCompanies: providingCompanies
            };
            var participationsPostModel = { participations: [participation] };
            return new PromiseLike(function (resolve, reject) {
                _this.http.post(url, participationsPostModel).then(function (data) {
                    if (data.errors && data.errors.length) {
                        reject(data.errors);
                    }
                    else {
                        if (data.data && data.data.length > 0) {
                            _this.participationId = data.data[0].id;
                            _this.getParticipation().then(function (par) { return resolve(par); }).catch(function (err) { return reject(err); });
                        }
                        else {
                            reject('Unable to create a participation.');
                        }
                    }
                }).catch(function (err) { return reject(err); });
            });
        };
        App.prototype.createOnboardingComponent = function () {
            this.destroyOnboardingComponent();
            var iframe = document.createElement('iframe');
            iframe.src = "".concat(this.onboardingUrl, "?participation=").concat(this.participationId, "&client-id=").concat(this.clientId);
            this.onboardingComponent = iframe;
            return iframe;
        };
        App.prototype.onReceiveResponse = function (callback) {
            if (callback) {
                this.messageCallbacks.push(callback);
            }
        };
        App.prototype.initializeAutoReload = function (callback) {
            var _this = this;
            window.clearTimeout(this.reloadTimeout);
            this.reloadTimeout = window.setTimeout(function () {
                if (_this.isLoggedIn !== _this.keycloak.authenticated) {
                    _this.isLoggedIn = _this.keycloak.authenticated;
                    callback(_this);
                }
                _this.initializeAutoReload(callback);
            }, 2500);
        };
        App.isKeycloakLoaded = false;
        return App;
    }());
    MyJoinData.App = App;
})(MyJoinData || (MyJoinData = {}));