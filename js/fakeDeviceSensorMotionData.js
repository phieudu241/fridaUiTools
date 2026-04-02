Java.perform(function () {
    // --- Motion sensor self-test ---
    // Register a one-shot listener for every faked sensor type.
    // The pump (or real hw) should call onSensorChanged within ~4 s.
    // We schedule a follow-up check 4 s later and report PASS/FAIL/SKIP.
    Java.scheduleOnMainThread(function () {
        try {
            const ctx2 = Java.use("android.app.ActivityThread")
                             .currentApplication()
                             .getApplicationContext();
            const SENSOR_SERVICE2 = Java.use("android.content.Context").SENSOR_SERVICE.value;
            const sm2 = Java.cast(
                ctx2.getSystemService(SENSOR_SERVICE2),
                Java.use("android.hardware.SensorManager")
            );

            // Results map: sensorType -> { name, received, values }
            const motionTestResults = {};
            const MOTION_TEST_TYPES = [
                [1,  "ACCELEROMETER"],
                [4,  "GYROSCOPE"],
                [2,  "MAGNETIC_FIELD"],
                [9,  "GRAVITY"],
                [10, "LINEAR_ACCELERATION"],
                [11, "ROTATION_VECTOR"]
            ];

            MOTION_TEST_TYPES.forEach(function ([type, name]) {
                motionTestResults[type] = { name: name, received: false, values: null };
            });

            const SensorEventListenerTest = Java.use("android.hardware.SensorEventListener");

            MOTION_TEST_TYPES.forEach(function ([type, name]) {
                try {
                    // Check sensor availability (do NOT call registerListener —
                    // we inject directly into listenerRegistry so the pump drives us,
                    // avoiding the hooked path which loses the sensor-type context)
                    const testSensor = sm2.getDefaultSensor(type);
                    if (!testSensor) {
                        console.log(`[MOTION-TEST] SKIP ${name} (type=${type}): sensor not available`);
                        return;
                    }

                    // Capture sensorType in closure so onSensorChanged knows what it is
                    const expectedType = type;

                    const listenerClass = Java.registerClass({
                        name: "com.fake.MotionTestListener_" + type + "_" + Math.floor(Math.random() * 0x7fffffff),
                        implements: [SensorEventListenerTest],
                        methods: {
                            onSensorChanged: function (event) {
                                // Use closure-captured expectedType — do NOT read from
                                // event.sensor (may be disposed or null in pump path)
                                try {
                                    if (motionTestResults[expectedType] &&
                                        !motionTestResults[expectedType].received) {

                                        motionTestResults[expectedType].received = true;

                                        // Read float values synchronously via cached global field
                                        const arr = [];
                                        try {
                                            const vField = globalThis.__evtValuesField__ || (function() {
                                                try {
                                                    const f = Java.use("android.hardware.SensorEvent")
                                                                 .class.value.getField("values");
                                                    f.setAccessible(true);
                                                    return f;
                                                } catch(_) { return null; }
                                            })();
                                            if (vField) {
                                                const raw = vField.get(event);
                                                // raw is a Java float[]; elements are JS numbers via Frida
                                                for (let i = 0; i < raw.length; i++) {
                                                    arr.push(Number(raw[i]));
                                                }
                                            }
                                        } catch (_) {}
                                        motionTestResults[expectedType].values =
                                            arr.length > 0 ? arr : null;
                                    }
                                } catch (e) {}
                            },
                            onAccuracyChanged: function (sensor, accuracy) {}
                        }
                    });

                    const inst = listenerClass.$new();

                    // *** KEY FIX: inject directly into listenerRegistry so the
                    // emulator pump drives this listener without going through the
                    // hooked registerListener (which wraps it and loses type context).
                    // listenerRegistry is declared in the outer motion-hooks closure;
                    // we access it via the shared __motionRegistry__ on globalThis.
                    if (typeof __motionRegistry__ !== 'undefined' && __motionRegistry__) {
                        __motionRegistry__.push({ listener: inst, sensorType: type });
                        console.log(`[MOTION-TEST] Injected into pump registry: ${name} (type=${type})`);
                    } else {
                        // Fallback: use real registerListener (works on real devices)
                        sm2.registerListener(inst, testSensor, 3);
                        console.log(`[MOTION-TEST] Registered via SensorManager: ${name} (type=${type})`);
                    }
                } catch (e) {
                    console.log(`[MOTION-TEST] WARN register ${name}: ` + e.message);
                }
            });

            // After 8 s, report results.
            // Timeline: templates arrive ~200 ms after capture registration,
            // pump first tick fires at t=3 s, so by t=8 s we have ~5 pump ticks.
            const TimerCheck     = Java.use("java.util.Timer");
            const TimerTaskCheck = Java.use("java.util.TimerTask");
            const reportTask = Java.registerClass({
                name: "com.fake.MotionTestReport_" + Math.floor(Math.random() * 0x7fffffff),
                superClass: TimerTaskCheck,
                methods: {
                    run: function () {
                        Java.perform(function () {
                            console.log("\n========== MOTION SELF-TEST ==========");
                            MOTION_TEST_TYPES.forEach(function ([type, name]) {
                                const r = motionTestResults[type];
                                if (!r) return;
                                if (r.received && r.values && r.values.length > 0) {
                                    const vStr = r.values.map(function(v) {
                                        return (typeof v === 'number' ? v.toFixed(4) : v);
                                    }).join(", ");
                                    console.log(`[MOTION] PASS ${name} (type=${type}): [${vStr}]`);
                                } else if (r.received) {
                                    console.log(`[MOTION] PASS ${name} (type=${type}): event received (values unreadable)`);
                                } else {
                                    console.log(`[MOTION] FAIL ${name} (type=${type}): no event received within 8 s`);
                                }
                            });
                            console.log("========== END MOTION TEST ==========\n");
                        });
                    }
                }
            });

            const checkTimer = TimerCheck.$new(true /* daemon */);
            checkTimer.schedule(reportTask.$new(), 8000);
            console.log("[MOTION-TEST] Listeners injected — results in ~8 s");
        } catch (e) {
            console.log("[MOTION-TEST] WARN setup failed: " + e.message);
        }
    });

});


