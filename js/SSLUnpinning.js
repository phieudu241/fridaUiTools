/**
 * SSLUnpinning.js
 *
 * Comprehensive SSL unpinning for Android targeting:
 *   1. okhttp3.CertificatePinner  — used directly by PX SDK (*.perimeterx.net)
 *   2. OkHttpClient.Builder       — strip certificatePinner at build time
 *   3. X509TrustManager           — custom TrustManagers that reject unknown CAs
 *   4. SSLContext                 — replaces trust-all TrustManager
 *   5. HostnameVerifier           — always returns true
 *   6. HttpsURLConnection         — fallback for java.net stack
 *   7. WebViewClient              — onReceivedSslError bypass
 *   8. Network Security Config    — ApplicationInfo flag bypass
 */

Java.perform(function () {

    // ──────────────────────────────────────────────
    // 1. okhttp3.CertificatePinner — PX SDK specific
    //    check(String, List) throws on pin mismatch → make it a no-op
    // ──────────────────────────────────────────────
    try {
        const CertificatePinner = Java.use("okhttp3.CertificatePinner");

        // check(String hostname, List<Certificate> peerCertificates)
        CertificatePinner.check.overload("java.lang.String", "java.util.List")
            .implementation = function (hostname, certs) {
                console.log(`[SSL] CertificatePinner.check("${hostname}") -> bypassed`);
            };

        // check(String hostname, Certificate... certificates) — older OkHttp overload
        try {
            CertificatePinner.check.overload("java.lang.String", "[Ljava.security.cert.Certificate;")
                .implementation = function (hostname, certs) {
                    console.log(`[SSL] CertificatePinner.check(vararg)("${hostname}") -> bypassed`);
                };
        } catch (e1) { /* overload may not exist */ }

        console.log("[SSL] CertificatePinner.check hooked");
    } catch (e) {
        console.log("[SSL] WARN CertificatePinner.check hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 2. CertificatePinner.Builder.add() — prevent pins being registered
    //    Return 'this' to keep the builder chain intact but add no pins
    // ──────────────────────────────────────────────
    try {
        const CPBuilder = Java.use("okhttp3.CertificatePinner$Builder");

        CPBuilder.add.overload("java.lang.String", "[Ljava.lang.String;")
            .implementation = function (pattern, pins) {
                console.log(`[SSL] CertificatePinner.Builder.add("${pattern}", ...) -> no-op`);
                return this; // return builder for chaining
            };

        try {
            CPBuilder.add.overload("java.lang.String", "java.lang.String")
                .implementation = function (pattern, pin) {
                    console.log(`[SSL] CertificatePinner.Builder.add("${pattern}", single) -> no-op`);
                    return this;
                };
        } catch (e1) { /* overload may not exist */ }

        console.log("[SSL] CertificatePinner.Builder.add hooked");
    } catch (e) {
        console.log("[SSL] WARN CertificatePinner.Builder.add hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 3. OkHttpClient.Builder.certificatePinner()
    //    Replace the provided pinner with an empty one
    // ──────────────────────────────────────────────
    try {
        const OkHttpBuilder  = Java.use("okhttp3.OkHttpClient$Builder");
        const CertPinner     = Java.use("okhttp3.CertificatePinner");
        const CPBuilder2     = Java.use("okhttp3.CertificatePinner$Builder");

        OkHttpBuilder.certificatePinner.implementation = function (pinner) {
            console.log("[SSL] OkHttpClient.Builder.certificatePinner() -> replaced with empty pinner");
            const emptyPinner = CPBuilder2.$new().build();
            return this.certificatePinner(emptyPinner);
        };

        console.log("[SSL] OkHttpClient.Builder.certificatePinner hooked");
    } catch (e) {
        console.log("[SSL] WARN OkHttpClient.Builder.certificatePinner hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 4. X509TrustManager — trust-all replacement
    //    Hook checkClientTrusted / checkServerTrusted / getAcceptedIssuers
    //    on all loaded implementations via Java.enumerateClassLoaders
    // ──────────────────────────────────────────────
    try {
        const X509TrustManager = Java.use("javax.net.ssl.X509TrustManager");
        const SSLContext       = Java.use("javax.net.ssl.SSLContext");
        const TrustManagerArr  = Java.array("Ljavax.net.ssl.TrustManager;",
            [Java.registerClass({
                name: "com.frida.hook.TrustAllManager",
                implements: [X509TrustManager],
                methods: {
                    checkClientTrusted: {
                        returnType: "void",
                        argumentTypes: ["[Ljava.security.cert.X509Certificate;", "java.lang.String"],
                        implementation: function () {}
                    },
                    checkServerTrusted: {
                        returnType: "void",
                        argumentTypes: ["[Ljava.security.cert.X509Certificate;", "java.lang.String"],
                        implementation: function () {}
                    },
                    getAcceptedIssuers: {
                        returnType: "[Ljava.security.cert.X509Certificate;",
                        argumentTypes: [],
                        implementation: function () {
                            return Java.array("Ljava.security.cert.X509Certificate;", []);
                        }
                    }
                }
            }).$new()]
        );

        // Hook SSLContext.init() to inject our trust-all manager
        SSLContext.init.implementation = function (keyManagers, trustManagers, secureRandom) {
            console.log("[SSL] SSLContext.init() -> injecting trust-all TrustManager");
            this.init(keyManagers, TrustManagerArr, secureRandom);
        };

        console.log("[SSL] SSLContext.init hooked with trust-all TrustManager");
    } catch (e) {
        console.log("[SSL] WARN SSLContext.init hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 5. HostnameVerifier — always return true
    // ──────────────────────────────────────────────
    try {
        const HostnameVerifier = Java.use("javax.net.ssl.HostnameVerifier");
        const HttpsURLConn     = Java.use("javax.net.ssl.HttpsURLConnection");

        // Hook the static default hostname verifier setter
        HttpsURLConn.setDefaultHostnameVerifier.implementation = function (verifier) {
            console.log("[SSL] HttpsURLConnection.setDefaultHostnameVerifier -> replaced with trust-all");
            const trustAllHV = Java.registerClass({
                name: "com.frida.hook.TrustAllHostnameVerifier",
                implements: [HostnameVerifier],
                methods: {
                    verify: {
                        returnType: "boolean",
                        argumentTypes: ["java.lang.String", "javax.net.ssl.SSLSession"],
                        implementation: function (hostname, session) {
                            return true;
                        }
                    }
                }
            });
            this.setDefaultHostnameVerifier(trustAllHV.$new());
        };

        console.log("[SSL] HttpsURLConnection.setDefaultHostnameVerifier hooked");
    } catch (e) {
        console.log("[SSL] WARN HostnameVerifier hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 6. HttpsURLConnection instance-level hostname verifier
    // ──────────────────────────────────────────────
    try {
        const HttpsURLConnImpl = Java.use("javax.net.ssl.HttpsURLConnection");
        const HostnameVerifier2 = Java.use("javax.net.ssl.HostnameVerifier");

        HttpsURLConnImpl.setHostnameVerifier.implementation = function (verifier) {
            console.log("[SSL] HttpsURLConnection.setHostnameVerifier -> replaced with trust-all");
            const trustAllHV2 = Java.registerClass({
                name: "com.frida.hook.TrustAllHostnameVerifier2",
                implements: [HostnameVerifier2],
                methods: {
                    verify: {
                        returnType: "boolean",
                        argumentTypes: ["java.lang.String", "javax.net.ssl.SSLSession"],
                        implementation: function () { return true; }
                    }
                }
            });
            this.setHostnameVerifier(trustAllHV2.$new());
        };

        console.log("[SSL] HttpsURLConnection.setHostnameVerifier hooked");
    } catch (e) {
        console.log("[SSL] WARN HttpsURLConnection.setHostnameVerifier hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 7. OkHttp3 — internal RealConnection / ConnectionSpec TLS check
    //    Hook okhttp3.internal.connection.RealConnection.connectTls if present
    // ──────────────────────────────────────────────
    try {
        const OkHttpClientBuilder2 = Java.use("okhttp3.OkHttpClient$Builder");

        // hostnameVerifier(HostnameVerifier) — replace with trust-all
        const HostnameVerifier3 = Java.use("javax.net.ssl.HostnameVerifier");
        const TrustAllHV3Class = Java.registerClass({
            name: "com.frida.hook.TrustAllHostnameVerifier3",
            implements: [HostnameVerifier3],
            methods: {
                verify: {
                    returnType: "boolean",
                    argumentTypes: ["java.lang.String", "javax.net.ssl.SSLSession"],
                    implementation: function () { return true; }
                }
            }
        });

        OkHttpClientBuilder2.hostnameVerifier.implementation = function (verifier) {
            console.log("[SSL] OkHttpClient.Builder.hostnameVerifier() -> replaced with trust-all");
            return this.hostnameVerifier(TrustAllHV3Class.$new());
        };

        console.log("[SSL] OkHttpClient.Builder.hostnameVerifier hooked");
    } catch (e) {
        console.log("[SSL] WARN OkHttpClient.Builder.hostnameVerifier hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 8. WebViewClient.onReceivedSslError — proceed instead of cancel
    // ──────────────────────────────────────────────
    try {
        const WebViewClient = Java.use("android.webkit.WebViewClient");

        WebViewClient.onReceivedSslError.implementation = function (webView, handler, error) {
            console.log("[SSL] WebViewClient.onReceivedSslError -> handler.proceed()");
            handler.proceed();
        };

        console.log("[SSL] WebViewClient.onReceivedSslError hooked");
    } catch (e) {
        console.log("[SSL] WARN WebViewClient.onReceivedSslError hook failed: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 9. TrustManagerImpl (Android internal) — checkTrustedRecursive
    //    Used by older Android versions for chain validation
    // ──────────────────────────────────────────────
    try {
        const TrustManagerImpl = Java.use("com.android.org.conscrypt.TrustManagerImpl");

        TrustManagerImpl.checkTrustedRecursive.implementation = function () {
            console.log("[SSL] TrustManagerImpl.checkTrustedRecursive -> bypassed");
            return Java.use("java.util.ArrayList").$new();
        };

        console.log("[SSL] TrustManagerImpl.checkTrustedRecursive hooked");
    } catch (e) {
        // Not present on all Android versions — expected
        console.log("[SSL] INFO TrustManagerImpl.checkTrustedRecursive not available: " + e.message);
    }

    // ──────────────────────────────────────────────
    // 10. Conscrypt / OpenSSLSocketImpl — verifyHostname
    // ──────────────────────────────────────────────
    try {
        const OpenSSLSocketImpl = Java.use("com.android.org.conscrypt.OpenSSLSocketImpl");

        OpenSSLSocketImpl.verifyCertificateChain.implementation = function (certRefs, authMethod) {
            console.log("[SSL] OpenSSLSocketImpl.verifyCertificateChain -> bypassed");
        };

        console.log("[SSL] OpenSSLSocketImpl.verifyCertificateChain hooked");
    } catch (e) {
        console.log("[SSL] INFO OpenSSLSocketImpl.verifyCertificateChain not available: " + e.message);
    }

    console.log("[SSL] SSL Unpinning script loaded ✓");
});