// =======================
// MOTION SENSOR HOOKS  (emulator-safe)
// =======================
// On real devices: sensor events fire naturally; we intercept them via
//   registerListener wrapping and patch the values in onSensorChanged.
// On emulators: hardware sensors may not exist / never fire, so we ALSO
//   run a periodic Timer (100 ms) that constructs fake SensorEvents via
//   reflection and dispatches them directly to every registered listener.
// Both paths share the same fake-value generator.

// ---- Gaussian noise helper (Box-Muller) ----
function gaussianNoise(stddev) {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * stddev;
}

// ---- Fake baseline chosen ONCE at startup ----
const motionBase = {
    // Accelerometer (m/s²): phone lying flat, ~1g on Z
    accel:   { x:  0.04 + gaussianNoise(0.02),
               y: -0.12 + gaussianNoise(0.02),
               z:  9.78 + gaussianNoise(0.05) },
    // Gyroscope (rad/s): near-zero when still
    gyro:    { x: gaussianNoise(0.003),
               y: gaussianNoise(0.003),
               z: gaussianNoise(0.003) },
    // Magnetic field (µT): mid-latitude typical
    mag:     { x:  22.4 + gaussianNoise(0.5),
               y: -13.7 + gaussianNoise(0.5),
               z: -40.1 + gaussianNoise(0.5) },
    // Gravity (m/s²)
    gravity: { x:  0.04, y: -0.12, z:  9.78 },
    // Linear acceleration (≈0 when still)
    linear:  { x: gaussianNoise(0.01),
               y: gaussianNoise(0.01),
               z: gaussianNoise(0.01) },
    // Rotation vector quaternion (flat phone ≈ [0,0,0,1])
    rotvec:  { x: gaussianNoise(0.002),
               y: gaussianNoise(0.002),
               z: gaussianNoise(0.002),
               w: 1.0 }
};
console.log("[MOTION] Baseline:", JSON.stringify(motionBase));

// ---- Per-sensor-type fake value generator ----
const TYPE_ACCELEROMETER       = 1;
const TYPE_MAGNETIC_FIELD      = 2;
const TYPE_GYROSCOPE           = 4;
const TYPE_GRAVITY             = 9;
const TYPE_LINEAR_ACCELERATION = 10;
const TYPE_ROTATION_VECTOR     = 11;

function fakeValuesForType(sensorType) {
    switch (sensorType) {
        case TYPE_ACCELEROMETER:
            return [motionBase.accel.x + gaussianNoise(0.015),
                    motionBase.accel.y + gaussianNoise(0.015),
                    motionBase.accel.z + gaussianNoise(0.025)];
        case TYPE_GYROSCOPE:
            return [motionBase.gyro.x + gaussianNoise(0.002),
                    motionBase.gyro.y + gaussianNoise(0.002),
                    motionBase.gyro.z + gaussianNoise(0.002)];
        case TYPE_MAGNETIC_FIELD:
            return [motionBase.mag.x + gaussianNoise(0.3),
                    motionBase.mag.y + gaussianNoise(0.3),
                    motionBase.mag.z + gaussianNoise(0.3)];
        case TYPE_GRAVITY:
            return [motionBase.gravity.x + gaussianNoise(0.008),
                    motionBase.gravity.y + gaussianNoise(0.008),
                    motionBase.gravity.z + gaussianNoise(0.015)];
        case TYPE_LINEAR_ACCELERATION:
            return [motionBase.linear.x + gaussianNoise(0.008),
                    motionBase.linear.y + gaussianNoise(0.008),
                    motionBase.linear.z + gaussianNoise(0.008)];
        case TYPE_ROTATION_VECTOR:
            return [motionBase.rotvec.x + gaussianNoise(0.001),
                    motionBase.rotvec.y + gaussianNoise(0.001),
                    motionBase.rotvec.z + gaussianNoise(0.001),
                    motionBase.rotvec.w];
        default:
            return null;
    }
}

const FAKED_SENSOR_TYPES = [
    TYPE_ACCELEROMETER, TYPE_GYROSCOPE, TYPE_MAGNETIC_FIELD,
    TYPE_GRAVITY, TYPE_LINEAR_ACCELERATION, TYPE_ROTATION_VECTOR
];

try {
    const SensorManagerClass       = Java.use("android.hardware.SensorManager");
    const SensorEventListenerIface = Java.use("android.hardware.SensorEventListener");
    const SensorEventClass         = Java.use("android.hardware.SensorEvent");
    const FloatArrayClass          = Java.use("[F");       // float[]
    const JavaLangClass            = Java.use("java.lang.Class");

    // ---- Listener registry ----
    const listenerRegistry = [];   // [ { listener: <java obj>, sensorType: int }, ... ]
    // Expose on globalThis so the self-test block (scheduled earlier) can inject
    // test listeners directly without going through the hooked registerListener.
    globalThis.__motionRegistry__ = listenerRegistry;

    // ---- Cache SensorEvent reflection fields once (avoids repeated lookups) ----
    const _evtClass = SensorEventClass.class.value;
    const _evtSensorField = (function() {
        try { const f = _evtClass.getField("sensor");    f.setAccessible(true); return f; } catch(_){ return null; }
    })();
    const _evtValuesField = (function() {
        try { const f = _evtClass.getField("values");    f.setAccessible(true); return f; } catch(_){ return null; }
    })();
    const _evtTsField = (function() {
        try { const f = _evtClass.getField("timestamp"); f.setAccessible(true); return f; } catch(_){ return null; }
    })();
    const _evtCtor = (function() {
        try {
            const intClass = Java.use("java.lang.Integer").class.value.getField("TYPE").get(null);
            const c = _evtClass.getDeclaredConstructor([intClass]);
            c.setAccessible(true);
            return c;
        } catch(_){ return null; }
    })();
    // Expose cached fields globally so self-test listeners (different scope) can use them
    globalThis.__evtValuesField__ = _evtValuesField;
    globalThis.__evtSensorField__ = _evtSensorField;

    // ---- Per-sensor: retain one real SensorEvent as a reusable template ----
    // Key insight: SensorEvent has no public constructor on Android 12+.
    // Instead we register our OWN internal listener with the OS to receive
    // one real event per sensor type, retain it, then reuse it as a template
    // (patching values each pump tick). This always works on emulators because
    // the emulator's virtual sensor driver DOES deliver events to our listener.
    const sensorTemplates = {};  // sensorType -> retained SensorEvent | null

    // ---- Build/get a fake SensorEvent for a given sensor type ----
    // Uses the retained template if available; falls back to reflection.
    function getFakeSensorEvent(sensorType, vals) {
        const tmpl = sensorTemplates[sensorType];
        if (tmpl) {
            // Patch values in-place on the retained template
            if (_evtValuesField) {
                try {
                    const arr = _evtValuesField.get(tmpl);
                    for (let i = 0; i < vals.length && i < arr.length; i++) arr[i] = vals[i];
                } catch(_) {}
            }
            if (_evtTsField) {
                try { _evtTsField.set(tmpl, Java.use("java.lang.System").nanoTime()); } catch(_) {}
            }
            return tmpl;   // NOT retained again — caller must not dispose it
        }
        // No template yet — try reflection path as last resort
        if (!_evtCtor) return null;
        try {
            const rawSensor = sensorManagerInstance_
                ? sensorManagerInstance_.getDefaultSensor(sensorType) : null;
            if (!rawSensor) return null;
            const evt = Java.cast(
                _evtCtor.newInstance([Java.array('int', [vals.length])]),
                SensorEventClass
            );
            if (_evtSensorField) try { _evtSensorField.set(evt, rawSensor); } catch(_) {}
            if (_evtValuesField) {
                try {
                    const arr = _evtValuesField.get(evt);
                    for (let i = 0; i < vals.length; i++) arr[i] = vals[i];
                } catch(_) {}
            }
            if (_evtTsField) {
                try { _evtTsField.set(evt, Java.use("java.lang.System").nanoTime()); } catch(_) {}
            }
            return evt;
        } catch(e) {
            return null;
        }
    }

    // Keep a reference to the SensorManager for use in getFakeSensorEvent
    let sensorManagerInstance_ = null;

    // ---- Dispatch fake events to all registered listeners (emulator pump) ----
    function pumpFakeEvents() {
        Java.perform(function () {
            for (let i = 0; i < listenerRegistry.length; i++) {
                const entry = listenerRegistry[i];
                try {
                    const vals = fakeValuesForType(entry.sensorType);
                    if (!vals) continue;
                    const evt = getFakeSensorEvent(entry.sensorType, vals);
                    if (!evt) {
                        console.log(`[MOTION] PUMP WARN type=${entry.sensorType}: no template event yet`);
                        continue;
                    }
                    entry.listener.onSensorChanged(evt);
//                        console.log(`[MOTION] PUMP type=${entry.sensorType} -> [${vals.map(v => v.toFixed(4)).join(", ")}]`);
                } catch (e) {
                    console.log(`[MOTION] PUMP ERR type=${entry.sensorType}: ${e.message}`);
                }
            }
        });
    }

    // ---- Register internal OS listeners to capture real SensorEvent templates ----
    // These run forever and keep the OS sensor pipeline alive.
    function registerTemplateCaptureListeners(sm) {
        sensorManagerInstance_ = sm;
        const SensorEventListenerCapture = Java.use("android.hardware.SensorEventListener");

        FAKED_SENSOR_TYPES.forEach(function(sensorType) {
            try {
                const sensor = sm.getDefaultSensor(sensorType);
                if (!sensor) {
                    console.log(`[MOTION] no sensor type=${sensorType} on this device`);
                    return;
                }

                const captureClass = Java.registerClass({
                    name: "com.fake.MotionCapture_" + sensorType + "_" + Math.floor(Math.random() * 0x7fffffff),
                    implements: [SensorEventListenerCapture],
                    methods: {
                        onSensorChanged: function (event) {
                            // Capture the FIRST real event as a retained template
                            if (!sensorTemplates[sensorType]) {
                                sensorTemplates[sensorType] = Java.retain(event);
                                console.log(`[MOTION] Captured template for type=${sensorType}`);
                            }
                            // Also patch values immediately (real-device path)
                            try {
                                const vals = fakeValuesForType(sensorType);
                                if (vals && _evtValuesField) {
                                    const arr = _evtValuesField.get(event);
                                    for (let i = 0; i < vals.length && i < arr.length; i++) arr[i] = vals[i];
                                }
                            } catch(_) {}
                        },
                        onAccuracyChanged: function (sensor, accuracy) {}
                    }
                });

                const captureInst = captureClass.$new();
                captureInst.__captureListener__ = true;   // bypass hook flag
                // Use SENSOR_DELAY_NORMAL (3) — FASTEST (0) requires
                // HIGH_SAMPLING_RATE_SENSORS permission.
                sm.registerListener(captureInst, sensor, 3);
                console.log(`[MOTION] Template capture listener registered type=${sensorType}`);
            } catch(e) {
                console.log(`[MOTION] WARN template capture type=${sensorType}: ${e.message}`);
            }
        });
    }

    // ---- Wrap a listener: intercept real onSensorChanged AND register for pump ----
    function wrapAndRegister(rawListener, sensorType) {
        if (!rawListener) return rawListener;
        if (rawListener.__motionWrapped__) {
            // Already wrapped; just make sure it's in the registry for this type
            for (let i = 0; i < listenerRegistry.length; i++) {
                if (listenerRegistry[i].listener === rawListener &&
                    listenerRegistry[i].sensorType === sensorType) return rawListener;
            }
            listenerRegistry.push({ listener: rawListener, sensorType: sensorType });
            return rawListener;
        }

        // Java.retain() the raw listener so it stays valid beyond the hook call
        // that handed it to us (hook parameters are borrowed wrappers by default).
        const retainedListener = Java.retain(rawListener);

        const evtClass = SensorEventClass.class.value;
        const sensorField  = (function() { try { const f = evtClass.getField("sensor");  f.setAccessible(true); return f; } catch(_){ return null; } })();
        const valuesField  = (function() { try { const f = evtClass.getField("values");  f.setAccessible(true); return f; } catch(_){ return null; } })();

        const wrapped = Java.registerClass({
            name: "com.fake.MotionWrapper_" + Math.floor(Math.random() * 0x7fffffff),
            implements: [SensorEventListenerIface],
            methods: {
                onSensorChanged: function (event) {
                    // All access to `event` must happen SYNCHRONOUSLY here —
                    // it is a borrowed wrapper and becomes invalid after this
                    // function returns. Never store it or use it in a callback.
                    try {
                        // Read sensor type via reflection (avoids event.sensor.value
                        // sub-wrapper disposal issues on some Frida versions)
                        let type = -1;
                        if (sensorField) {
                            try {
                                const sensorObj = sensorField.get(event);
                                type = sensorObj.getType();
                            } catch(_) {}
                        }
                        if (type === -1) {
                            try { type = event.sensor.value.getType(); } catch(_) {}
                        }

                        const vals = fakeValuesForType(type);
                        if (vals && valuesField) {
                            const arr = valuesField.get(event);
                            for (let i = 0; i < vals.length && i < arr.length; i++) arr[i] = vals[i];
                            console.log(`[MOTION] REAL type=${type} -> [${vals.map(v => v.toFixed(4)).join(", ")}]`);
                        }
                    } catch (e) {}
                    retainedListener.onSensorChanged(event);
                },
                onAccuracyChanged: function (sensor, accuracy) {
                    retainedListener.onAccuracyChanged(sensor, accuracy);
                }
            }
        });

        const inst = wrapped.$new();
        inst.__motionWrapped__ = true;
        // Register for emulator pump; inst is our own object — always valid.
        listenerRegistry.push({ listener: inst, sensorType: sensorType });
        return inst;
    }

    // ---- Hook registerListener (3 overloads) ----
    // We keep a reference to each overload BEFORE setting .implementation so
    // we can call overload.call(this, ...) inside the hook — Frida invokes the
    // previously set implementation (initially the real Java native method).
    const _rl3 = SensorManagerClass.registerListener
        .overload('android.hardware.SensorEventListener','android.hardware.Sensor','int');
    const _rl4 = SensorManagerClass.registerListener
        .overload('android.hardware.SensorEventListener','android.hardware.Sensor','int','int');

    _rl3.implementation = function (listener, sensor, rate) {
        // Bypass for our internal capture listeners — call native directly
        if (listener && listener.__captureListener__) {
            return _rl3.call(this, listener, sensor, rate);
        }
        const type = sensor ? sensor.getType() : -1;
        console.log(`[MOTION] registerListener type=${type} rate=${rate}`);
        if (FAKED_SENSOR_TYPES.indexOf(type) !== -1) {
            return _rl3.call(this, wrapAndRegister(listener, type), sensor, rate);
        }
        return _rl3.call(this, listener, sensor, rate);
    };

    _rl4.implementation = function (listener, sensor, rate, maxLatency) {
        const type = sensor ? sensor.getType() : -1;
        console.log(`[MOTION] registerListener type=${type} rate=${rate} maxLatency=${maxLatency}`);
        if (FAKED_SENSOR_TYPES.indexOf(type) !== -1) {
            return _rl4.call(this, wrapAndRegister(listener, type), sensor, rate, maxLatency);
        }
        return _rl4.call(this, listener, sensor, rate, maxLatency);
    };

    try {
        const _rlH = SensorManagerClass.registerListener
            .overload('android.hardware.SensorEventListener','android.hardware.Sensor','int','android.os.Handler');
        _rlH.implementation = function (listener, sensor, rate, handler) {
            const type = sensor ? sensor.getType() : -1;
            console.log(`[MOTION] registerListener(handler) type=${type} rate=${rate}`);
            if (FAKED_SENSOR_TYPES.indexOf(type) !== -1) {
                return _rlH.call(this, wrapAndRegister(listener, type), sensor, rate, handler);
            }
            return _rlH.call(this, listener, sensor, rate, handler);
        };
    } catch (_) {}

    // ---- Emulator pump: start a periodic Timer after app is ready ----
    const PUMP_INTERVAL_MS = 1000;

    Java.scheduleOnMainThread(function () {
        try {
            const ctx = Java.use("android.app.ActivityThread")
                            .currentApplication()
                            .getApplicationContext();
            const SENSOR_SERVICE = Java.use("android.content.Context").SENSOR_SERVICE.value;
            const sm = Java.cast(
                ctx.getSystemService(SENSOR_SERVICE),
                SensorManagerClass
            );

            // Check if any target sensors exist at all
            let anySensor = false;
            for (let i = 0; i < FAKED_SENSOR_TYPES.length; i++) {
                if (sm.getDefaultSensor(FAKED_SENSOR_TYPES[i]) !== null) {
                    anySensor = true; break;
                }
            }
            if (!anySensor) {
                console.log("[MOTION] No target sensors found — pump disabled");
                return;
            }

            // Step 1: Register internal capture listeners to get real SensorEvent
            // templates from the OS (needed because SensorEvent has no public
            // constructor on Android 12+). SENSOR_DELAY_FASTEST delivers the
            // first event within ~50 ms on both real devices and emulators.
            registerTemplateCaptureListeners(sm);

            // Step 2: Start the pump after a 3 s delay so templates are ready.
            // SENSOR_DELAY_NORMAL can take ~200 ms for first delivery; 3 s is safe.
            const TimerClass     = Java.use("java.util.Timer");
            const TimerTaskClass = Java.use("java.util.TimerTask");

            const timerTask = Java.registerClass({
                name: "com.fake.MotionPumpTask_" + Math.floor(Math.random() * 0x7fffffff),
                superClass: TimerTaskClass,
                methods: {
                    run: function () {
                        if (listenerRegistry.length === 0) return;
                        pumpFakeEvents();
                    }
                }
            });

            const timer = TimerClass.$new(true /* daemon */);
            // Start after 3000 ms (templates captured by then), repeat every PUMP_INTERVAL_MS
            timer.scheduleAtFixedRate(timerTask.$new(), 3000, PUMP_INTERVAL_MS);
            console.log("[MOTION] Emulator pump started @ " + PUMP_INTERVAL_MS + " ms interval (first tick in 3 s)");
        } catch (e) {
            console.log("[MOTION] WARN pump init failed: " + e.message);
        }
    });

    console.log("[MOTION] Hooks installed (real-device + emulator-pump mode)");
} catch (e) {
    console.log("[MOTION] WARN sensor hook failed: " + e.message);
}